import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { PrismaClient, SystemRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createTestUser, cleanupAllTestData } from './fixtures/database.fixture';
import { UserFactory } from './factories';
import * as bcrypt from 'bcryptjs';

// ============================================================
// Users Module E2E Tests
// ============================================================
// Tests role-based access control for the Users module:
// - Self-update: authenticated user updates own profile
// - Admin user listing: admin GET /users with pagination
// - Admin status change: admin changes user status (ACTIVE -> BLOCKED)
// - Super-admin deletion: super-admin deletes a user
// - Unauthorized access: regular user trying admin endpoints returns 403
// - Non-authenticated requests return 401
// ============================================================

describe('Users Module (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  // Test user references
  let customerUser: { id: string; email: string | null; name: string };
  let adminUser: { id: string; email: string | null; name: string };
  let superAdminUser: { id: string; email: string | null; name: string };

  // Auth tokens
  let customerToken: string;
  let adminToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaClient);
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await cleanupAllTestData(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupAllTestData(prisma);

    // Create test users with password hashes for auth flow
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    customerUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
      email: `customer-${Date.now()}@e2e.com`,
      name: 'E2E Customer User',
      passwordHash,
    });

    adminUser = await createTestUser(prisma, SystemRole.ADMIN, {
      email: `admin-${Date.now()}@e2e.com`,
      name: 'E2E Admin User',
      passwordHash,
    });

    superAdminUser = await createTestUser(prisma, SystemRole.SUPER_ADMIN, {
      email: `superadmin-${Date.now()}@e2e.com`,
      name: 'E2E Super Admin User',
      passwordHash,
    });

    // Generate JWT tokens for each user type
    customerToken = generateTestToken(customerUser.id, customerUser.email!, 'CUSTOMER');
    adminToken = generateTestToken(adminUser.id, adminUser.email!, 'ADMIN');
    superAdminToken = generateTestToken(superAdminUser.id, superAdminUser.email!, 'SUPER_ADMIN');
  });

  // ============================================================
  // Helpers
  // ============================================================

  /** Generate a JWT token for a test user */
  function generateTestToken(userId: string, email: string | null, role: string): string {
    return jwtService.sign(
      { sub: userId, email: email ?? '', role, name: 'Test User' },
      { secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests-only' },
    );
  }

  /** Create an authenticated supertest request with Bearer token */
  function authenticatedRequest(token: string) {
    return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
  }

  // ============================================================
  // 1. Non-authenticated requests return 401
  // ============================================================

  describe('Authentication Required', () => {
    it('should return 401 when PATCH /users/:id is called without token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${customerUser.id}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when GET /users is called without token', async () => {
      const response = await request(app.getHttpServer()).get('/users');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when DELETE /users/:id is called without token', async () => {
      const response = await request(app.getHttpServer()).delete(`/users/${customerUser.id}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when GET /users/:id is called without token', async () => {
      const response = await request(app.getHttpServer()).get(`/users/${customerUser.id}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when POST /users is called without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(UserFactory.create({ email: 'new-user@test.com' }));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================================
  // 2. Self-update: authenticated user updates own profile
  // ============================================================

  describe('Self-Update Profile', () => {
    it('should allow a customer to update their own profile', async () => {
      const updatePayload = {
        name: 'Updated Customer Name',
        phone: '+15559998888',
      };

      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${customerUser.id}`)
        .send(updatePayload);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.id).toBe(customerUser.id);
      expect(response.body.name).toBe(updatePayload.name);
      expect(response.body.phone).toBe(updatePayload.phone);
      // Should retain original values for unchanged fields
      expect(response.body.email).toBe(customerUser.email);
      expect(response.body.role).toBe(SystemRole.CUSTOMER);
      expect(response.body.status).toBe(UserStatus.ACTIVE);

      // Verify persistence in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: customerUser.id },
      });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.name).toBe(updatePayload.name);
      expect(updatedUser!.phone).toBe(updatePayload.phone);
    });

    it('should allow updating only the name field', async () => {
      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${customerUser.id}`)
        .send({ name: 'New Name Only' });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.name).toBe('New Name Only');
    });

    it('should allow updating only the email field', async () => {
      const newEmail = `updated-${Date.now()}@e2e.com`;
      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${customerUser.id}`)
        .send({ email: newEmail });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.email).toBe(newEmail);
    });

    it('should return 409 when updating to an email that already exists', async () => {
      // Try to update customer's email to admin's email
      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${customerUser.id}`)
        .send({ email: adminUser.email });

      expect(response.status).toBe(HttpStatus.CONFLICT);
    });

    it('should return 404 when updating a non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${nonExistentId}`)
        .send({ name: 'Should Fail' });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return 400 when sending invalid email format', async () => {
      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${customerUser.id}`)
        .send({ email: 'not-a-valid-email' });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================
  // 3. Admin user listing: admin GET /users with pagination
  // ============================================================

  describe('Admin User Listing', () => {
    it('should allow admin to GET /users with default pagination', async () => {
      // Create additional users for pagination test
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser(prisma, SystemRole.CUSTOMER, {
            email: `pagination-user-${i}-${Date.now()}@e2e.com`,
            name: `Pagination User ${i}`,
          }),
        ),
      );

      const response = await authenticatedRequest(adminToken).get('/users');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should include all created users + admin + superAdmin + customer
      expect(response.body.total).toBeGreaterThanOrEqual(8);
    });

    it('should respect custom page and pageSize parameters', async () => {
      // Create 15 users for pagination
      await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          createTestUser(prisma, SystemRole.CUSTOMER, {
            email: `page-user-${i}-${Date.now()}@e2e.com`,
            name: `Page User ${i}`,
          }),
        ),
      );

      const response = await authenticatedRequest(adminToken)
        .get('/users')
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(4);
    });

    it('should return empty data array when page exceeds total', async () => {
      const response = await authenticatedRequest(adminToken)
        .get('/users')
        .query({ page: 999, pageSize: 10 });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should return users ordered by createdAt desc', async () => {
      const response = await authenticatedRequest(adminToken)
        .get('/users')
        .query({ page: 1, pageSize: 1 });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data.length).toBe(1);
      // The most recently created user (superAdmin) should be first
      expect(response.body.data[0].id).toBe(superAdminUser.id);
    });
  });

  // ============================================================
  // 4. Admin status change: admin changes user status (ACTIVE -> BLOCKED)
  // ============================================================

  describe('Admin Status Change', () => {
    it('should allow admin to change a user status from ACTIVE to BLOCKED', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `block-target-${Date.now()}@e2e.com`,
        name: 'Block Target User',
        status: UserStatus.ACTIVE,
      });

      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${targetUser.id}`)
        .send({ status: UserStatus.BLOCKED });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.id).toBe(targetUser.id);
      expect(response.body.status).toBe(UserStatus.BLOCKED);

      // Verify persistence
      const updatedUser = await prisma.user.findUnique({
        where: { id: targetUser.id },
      });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.status).toBe(UserStatus.BLOCKED);
    });

    it('should allow admin to change status from BLOCKED back to ACTIVE', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `unblock-target-${Date.now()}@e2e.com`,
        name: 'Unblock Target User',
        status: UserStatus.BLOCKED,
      });

      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${targetUser.id}`)
        .send({ status: UserStatus.ACTIVE });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe(UserStatus.ACTIVE);
    });

    it('should allow admin to change user type', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `type-change-${Date.now()}@e2e.com`,
        name: 'Type Change User',
      });

      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${targetUser.id}`)
        .send({ role: SystemRole.ADMIN });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.role).toBe(SystemRole.ADMIN);
    });

    it('should allow admin to update multiple fields at once', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `multi-update-${Date.now()}@e2e.com`,
        name: 'Multi Update User',
      });

      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${targetUser.id}`)
        .send({
          name: 'Updated Multi User',
          status: UserStatus.INACTIVE,
          phone: '+15551234567',
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.name).toBe('Updated Multi User');
      expect(response.body.status).toBe(UserStatus.INACTIVE);
      expect(response.body.phone).toBe('+15551234567');
    });

    it('should return 404 when admin tries to update non-existent user status', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${nonExistentId}`)
        .send({ status: UserStatus.BLOCKED });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================================
  // 5. Super-admin deletion: super-admin deletes a user
  // ============================================================

  describe('Super-Admin User Deletion', () => {
    it('should allow super-admin to delete a user', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `delete-target-${Date.now()}@e2e.com`,
        name: 'Delete Target User',
      });

      const response = await authenticatedRequest(superAdminToken).delete(
        `/users/${targetUser.id}`,
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is actually deleted from database
      const deletedUser = await prisma.user.findUnique({
        where: { id: targetUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when deleting a non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(superAdminToken).delete(
        `/users/${nonExistentId}`,
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when trying to delete an already deleted user', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `double-delete-${Date.now()}@e2e.com`,
        name: 'Double Delete User',
      });

      // First deletion
      const firstResponse = await authenticatedRequest(superAdminToken).delete(
        `/users/${targetUser.id}`,
      );
      expect(firstResponse.status).toBe(HttpStatus.OK);

      // Second deletion should fail
      const secondResponse = await authenticatedRequest(superAdminToken).delete(
        `/users/${targetUser.id}`,
      );
      expect(secondResponse.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================================
  // 6. Unauthorized access: regular user trying admin endpoints returns 403
  // ============================================================

  describe('Unauthorized Access - Role-Based Restrictions', () => {
    it('should return 403 when customer tries to GET /users (admin listing)', async () => {
      const response = await authenticatedRequest(customerToken).get('/users');

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 403 when customer tries to DELETE /users/:id', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `forbidden-delete-${Date.now()}@e2e.com`,
        name: 'Forbidden Delete Target',
      });

      const response = await authenticatedRequest(customerToken).delete(`/users/${targetUser.id}`);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 403 when customer tries to POST /users (create user)', async () => {
      const response = await authenticatedRequest(customerToken)
        .post('/users')
        .send(UserFactory.create({ email: 'new-user-forbidden@test.com' }));

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 403 when customer tries to update another user profile', async () => {
      const otherUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `other-user-${Date.now()}@e2e.com`,
        name: 'Other User',
      });

      const response = await authenticatedRequest(customerToken)
        .patch(`/users/${otherUser.id}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('should allow admin to GET /users (not forbidden)', async () => {
      const response = await authenticatedRequest(adminToken).get('/users');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
    });

    it('should allow admin to DELETE /users/:id (not forbidden)', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `admin-delete-${Date.now()}@e2e.com`,
        name: 'Admin Delete Target',
      });

      const response = await authenticatedRequest(adminToken).delete(`/users/${targetUser.id}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================
  // 7. GET /users/:id - fetch single user
  // ============================================================

  describe('Get Single User', () => {
    it('should return user details for a valid ID', async () => {
      const response = await authenticatedRequest(adminToken).get(`/users/${customerUser.id}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.id).toBe(customerUser.id);
      expect(response.body.name).toBe(customerUser.name);
      expect(response.body.email).toBe(customerUser.email);
      expect(response.body.role).toBe(SystemRole.CUSTOMER);
      expect(response.body.status).toBe(UserStatus.ACTIVE);
      // Should not include sensitive fields
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent user ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(adminToken).get(`/users/${nonExistentId}`);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for invalid UUID format', async () => {
      const response = await authenticatedRequest(adminToken).get('/users/not-a-uuid');

      // Prisma will throw for invalid UUID, mapped to 400 or 404
      expect([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
    });
  });

  // ============================================================
  // 8. POST /users - create user (admin only)
  // ============================================================

  describe('Create User (Admin Only)', () => {
    it('should allow admin to create a new user', async () => {
      const newUser = UserFactory.create({
        email: `new-created-${Date.now()}@e2e.com`,
        name: 'Newly Created User',
        role: SystemRole.CUSTOMER,
      });

      const response = await authenticatedRequest(adminToken).post('/users').send(newUser);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.role).toBe(SystemRole.CUSTOMER);
      expect(response.body.status).toBe(UserStatus.ACTIVE);
      expect(response.body.id).toBeDefined();

      // Verify persistence
      const createdUser = await prisma.user.findUnique({
        where: { id: response.body.id },
      });
      expect(createdUser).not.toBeNull();
      expect(createdUser!.name).toBe(newUser.name);
    });

    it('should return 409 when creating a user with duplicate email', async () => {
      const existingEmail = customerUser.email!;
      const response = await authenticatedRequest(adminToken)
        .post('/users')
        .send(UserFactory.create({ email: existingEmail }));

      expect(response.status).toBe(HttpStatus.CONFLICT);
    });

    it('should return 400 when creating user with invalid email', async () => {
      const response = await authenticatedRequest(adminToken)
        .post('/users')
        .send(UserFactory.create({ email: 'not-valid-email' }));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create user as ADMIN type when specified', async () => {
      const response = await authenticatedRequest(adminToken)
        .post('/users')
        .send(
          UserFactory.create({
            email: `admin-created-${Date.now()}@e2e.com`,
            role: SystemRole.ADMIN,
          }),
        );

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body.role).toBe(SystemRole.ADMIN);
    });
  });

  // ============================================================
  // 9. Data integrity and edge cases
  // ============================================================

  describe('Data Integrity', () => {
    it('should preserve unchanged fields when partially updating', async () => {
      const originalUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `integrity-${Date.now()}@e2e.com`,
        name: 'Integrity Test User',
        phone: '+15550001111',
      });

      // Update only name
      await authenticatedRequest(adminToken)
        .patch(`/users/${originalUser.id}`)
        .send({ name: 'Updated Name' });

      const updatedUser = await prisma.user.findUnique({
        where: { id: originalUser.id },
      });

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.name).toBe('Updated Name');
      expect(updatedUser!.email).toBe(originalUser.email);
      expect(updatedUser!.phone).toBe(originalUser.phone);
      expect(updatedUser!.role).toBe(SystemRole.CUSTOMER);
    });

    it('should handle concurrent updates to the same user correctly', async () => {
      const targetUser = await createTestUser(prisma, SystemRole.CUSTOMER, {
        email: `concurrent-update-${Date.now()}@e2e.com`,
        name: 'Concurrent Update User',
      });

      // Send two concurrent updates
      const [response1, response2] = await Promise.all([
        authenticatedRequest(adminToken)
          .patch(`/users/${targetUser.id}`)
          .send({ name: 'Update A' }),
        authenticatedRequest(adminToken)
          .patch(`/users/${targetUser.id}`)
          .send({ name: 'Update B' }),
      ]);

      // Both should succeed (last write wins)
      expect(response1.status).toBe(HttpStatus.OK);
      expect(response2.status).toBe(HttpStatus.OK);

      // Final state should be one of the two updates
      const finalUser = await prisma.user.findUnique({
        where: { id: targetUser.id },
      });
      expect(finalUser).not.toBeNull();
      expect(['Update A', 'Update B']).toContain(finalUser!.name);
    });

    it('should not allow setting invalid user status', async () => {
      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${customerUser.id}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should not allow setting invalid user type', async () => {
      const response = await authenticatedRequest(adminToken)
        .patch(`/users/${customerUser.id}`)
        .send({ role: 'INVALID_TYPE' });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});

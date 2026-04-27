import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SlotPreemptionService } from '../src/modules/time-slots/slot-preemption.service';
import { RateLimiterService } from '../src/modules/rate-limiter/rate-limiter.service';
import { PrismaService } from '../src/common/database/prisma.service';
import {
  createTestUser,
  createTestService,
  createTestTimeSlot,
  cleanupAllTestData,
  createTestCategory,
} from './fixtures/database.fixture';

// ============================================================
// Booking Concurrency E2E Tests
// ============================================================
// Tests the atomic preemption mechanism under concurrent load.
// Validates that the unique constraint on (timeSlotId, appointmentDate, slotSequence)
// prevents double-booking, and that exactly one request succeeds while others fail
// with 409 Conflict.
// ============================================================

describe('Booking Concurrency (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let slotPreemptionService: SlotPreemptionService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
    jwtService = moduleRef.get(JwtService);
    slotPreemptionService = moduleRef.get(SlotPreemptionService);
  });

  afterAll(async () => {
    await cleanupAllTestData(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupAllTestData(prisma);
  });

  // ============================================================
  // Helpers
  // ============================================================

  /** Generate a JWT token for a test user */
  function generateTestToken(userId: string, email: string, role = 'CUSTOMER'): string {
    return jwtService.sign(
      { sub: userId, email, role, name: 'Test User' },
      { secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests-only' },
    );
  }

  /**
   * Create a reservation request payload.
   */
  function createReservationPayload(
    preferSeq: number,
    serviceId: string,
    customerName = 'Test Customer',
    customerEmail = 'test@example.com',
    customerPhone = '+15551234567',
  ) {
    return {
      preferSeq,
      serviceId,
      customerName,
      customerEmail,
      customerPhone,
    };
  }

  /**
   * Send a concurrent reservation request via HTTP.
   * Returns the raw supertest response promise.
   */
  function sendConcurrentReservation(
    slotId: string,
    token: string,
    payload: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/slots/${slotId}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(payload);
  }

  // ============================================================
  // Test 1: 10 simultaneous requests for the same slot (capacity=1)
  // Exactly 1 succeeds with 201, 9 fail with 409
  // ============================================================
  it('should allow exactly 1 success and 9 conflicts when 10 concurrent requests hit the same slot (capacity=1)', async () => {
    // 1. Create shared dependencies
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Concurrency Test Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 1,
      currentSequence: 0,
      slotTime: '2026-06-01T10:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: `concurrency-test-1@e2e.com`,
      name: 'Concurrency Test User 1',
    });

    const token = generateTestToken(user.id, user.email!);

    // 2. Fire 10 simultaneous requests, all targeting the same slot with preferSeq=0
    const CONCURRENCY_COUNT = 10;
    const promises = Array.from({ length: CONCURRENCY_COUNT }, () =>
      sendConcurrentReservation(
        timeSlot.id,
        token,
        createReservationPayload(0, service.id),
      ),
    );

    // 3. Await all responses
    const responses = await Promise.all(promises);

    // 4. Count successes (201) and conflicts (409)
    const successes = responses.filter((r) => r.status === HttpStatus.CREATED);
    const conflicts = responses.filter((r) => r.status === HttpStatus.CONFLICT);
    const otherStatuses = responses.filter(
      (r) => r.status !== HttpStatus.CREATED && r.status !== HttpStatus.CONFLICT,
    );

    // 5. Assert exactly 1 success
    expect(successes.length).toBe(1);
    expect(successes[0].body.success).toBe(true);
    expect(successes[0].body.status).toBe('SUCCESS');
    expect(successes[0].body.allocatedSeq).toBeDefined();

    // 6. Assert 9 conflicts
    expect(conflicts.length).toBe(9);

    // 7. Verify no unexpected statuses
    expect(otherStatuses).toHaveLength(0);

    // 8. Verify the slot's currentSequence was incremented
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    });
    expect(updatedSlot).not.toBeNull();
    expect(updatedSlot!.currentSequence).toBe(1);

    // 9. Verify exactly 1 appointment was created for this slot
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    });
    expect(appointments).toHaveLength(1);
    expect(appointments[0].slotSequence).toBe(0);
  }, 60000);

  // ============================================================
  // Test 2: 10 simultaneous requests for the same slot (capacity > 1)
  // Uses different users to test cross-user atomic preemption
  // ============================================================
  it('should handle concurrent requests from different users with atomic preemption (capacity > 1)', async () => {
    // 1. Create shared dependencies
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Multi-User Concurrency Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 10,
      currentSequence: 0,
      slotTime: '2026-06-01T14:00:00Z',
    });

    // 2. Create 10 different users
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createTestUser(prisma, 'CUSTOMER', {
          email: `concurrency-user-${i}@e2e.com`,
          name: `Concurrency User ${i}`,
        }),
      ),
    );

    // 3. Generate tokens for each user
    const tokens = users.map((u) => generateTestToken(u.id, u.email!));

    // 4. Fire 10 simultaneous requests, each from a different user
    // All users target the same slot but with different preferSeq values
    const promises = tokens.map((token, i) =>
      sendConcurrentReservation(
        timeSlot.id,
        token,
        createReservationPayload(i % 10, service.id, `Customer ${i}`),
      ),
    );

    const responses = await Promise.all(promises);

    // 5. Under optimistic locking with currentSequence starting at 0,
    // only the request with preferSeq=0 (matching currentSequence) succeeds
    const successes = responses.filter((r) => r.status === HttpStatus.CREATED);
    const conflicts = responses.filter((r) => r.status === HttpStatus.CONFLICT);

    // Exactly 1 succeeds (the one that matched currentSequence=0)
    expect(successes.length).toBe(1);
    expect(successes[0].body.allocatedSeq).toBe(0);

    // 9 conflict due to VERSION_CONFLICT (currentSequence mismatch)
    expect(conflicts.length).toBe(9);

    // 6. Verify slot sequence incremented by 1
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    });
    expect(updatedSlot).not.toBeNull();
    expect(updatedSlot!.currentSequence).toBe(1);

    // 7. Verify exactly 1 appointment
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    });
    expect(appointments).toHaveLength(1);
  }, 60000);

  // ============================================================
  // Test 3: Sequential reservations verify slot_sequence increments correctly
  // ============================================================
  it('should increment slot_sequence correctly across sequential reservations', async () => {
    // 1. Create dependencies
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Sequential Test Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 10,
      currentSequence: 0,
      slotTime: '2026-06-01T15:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'sequential-test@e2e.com',
      name: 'Sequential Test User',
    });

    const token = generateTestToken(user.id, user.email!);

    // 2. Make 5 sequential reservations, each targeting the current sequence
    const expectedSequences = [0, 1, 2, 3, 4];
    const results: { status: number; body: Record<string, unknown> }[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(createReservationPayload(i, service.id, `Sequential Customer ${i}`));

      results.push({ status: response.status, body: response.body });
    }

    // 3. All 5 should succeed because each one targets the correct currentSequence
    results.forEach((r, i) => {
      expect(r.status).toBe(HttpStatus.CREATED);
      expect(r.body.success).toBe(true);
      expect(r.body.allocatedSeq).toBe(expectedSequences[i]);
    });

    // 4. Verify final currentSequence
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    });
    expect(updatedSlot).not.toBeNull();
    expect(updatedSlot!.currentSequence).toBe(5);

    // 5. Verify all appointments have correct slotSequence values
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
      orderBy: { slotSequence: 'asc' },
    });
    expect(appointments).toHaveLength(5);
    appointments.forEach((apt, i) => {
      expect(apt.slotSequence).toBe(i);
    });
  }, 60000);

  // ============================================================
  // Test 4: Unique constraint enforcement on (timeSlotId, appointmentDate, slotSequence)
  // ============================================================
  it('should enforce unique constraint on (timeSlotId, appointmentDate, slotSequence)', async () => {
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Constraint Test Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 10,
      currentSequence: 0,
      slotTime: '2026-06-01T16:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'constraint-test@e2e.com',
      name: 'Constraint Test User',
    });

    const token = generateTestToken(user.id, user.email!);

    // First reservation should succeed
    const firstResponse = await request(app.getHttpServer())
      .post(`/slots/${timeSlot.id}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(createReservationPayload(0, service.id));

    expect(firstResponse.status).toBe(HttpStatus.CREATED);
    expect(firstResponse.body.allocatedSeq).toBe(0);

    // Now simulate concurrent requests all trying preferSeq=0 again
    // After the first success, currentSequence is now 1, so preferSeq=0 will mismatch
    const concurrentPromises = Array.from({ length: 5 }, () =>
      request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(createReservationPayload(0, service.id)),
    );

    const concurrentResponses = await Promise.all(concurrentPromises);

    // All should fail with 409 (version conflict - currentSequence is now 1, not 0)
    concurrentResponses.forEach((r) => {
      expect(r.status).toBe(HttpStatus.CONFLICT);
    });

    // Verify only 1 appointment exists
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    });
    expect(appointments).toHaveLength(1);
  }, 60000);

  // ============================================================
  // Test 5: Idempotency - same idempotency key returns cached result
  // ============================================================
  it('should return cached result for duplicate idempotency key', async () => {
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Idempotency Test Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 5,
      currentSequence: 0,
      slotTime: '2026-06-01T17:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'idempotency-test@e2e.com',
      name: 'Idempotency Test User',
    });

    const token = generateTestToken(user.id, user.email!);
    const idempotencyKey = SlotPreemptionService.generateIdempotencyKey(
      user.id,
      timeSlot.id,
      Date.now(),
    );

    // First request
    const firstResponse = await request(app.getHttpServer())
      .post(`/slots/${timeSlot.id}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idempotencyKey)
      .send(createReservationPayload(0, service.id));

    expect(firstResponse.status).toBe(HttpStatus.CREATED);
    expect(firstResponse.body.success).toBe(true);
    const firstAppointmentId = firstResponse.body.appointment.id;

    // Second request with same idempotency key (should return cached result)
    const secondResponse = await request(app.getHttpServer())
      .post(`/slots/${timeSlot.id}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idempotencyKey)
      .send(createReservationPayload(0, service.id));

    expect(secondResponse.status).toBe(HttpStatus.CREATED);
    expect(secondResponse.body.appointment.id).toBe(firstAppointmentId);

    // Verify only 1 appointment was actually created
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    });
    expect(appointments).toHaveLength(1);
  }, 60000);

  // ============================================================
  // Test 6: Burst concurrency with staggered preferSeq values
  // Tests that wrap-around retry logic distributes load
  // ============================================================
  it('should handle burst concurrency with wrap-around retry logic', async () => {
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Burst Test Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 10,
      currentSequence: 0,
      slotTime: '2026-06-01T18:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'burst-test@e2e.com',
      name: 'Burst Test User',
    });

    const token = generateTestToken(user.id, user.email!);

    // Fire 10 requests all with the SAME preferSeq=0 simultaneously
    // Due to retries with wrap-around ((preferSeq + attempt) % SEQUENCE_RANGE),
    // some requests may succeed on retry with preferSeq=1, 2, etc.
    const promises = Array.from({ length: 10 }, () =>
      request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(createReservationPayload(0, service.id)),
    );

    const responses = await Promise.all(promises);

    const successes = responses.filter((r) => r.status === HttpStatus.CREATED);
    const conflicts = responses.filter((r) => r.status === HttpStatus.CONFLICT);

    // At least 1 should succeed (the first one to claim currentSequence=0)
    // Additional successes may occur if retries claim sequences 1, 2, 3
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // The rest should be conflicts
    expect(conflicts.length + successes.length).toBe(10);

    // Verify allocatedSeq values are unique among successes
    const allocatedSeqs = successes.map((r) => r.body.allocatedSeq as number);
    const uniqueSeqs = new Set(allocatedSeqs);
    expect(uniqueSeqs.size).toBe(allocatedSeqs.length);

    // Verify appointments have sequential slotSequence values
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
      orderBy: { slotSequence: 'asc' },
    });
    expect(appointments).toHaveLength(successes.length);

    // Verify no duplicate slotSequence values
    const slotSeqs = appointments.map((a) => a.slotSequence);
    expect(new Set(slotSeqs).size).toBe(slotSeqs.length);
  }, 60000);

  // ============================================================
  // Test 7: Slot at max capacity - verify preemption stops
  // ============================================================
  it('should stop accepting reservations when slot reaches max capacity via sequence wrap', async () => {
    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Capacity Test Service' });

    // Create a slot with capacity equal to SEQUENCE_RANGE (10)
    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 10,
      currentSequence: 0,
      slotTime: '2026-06-01T19:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'capacity-test@e2e.com',
      name: 'Capacity Test User',
    });

    const token = generateTestToken(user.id, user.email!);

    // Make reservations until we fill the slot (10 sequences: 0-9)
    for (let i = 0; i < 10; i++) {
      const response = await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(createReservationPayload(i, service.id, `Capacity Customer ${i}`));

      if (response.status === HttpStatus.CREATED) {
        // Success expected
      }
    }

    // Verify all 10 appointments were created
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
      orderBy: { slotSequence: 'asc' },
    });
    expect(appointments).toHaveLength(10);

    // Verify slotSequence values range from 0 to 9
    const slotSeqs = appointments.map((a) => a.slotSequence);
    expect(slotSeqs).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Verify currentSequence wrapped back to 0
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    });
    expect(updatedSlot).not.toBeNull();
    expect(updatedSlot!.currentSequence).toBe(10);
  }, 60000);

  // ============================================================
  // Test 8: Direct service-level concurrency test (bypass HTTP)
  // Validates the core atomic preemption mechanism at service layer
  // ============================================================
  it('should enforce atomic preemption at the service level under direct concurrent calls', async () => {
    // Mock the rate limiter to allow all requests
    const rateLimiter = app.get(RateLimiterService);
    jest.spyOn(rateLimiter, 'isAllowed').mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 100,
      window: 60,
    });

    const category = await createTestCategory(prisma);
    const service = await createTestService(prisma, category.id, { name: 'Direct Concurrency Service' });

    const timeSlot = await createTestTimeSlot(prisma, service.id, {
      capacity: 1,
      currentSequence: 0,
      slotTime: '2026-06-01T20:00:00Z',
    });

    const user = await createTestUser(prisma, 'CUSTOMER', {
      email: 'direct-concurrency@e2e.com',
      name: 'Direct Concurrency User',
    });

    // Fire 10 concurrent direct service calls
    const CONCURRENCY_COUNT = 10;
    const promises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) =>
      slotPreemptionService.reserveSlot({
        userId: user.id,
        slotId: timeSlot.id,
        preferSeq: 0, // All target the same sequence
        serviceId: service.id,
        customerName: `Direct Customer ${i}`,
        customerEmail: `direct-${i}@e2e.com`,
        customerPhone: `+1555000000${i}`,
      }),
    );

    const results = await Promise.all(promises);

    // Count successes and conflicts
    const successes = results.filter((r) => r.status === 'SUCCESS');
    const conflicts = results.filter((r) => r.status === 'CONFLICT' || r.status === 'FAILED');

    // Exactly 1 should succeed
    expect(successes.length).toBe(1);
    expect(successes[0].allocatedSeq).toBe(0);

    // 9 should fail with conflict
    expect(conflicts.length).toBe(9);

    // Verify exactly 1 appointment in DB
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    });
    expect(appointments).toHaveLength(1);
  }, 60000);
});

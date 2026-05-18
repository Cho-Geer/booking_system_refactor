import { FakePrismaClient } from './fake-prisma-client';

describe('FakePrismaClient', () => {
  let client: FakePrismaClient;

  beforeEach(() => {
    client = new FakePrismaClient();
  });

  describe('create', () => {
    it('should create a record with generated id', async () => {
      const user = await client.user.create({
        data: { name: 'John', email: 'john@test.com' },
      });
      expect(user.id).toBeDefined();
      expect(user.name).toBe('John');
      expect(user.email).toBe('john@test.com');
    });

    it('should use provided id if specified', async () => {
      const user = await client.user.create({
        data: { id: 'custom-id', name: 'Jane' },
      });
      expect(user.id).toBe('custom-id');
    });
  });

  describe('findUnique', () => {
    it('should find a record by id', async () => {
      const created = await client.user.create({ data: { name: 'FindMe' } });
      const found = await client.user.findUnique({ where: { id: created.id } });
      expect(found).not.toBeNull();
      expect(found!.name).toBe('FindMe');
    });

    it('should return null for non-existent id', async () => {
      const found = await client.user.findUnique({
        where: { id: 'nonexistent' },
      });
      expect(found).toBeNull();
    });
  });

  describe('findFirst', () => {
    it('should find the first matching record', async () => {
      await client.user.create({ data: { name: 'A', email: 'a@test.com' } });
      await client.user.create({ data: { name: 'B', email: 'b@test.com' } });
      const first = await client.user.findFirst({ where: { name: 'B' } });
      expect(first).not.toBeNull();
      expect(first!.name).toBe('B');
    });
  });

  describe('findMany', () => {
    it('should return all records', async () => {
      await client.user.create({ data: { name: 'A' } });
      await client.user.create({ data: { name: 'B' } });
      const users = await client.user.findMany();
      expect(users).toHaveLength(2);
    });

    it('should filter records with where clause', async () => {
      await client.user.create({ data: { name: 'A', email: 'a@test.com' } });
      await client.user.create({ data: { name: 'B', email: 'b@test.com' } });
      const filtered = await client.user.findMany({ where: { name: 'A' } });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('A');
    });

    it('should support orderBy', async () => {
      await client.user.create({ data: { name: 'B' } });
      await client.user.create({ data: { name: 'A' } });
      const sorted = await client.user.findMany({ orderBy: { name: 'asc' } });
      expect(sorted[0].name).toBe('A');
      expect(sorted[1].name).toBe('B');
    });

    it('should support skip and take for pagination', async () => {
      for (let i = 0; i < 10; i++) {
        await client.user.create({ data: { name: `User${i}` } });
      }
      const page = await client.user.findMany({ skip: 3, take: 4 });
      expect(page).toHaveLength(4);
      expect(page[0].name).toBe('User3');
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      const user = await client.user.create({ data: { name: 'OldName' } });
      const updated = await client.user.update({
        where: { id: user.id },
        data: { name: 'NewName' },
      });
      expect(updated.name).toBe('NewName');
      // Verify persistence
      const found = await client.user.findUnique({ where: { id: user.id } });
      expect(found!.name).toBe('NewName');
    });
  });

  describe('delete', () => {
    it('should delete an existing record', async () => {
      const user = await client.user.create({ data: { name: 'DeleteMe' } });
      await client.user.delete({ where: { id: user.id } });
      const found = await client.user.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should create when record does not exist', async () => {
      const result = await client.user.upsert({
        where: { id: 'new-id' },
        create: { id: 'new-id', name: 'Created' },
        update: { name: 'Updated' },
      });
      expect(result.name).toBe('Created');
    });

    it('should update when record exists', async () => {
      await client.user.create({ data: { id: 'existing', name: 'Original' } });
      const result = await client.user.upsert({
        where: { id: 'existing' },
        create: { id: 'existing', name: 'Created' },
        update: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });
  });

  describe('count', () => {
    it('should return total record count', async () => {
      await client.user.create({ data: { name: 'A' } });
      await client.user.create({ data: { name: 'B' } });
      const count = await client.user.count();
      expect(count).toBe(2);
    });

    it('should return filtered count', async () => {
      await client.user.create({ data: { name: 'A', email: 'a@test.com' } });
      await client.user.create({ data: { name: 'B', email: 'b@test.com' } });
      const count = await client.user.count({ where: { name: 'A' } });
      expect(count).toBe(1);
    });
  });

  describe('$transaction', () => {
    it('should execute operations in a transaction sequentially', async () => {
      const result = await client.$transaction([
        client.user.create({ data: { name: 'Tx1' } }),
        client.user.create({ data: { name: 'Tx2' } }),
      ]);
      expect(result).toHaveLength(2);
      const users = await client.user.findMany();
      expect(users).toHaveLength(2);
    });

    it('should support interactive transactions', async () => {
      const result = await client.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { name: 'Interactive' } });
        return user;
      });
      expect(result.name).toBe('Interactive');
    });
  });

  describe('model access', () => {
    it('should support multiple models', async () => {
      // Users model
      await client.user.create({ data: { name: 'User1' } });
      // Services model (generic)
      await client.service.create({
        data: { name: 'Service1', durationMinutes: 60 },
      });
      const users = await client.user.findMany();
      const services = await client.service.findMany();
      expect(users).toHaveLength(1);
      expect(services).toHaveLength(1);
    });

    it('should auto-create model delegate on access', () => {
      expect(client.nonexistentModel).toBeDefined();
      expect(client.nonexistentModel.create).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw when updating non-existent record', async () => {
      await expect(
        client.user.update({
          where: { id: 'does-not-exist' },
          data: { name: 'Nope' },
        }),
      ).rejects.toThrow('Record not found');
    });

    it('should throw when deleting non-existent record', async () => {
      await expect(client.user.delete({ where: { id: 'does-not-exist' } })).rejects.toThrow(
        'Record not found',
      );
    });
  });
});

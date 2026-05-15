import { v4 as uuidv4 } from "uuid";

/**
 * FakePrismaClient — In-memory database compatible with Prisma Client API.
 *
 * THIS IS A FAKE, NOT A MOCK. It maintains real internal state.
 *
 * Features:
 * - Matches PrismaClient delegate pattern (this.user.create, etc.)
 * - Supports findUnique, findMany, findFirst, create, update, delete, upsert, count
 * - Supports where, orderBy, skip, take
 * - Limited transaction support (sequential, in-memory)
 *
 * Limitations:
 * - No real SQL execution — in-memory Map-based storage
 * - No foreign key constraint enforcement
 * - No transaction isolation (single-threaded)
 * - No partial unique indexes
 *
 * @example
 * ```ts
 * const prisma = new FakePrismaClient();
 * const user = await prisma.user.create({ data: { name: 'John' } });
 * const found = await prisma.user.findUnique({ where: { id: user.id } });
 * ```
 */

type ModelName = string;
type RecordData = Record<string, any>;
type ModelStore = Map<string, RecordData>;

interface ModelDelegate {
  create: (args: { data: any; include?: any }) => Promise<any>;
  findUnique: (args: { where: any; include?: any }) => Promise<any | null>;
  findFirst: (args: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }) => Promise<any | null>;
  findMany: (args?: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
  }) => Promise<any[]>;
  update: (args: { where: any; data: any }) => Promise<any>;
  delete: (args: { where: any }) => Promise<any>;
  upsert: (args: { where: any; create: any; update: any }) => Promise<any>;
  count: (args?: { where?: any }) => Promise<number>;
  aggregate: (args?: any) => Promise<any>;
}

export class FakePrismaClient {
  private stores: Map<ModelName, ModelStore> = new Map();

  /**
   * Get or create a model delegate proxy.
   * Supports dynamic model access: client.user, client.service, etc.
   */
  [modelName: string]: any;

  constructor() {
    return new Proxy(this, {
      get(target, prop: string) {
        // Handle built-in methods
        if (
          prop in target ||
          prop === "constructor" ||
          prop === "__esModule" ||
          prop === "then"
        ) {
          return (target as any)[prop];
        }

        // Handle $transaction
        if (prop === "$transaction") {
          return target.$transaction.bind(target);
        }

        // Handle $connect, $disconnect (no-ops for in-memory)
        if (prop === "$connect" || prop === "$disconnect") {
          return async () => {};
        }

        // Return a model delegate for any other property
        return target.getModelDelegate(prop);
      },
    });
  }

  /**
   * Get or create a model delegate for the given model name.
   */
  private getModelDelegate(modelName: string): ModelDelegate {
    if (!this.stores.has(modelName)) {
      this.stores.set(modelName, new Map());
    }

    const store = this.stores.get(modelName)!;

    const delegate: ModelDelegate = {
      create: async (args: { data: any; include?: any }) => {
        const data = { ...args.data };
        if (!data.id) {
          data.id = uuidv4();
        }
        if (!data.createdAt) {
          data.createdAt = new Date();
        }
        if (!data.updatedAt) {
          data.updatedAt = new Date();
        }
        store.set(data.id, { ...data });
        return { ...data };
      },

      findUnique: async (args: { where: any; include?: any }) => {
        const id = this.extractId(args.where);
        const record = store.get(id);
        if (!record) return null;
        return { ...record };
      },

      findFirst: async (args: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
      }) => {
        const all = Array.from(store.values());
        let filtered = this.applyWhere(all, args.where || {});
        filtered = this.applyOrderBy(filtered, args.orderBy);
        const skip = args.skip || 0;
        if (skip >= filtered.length) return null;
        return { ...filtered[skip] };
      },

      findMany: async (args?: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
        include?: any;
      }) => {
        const all = Array.from(store.values());
        let filtered = this.applyWhere(all, args?.where || {});
        filtered = this.applyOrderBy(filtered, args?.orderBy);
        const skip = args?.skip || 0;
        const take = args?.take ?? filtered.length;
        return filtered.slice(skip, skip + take).map((r) => ({ ...r }));
      },

      update: async (args: { where: any; data: any }) => {
        const id = this.extractId(args.where);
        const existing = store.get(id);
        if (!existing) {
          throw new Error(`Record not found: ${id}`);
        }
        const updated = {
          ...existing,
          ...args.data,
          updatedAt: new Date(),
        };
        store.set(id, updated);
        return { ...updated };
      },

      delete: async (args: { where: any }) => {
        const id = this.extractId(args.where);
        const existing = store.get(id);
        if (!existing) {
          throw new Error(`Record not found: ${id}`);
        }
        store.delete(id);
        return { ...existing };
      },

      upsert: async (args: { where: any; create: any; update: any }) => {
        const id = this.extractId(args.where);
        const existing = store.get(id);
        if (existing) {
          return delegate.update({ where: args.where, data: args.update });
        } else {
          return delegate.create({ data: args.create });
        }
      },

      count: async (args?: { where?: any }) => {
        const all = Array.from(store.values());
        if (!args?.where) return all.length;
        return this.applyWhere(all, args.where).length;
      },

      aggregate: async (_args?: any) => {
        return {};
      },
    };

    return delegate;
  }

  /**
   * Execute operations in a transaction.
   * Supports both interactive ($transaction(async (tx) => { ... }))
   * and sequential ($transaction([op1, op2, ...])) transactions.
   */
  async $transaction(
    arg: any | any[] | ((tx: FakePrismaClient) => Promise<any>),
  ): Promise<any> {
    if (typeof arg === "function") {
      // Interactive transaction
      return await arg(this);
    }

    if (Array.isArray(arg)) {
      // Sequential array of operations
      const results: any[] = [];
      for (const op of arg) {
        results.push(await op);
      }
      return results;
    }

    throw new Error("Invalid transaction argument");
  }

  /**
   * Extract id from a where clause (supports { id: '...' } and composite keys).
   */
  private extractId(where: any): string {
    if (!where) return "";
    if (typeof where.id === "string") return where.id;
    // For composite keys or other formats, use the first value
    const values = Object.values(where);
    return values.length > 0 ? String(values[0]) : "";
  }

  /**
   * Apply where filter to an array of records.
   */
  private applyWhere(records: RecordData[], where: any): RecordData[] {
    if (!where || Object.keys(where).length === 0) return records;

    return records.filter((record) => {
      for (const [key, value] of Object.entries(where)) {
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  /**
   * Apply orderBy to an array of records.
   */
  private applyOrderBy(records: RecordData[], orderBy?: any): RecordData[] {
    if (!orderBy) return records;

    const entries = Object.entries(orderBy);
    if (entries.length === 0) return records;

    const [field, direction] = entries[0];
    const sorted = [...records].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return direction === "desc" ? -cmp : cmp;
    });

    return sorted;
  }
}

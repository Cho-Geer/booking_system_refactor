import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { slotResolver, TimeSlot } from './slot.resolver';

describe('slotResolver', () => {
  const createRouteSnapshot = (params: { date?: string } = {}): any => ({
    paramMap: {
      get: (key: string) => (params as Record<string, string>)[key] ?? null,
    },
  });
  const mockRouterState = {} as any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  async function getResult(route: any = createRouteSnapshot()) {
    const result$ = slotResolver(route, mockRouterState);
    const observable = isObservable(result$) ? result$ : of(result$);
    return (await firstValueFrom(observable)) as TimeSlot[];
  }

  it('should return an array of time slots for default date', async () => {
    const result = await getResult();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return time slots for a specific date from route params', async () => {
    const route = createRouteSnapshot({ date: '2026-05-01' });
    const result = await getResult(route);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((slot) => {
      expect(slot.date).toBe('2026-05-01');
    });
  });

  it('should return slots with all required fields', async () => {
    const result = await getResult();

    const requiredFields: (keyof TimeSlot)[] = ['id', 'date', 'time', 'isActive'];

    result.forEach((slot) => {
      requiredFields.forEach((field) => {
        expect(slot[field]).toBeDefined();
      });
    });
  });

  it('should return slots with correct types', async () => {
    const result = await getResult();

    result.forEach((slot) => {
      expect(typeof slot.id).toBe('string');
      expect(typeof slot.date).toBe('string');
      expect(typeof slot.time).toBe('string');
      expect(typeof slot.isActive).toBe('boolean');
      if (slot.bookedBy !== undefined) {
        expect(typeof slot.bookedBy).toBe('string');
      }
    });
  });

  it('should return at least one active slot', async () => {
    const result = await getResult();

    const activeSlots = result.filter((slot) => slot.isActive);
    expect(activeSlots.length).toBeGreaterThan(0);
  });

  it('should return unique slot IDs', async () => {
    const result = await getResult();

    const ids = result.map((slot) => slot.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should return slots with valid time format HH:MM', async () => {
    const result = await getResult();

    const timeRegex = /^\d{2}:\d{2}$/;
    result.forEach((slot) => {
      expect(timeRegex.test(slot.time)).toBe(true);
    });
  });
});

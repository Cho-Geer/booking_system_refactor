import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { serviceResolver, Service } from './service.resolver';

describe('serviceResolver', () => {
  const mockActivatedRouteSnapshot = {} as any;
  const mockRouterState = {} as any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  async function getResult() {
    const result$ = serviceResolver(mockActivatedRouteSnapshot, mockRouterState);
    const observable = isObservable(result$) ? result$ : of(result$);
    return (await firstValueFrom(observable)) as Service[];
  }

  it('should return an array of services', async () => {
    const result = await getResult();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return services with all required fields', async () => {
    const result = await getResult();

    const requiredFields: (keyof Service)[] = [
      'id',
      'name',
      'description',
      'durationMinutes',
      'price',
      'isActive',
    ];

    result.forEach((service) => {
      requiredFields.forEach((field) => {
        expect(service[field]).toBeDefined();
      });
    });
  });

  it('should return services with correct types', async () => {
    const result = await getResult();

    result.forEach((service) => {
      expect(typeof service.id).toBe('string');
      expect(typeof service.name).toBe('string');
      expect(typeof service.description).toBe('string');
      expect(typeof service.durationMinutes).toBe('number');
      expect(typeof service.price).toBe('number');
      expect(typeof service.isActive).toBe('boolean');
    });
  });

  it('should return services with positive duration and price', async () => {
    const result = await getResult();

    result.forEach((service) => {
      expect(service.durationMinutes).toBeGreaterThan(0);
      expect(service.price).toBeGreaterThanOrEqual(0);
    });
  });

  it('should return at least one active service', async () => {
    const result = await getResult();

    const activeServices = result.filter((service) => service.isActive);
    expect(activeServices.length).toBeGreaterThan(0);
  });

  it('should return unique service IDs', async () => {
    const result = await getResult();

    const ids = result.map((service) => service.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

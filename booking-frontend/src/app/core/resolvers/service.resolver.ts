import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';

/**
 * Service interface representing a bookable service.
 * TODO: Move this interface to a shared DTO file once the API service is created.
 */
export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

/**
 * Functional resolver that returns a list of available services.
 * 
 * Currently returns static sample data since no backend API exists yet.
 * TODO: Replace with actual API call once the backend endpoint is available.
 * 
 * Example implementation with API:
 * ```typescript
 * const serviceService = inject(ServiceService);
 * return serviceService.getServices();
 * ```
 */
export const serviceResolver: ResolveFn<Service[]> = () => {
  // TODO: Replace with actual API call once backend endpoint is available
  // const serviceService = inject(ServiceService);
  // return serviceService.getServices();

  const sampleServices: Service[] = [
    {
      id: 'svc-001',
      name: '标准剪发',
      description: '标准剪发服务，包含洗发、剪发、造型',
      durationMinutes: 30,
      price: 50,
      isActive: true,
    },
    {
      id: 'svc-002',
      name: '染发服务',
      description: '专业染发服务，提供多种颜色选择',
      durationMinutes: 60,
      price: 150,
      isActive: true,
    },
    {
      id: 'svc-003',
      name: '烫发服务',
      description: '专业烫发服务，包含护理',
      durationMinutes: 90,
      price: 200,
      isActive: true,
    },
    {
      id: 'svc-004',
      name: '深层护理',
      description: '深层头发护理，修复受损发质',
      durationMinutes: 45,
      price: 100,
      isActive: true,
    },
    {
      id: 'svc-005',
      name: '儿童剪发',
      description: '12岁以下儿童专属剪发服务',
      durationMinutes: 20,
      price: 30,
      isActive: false,
    },
  ];

  return of(sampleServices);
};

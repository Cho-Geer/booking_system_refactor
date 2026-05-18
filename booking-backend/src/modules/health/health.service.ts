import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

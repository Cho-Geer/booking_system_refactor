import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

const mockHealthService = {
  check: jest.fn().mockReturnValue({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    mockHealthService.check.mockImplementation(() => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return status ok', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
    });

    it('should return a timestamp in ISO format', () => {
      const result = controller.check();

      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    });

    it('should return a recent timestamp', () => {
      const before = Date.now();
      const result = controller.check();
      const after = Date.now();

      const timestamp = new Date(result.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should return consistent response structure', () => {
      const result = controller.check();

      expect(Object.keys(result)).toEqual(['status', 'timestamp']);
    });

    it('should return valid timestamp structure', () => {
      const result = controller.check();

      expect(typeof result.timestamp).toBe('string');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

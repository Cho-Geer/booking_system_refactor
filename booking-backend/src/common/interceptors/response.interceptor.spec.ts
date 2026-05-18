import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { ClsService } from 'nestjs-cls';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let mockClsService: { get: jest.Mock };

  beforeEach(async () => {
    mockClsService = {
      get: jest.fn().mockReturnValue('test-request-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor, { provide: ClsService, useValue: mockClsService }],
    }).compile();

    interceptor = module.get<ResponseInterceptor<unknown>>(ResponseInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  function createMockContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
        getRequest: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  it('should wrap successful response in standard format with statusCode', (done) => {
    const mockData = { id: 'user-1', name: 'Test User' };
    const mockCallHandler: CallHandler = {
      handle: () => of(mockData),
    };
    const mockContext = createMockContext();

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      const resultAny = result as unknown as Record<string, unknown>;
      expect(resultAny.statusCode).toBe(200);
      expect(resultAny.success).toBeUndefined();
      expect(resultAny.code).toBeUndefined();
      expect(resultAny.message).toBe('OK');
      expect(resultAny.data).toEqual(mockData);
      expect(resultAny.timestamp).toBeDefined();
      expect(resultAny.requestId).toBe('test-request-id');
      done();
    });
  });

  it('should get requestId from ClsService', (done) => {
    mockClsService.get.mockReturnValue('cls-request-id');
    const mockCallHandler: CallHandler = { handle: () => of({}) };
    const mockContext = createMockContext();

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(mockClsService.get).toHaveBeenCalledWith('requestId');
      expect(result.requestId).toBe('cls-request-id');
      done();
    });
  });

  it('should fallback to generated requestId when CLS has no requestId', (done) => {
    mockClsService.get.mockReturnValue(undefined);
    const mockCallHandler: CallHandler = { handle: () => of({}) };
    const mockContext = createMockContext();

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.requestId).toMatch(/^req-/);
      done();
    });
  });

  it('should include ISO timestamp in response', (done) => {
    const mockCallHandler: CallHandler = { handle: () => of({}) };
    const mockContext = createMockContext();

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      done();
    });
  });
});

import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const mockClsService = {
  get: jest.fn().mockReturnValue('test-request-id-1234'),
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter(mockClsService as unknown as ClsService);
    mockClsService.get.mockReturnValue('test-request-id-1234');
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/api/test-endpoint',
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not found',
        error: 'Not found',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', errors: ['field1'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Validation failed',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2002 unique constraint violation', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['email'] },
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2025 record not found', () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2000 input value too long', () => {
      const prismaError = {
        code: 'P2000',
        message: 'Value too long for column',
        meta: { column_name: 'name' },
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Input value too long',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2001 record does not exist', () => {
      const prismaError = {
        code: 'P2001',
        message: 'Record does not exist',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2003 foreign key constraint violation', () => {
      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
        meta: { field_name: 'userId' },
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Related resource not found',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2004 database constraint failure', () => {
      const prismaError = {
        code: 'P2004',
        message: 'A constraint failed',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database constraint violation',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2005 invalid field value', () => {
      const prismaError = {
        code: 'P2005',
        message: 'Invalid value for field',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid field value',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2006 invalid field value', () => {
      const prismaError = {
        code: 'P2006',
        message: 'The provided value for the field is not valid',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid field value',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2011 null constraint violation', () => {
      const prismaError = {
        code: 'P2011',
        message: 'Null constraint violation',
        meta: { fields: ['email'] },
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Required field missing',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2012 missing required field', () => {
      const prismaError = {
        code: 'P2012',
        message: 'Missing a required field',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Required field missing',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle Prisma P2034 transaction conflict', () => {
      const prismaError = {
        code: 'P2034',
        message: 'Transaction conflict',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        message: 'Transaction conflict, please retry',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle unknown Prisma error with generic internal server error message', () => {
      const prismaError = {
        code: 'P9999',
        message: 'Unknown database error',
      };

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'PrismaError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle generic Error with its message and name', () => {
      const error = new TypeError('Type mismatch occurred');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Type mismatch occurred',
        error: 'TypeError',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle unknown non-error object with default message', () => {
      const unknownException = 'something went wrong';

      filter.catch(unknownException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Unknown error',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should handle null exception gracefully', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Unknown error',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'test-request-id-1234',
      });
    });

    it('should log error with stack trace for Error instances', () => {
      const error = new Error('Test error');
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      filter.catch(error, mockHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Exception: Error - Test error',
        expect.any(String),
      );
    });

    it('should log error without stack trace for non-Error exceptions', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      filter.catch({ code: 'P2002' }, mockHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Exception: PrismaError - Resource already exists',
        undefined,
      );
    });

    it('should correctly identify Prisma errors by code starting with P', () => {
      const prismaLikeError = {
        code: 'P1234',
        message: 'Some prisma-like error',
      };

      filter.catch(prismaLikeError, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PrismaError',
          message: 'Internal server error',
        }),
      );
    });

    it('should not treat non-Prisma errors with code property as Prisma errors', () => {
      const nonPrismaError = {
        code: 'CUSTOM_ERROR',
        message: 'Custom application error',
      };

      filter.catch(nonPrismaError, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unknown error',
          message: 'Internal server error',
        }),
      );
    });
  });
});

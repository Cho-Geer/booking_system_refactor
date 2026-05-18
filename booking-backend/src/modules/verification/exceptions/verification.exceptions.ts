import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a verification code is invalid or does not match.
 */
export class InvalidVerificationCodeException extends BadRequestException {
  constructor(message = 'Invalid or expired verification code') {
    super(message);
  }
}

/**
 * Exception thrown when the maximum number of verification attempts is exceeded.
 */
export class MaxAttemptsExceededException extends HttpException {
  constructor(message = 'Too many attempts. Please request a new code.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * Exception thrown when Redis is unavailable for verification operations.
 */
export class VerificationUnavailableException extends HttpException {
  constructor(
    message = 'Verification service is temporarily unavailable. Please try again later.',
  ) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

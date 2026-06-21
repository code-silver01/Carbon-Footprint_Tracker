/**
 * Base application error class.
 * All custom errors extend this to provide structured error handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class DuplicateUserError extends AppError {
  constructor(message: string = 'Email already registered') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}

export class GeminiServiceError extends AppError {
  constructor(message: string = 'AI service temporarily unavailable') {
    super(message, 503);
  }
}

export class SustainabilityAdviceError extends AppError {
  constructor(message: string = 'Could not generate recommendations') {
    super(message, 503);
  }
}

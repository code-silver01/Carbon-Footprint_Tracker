/**
 * Base application error class.
 * All custom errors extend this to provide structured error handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = 'APP_ERROR';
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly code: string = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Typed email validation error — provides consistent error code for frontend mapping.
 */
export class EmailValidationError extends ValidationError {
  public readonly code = 'INVALID_EMAIL_FORMAT';
  constructor(email: string) {
    const masked = email.length > 3 ? `${email.substring(0, 3)}***` : '***';
    super(`Email '${masked}' is not in a valid format`);
  }
}

/**
 * Typed password validation error — provides specific failure reason.
 */
export class PasswordValidationError extends ValidationError {
  public readonly code: string;

  private static readonly MESSAGES: Record<PasswordValidationError['reason'], string> = {
    too_short: 'Password must be at least 12 characters',
    no_uppercase: 'Password must contain at least one uppercase letter',
    no_number: 'Password must contain at least one number',
    no_symbol: 'Password must contain at least one symbol (!@#$%)',
  };

  constructor(public readonly reason: 'too_short' | 'no_uppercase' | 'no_number' | 'no_symbol') {
    super(PasswordValidationError.MESSAGES[reason]);
    this.code = `PASSWORD_${reason.toUpperCase()}`;
  }
}

/**
 * Range violation error — for numeric inputs outside acceptable bounds.
 */
export class RangeLimitError extends ValidationError {
  public readonly code = 'RANGE_VIOLATION';
  constructor(fieldName: string, min: number, max: number, actual: number) {
    super(`${fieldName} must be between ${min} and ${max}, got ${actual}`);
  }
}

export class AuthenticationError extends AppError {
  public readonly code = 'AUTHENTICATION_ERROR';
  constructor(message: string = 'Invalid credentials') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  public readonly code = 'AUTHORIZATION_ERROR';
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  public readonly code = 'NOT_FOUND';
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class DuplicateUserError extends AppError {
  public readonly code = 'DUPLICATE_USER';
  constructor(message: string = 'Email already registered') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}

export class GeminiServiceError extends AppError {
  public readonly code = 'GEMINI_SERVICE_ERROR';
  constructor(message: string = 'AI service temporarily unavailable') {
    super(message, 503);
  }
}

export class SustainabilityAdviceError extends AppError {
  public readonly code = 'SUSTAINABILITY_ADVICE_ERROR';
  constructor(message: string = 'Could not generate recommendations') {
    super(message, 503);
  }
}

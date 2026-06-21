import { IUserRepository } from '../repositories/IUserRepository';
import { User } from '../entities/User';
import {
  ValidationError,
  AuthenticationError,
  DuplicateUserError,
  RateLimitError,
} from '../errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstraction for password hashing — injectable, testable.
 */
export interface IPasswordHasher {
  generateSalt(rounds: number): Promise<string>;
  hash(password: string, salt: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}

/**
 * JWT token pair for auth responses.
 */
export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Abstraction for JWT token operations.
 */
export interface ITokenService {
  generateTokenPair(userId: string): AuthTokenPair;
  verifyAccessToken(token: string): { userId: string };
  verifyRefreshToken(token: string): { userId: string };
}

/**
 * Abstraction for rate limiting.
 */
export interface IRateLimiter {
  increment(key: string, windowSeconds: number): Promise<number>;
  delete(key: string): Promise<void>;
}

/**
 * Logger interface for structured logging.
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Hashes email for safe logging (never log raw emails).
 */
function hashEmailForLog(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * AuthService — handles user registration, login, and token management.
 * Security-first: rate limiting, password strength, no information leakage.
 */
export class AuthService {
  private static readonly MIN_PASSWORD_LENGTH = 12;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW = 900; // 15 minutes in seconds
  private static readonly BCRYPT_ROUNDS = 10;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly rateLimiter: IRateLimiter,
    private readonly logger: ILogger,
  ) {}

  /**
   * Register a new user with email and password.
   * Validates email format and password strength.
   */
  async register(email: string, password: string): Promise<AuthTokenPair> {
    // Validate email
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (!this.isStrongPassword(password)) {
      throw new ValidationError(
        'Password must be 12+ characters with at least one uppercase letter, one number, and one symbol',
      );
    }

    // Check for existing user
    const existing = await this.userRepository.findByEmail(email.toLowerCase());
    if (existing) {
      this.logger.warn('Registration attempted with existing email', {
        email: hashEmailForLog(email),
      });
      throw new DuplicateUserError('Email already registered');
    }

    // Hash password
    const salt = await this.passwordHasher.generateSalt(AuthService.BCRYPT_ROUNDS);
    const hashedPassword = await this.passwordHasher.hash(password, salt);

    // Create user
    const user = new User({
      id: uuidv4(),
      email: email.toLowerCase(),
      hashedPassword,
      createdAt: new Date(),
    });

    await this.userRepository.create(user);

    this.logger.info('User registered', { userId: user.id });

    // Generate tokens
    return this.tokenService.generateTokenPair(user.id);
  }

  /**
   * Login with email and password.
   * Rate-limited to prevent brute force attacks.
   * Returns generic error messages to prevent user enumeration.
   */
  async login(email: string, password: string): Promise<AuthTokenPair> {
    const rateLimitKey = `login:${email.toLowerCase()}`;

    // Check rate limit
    const attempts = await this.rateLimiter.increment(
      rateLimitKey,
      AuthService.RATE_LIMIT_WINDOW,
    );
    if (attempts > AuthService.MAX_LOGIN_ATTEMPTS) {
      this.logger.warn('Login rate limit exceeded', {
        email: hashEmailForLog(email),
      });
      throw new RateLimitError('Too many login attempts. Try again in 15 minutes.');
    }

    // Find user — generic error if not found (prevent enumeration)
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      this.logger.warn('Login attempted for non-existent user', {
        email: hashEmailForLog(email),
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await this.passwordHasher.compare(password, user.hashedPassword);
    if (!isValid) {
      this.logger.warn('Failed login attempt', { userId: user.id });
      throw new AuthenticationError('Invalid credentials');
    }

    // Clear rate limit on successful login
    await this.rateLimiter.delete(rateLimitKey);

    this.logger.info('User logged in', { userId: user.id });

    return this.tokenService.generateTokenPair(user.id);
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokenPair> {
    try {
      const decoded = this.tokenService.verifyRefreshToken(refreshToken);
      return this.tokenService.generateTokenPair(decoded.userId);
    } catch (_error) {
      this.logger.warn('Invalid refresh token attempt');
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string): Promise<Omit<User, 'hashedPassword'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    // Return without password hash
    const { hashedPassword: _, ...profile } = user as User & { hashedPassword: string };
    return profile as Omit<User, 'hashedPassword'>;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isStrongPassword(password: string): boolean {
    if (password.length < AuthService.MIN_PASSWORD_LENGTH) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    return true;
  }
}

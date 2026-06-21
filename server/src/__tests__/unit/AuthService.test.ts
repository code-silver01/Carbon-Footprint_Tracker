import {
  AuthService,
  IPasswordHasher,
  ITokenService,
  IRateLimiter,
  ILogger,
} from '../../domain/services/AuthService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import {
  ValidationError,
  AuthenticationError,
  DuplicateUserError,
  RateLimitError,
} from '../../domain/errors';

// --- Mocks ---
function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockPasswordHasher(): jest.Mocked<IPasswordHasher> {
  return {
    generateSalt: jest.fn().mockResolvedValue('mock-salt'),
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
  };
}

function createMockTokenService(): jest.Mocked<ITokenService> {
  return {
    generateTokenPair: jest.fn().mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 86400,
    }),
    verifyAccessToken: jest.fn().mockReturnValue({ userId: 'user-123' }),
    verifyRefreshToken: jest.fn().mockReturnValue({ userId: 'user-123' }),
  };
}

function createMockRateLimiter(): jest.Mocked<IRateLimiter> {
  return {
    increment: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger(): jest.Mocked<ILogger> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

const VALID_EMAIL = 'user@example.com';
const VALID_PASSWORD = 'SecurePass123!@#';
const WEAK_PASSWORD = 'weak';

function createExistingUser(): User {
  return new User({
    id: 'user-123',
    email: VALID_EMAIL,
    hashedPassword: 'hashed-password',
    createdAt: new Date(),
  });
}

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: jest.Mocked<IUserRepository>;
  let hasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;
  let rateLimiter: jest.Mocked<IRateLimiter>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    userRepo = createMockUserRepository();
    hasher = createMockPasswordHasher();
    tokenService = createMockTokenService();
    rateLimiter = createMockRateLimiter();
    logger = createMockLogger();

    authService = new AuthService(userRepo, hasher, tokenService, rateLimiter, logger);
  });

  // --- Registration ---
  describe('register', () => {
    it('should hash password during registration', async () => {
      await authService.register(VALID_EMAIL, VALID_PASSWORD);

      expect(hasher.hash).toHaveBeenCalled();
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword: 'hashed-password',
        }),
      );
    });

    it('should return token pair on successful registration', async () => {
      const result = await authService.register(VALID_EMAIL, VALID_PASSWORD);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should reject invalid email format', async () => {
      await expect(authService.register('invalid-email', VALID_PASSWORD)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should reject weak passwords', async () => {
      await expect(authService.register(VALID_EMAIL, WEAK_PASSWORD)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should reject password without uppercase', async () => {
      await expect(authService.register(VALID_EMAIL, 'securepass123!@#')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should reject password without number', async () => {
      await expect(authService.register(VALID_EMAIL, 'SecurePassword!@#')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should reject password without symbol', async () => {
      await expect(authService.register(VALID_EMAIL, 'SecurePassword123')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw DuplicateUserError if email exists', async () => {
      userRepo.findByEmail.mockResolvedValue(createExistingUser());

      await expect(authService.register(VALID_EMAIL, VALID_PASSWORD)).rejects.toThrow(
        DuplicateUserError,
      );
    });

    it('should log registration event without password', async () => {
      await authService.register(VALID_EMAIL, VALID_PASSWORD);

      expect(logger.info).toHaveBeenCalledWith(
        'User registered',
        expect.objectContaining({ userId: expect.any(String) }),
      );
      // Ensure password is never logged
      for (const call of logger.info.mock.calls) {
        const meta = call[1] as Record<string, unknown> | undefined;
        if (meta) {
          expect(meta).not.toHaveProperty('password');
          expect(meta).not.toHaveProperty('hashedPassword');
        }
      }
    });
  });

  // --- Login ---
  describe('login', () => {
    it('should return tokens on successful login', async () => {
      userRepo.findByEmail.mockResolvedValue(createExistingUser());

      const result = await authService.login(VALID_EMAIL, VALID_PASSWORD);

      expect(result).toHaveProperty('accessToken');
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith('user-123');
    });

    it('should clear rate limit on successful login', async () => {
      userRepo.findByEmail.mockResolvedValue(createExistingUser());

      await authService.login(VALID_EMAIL, VALID_PASSWORD);

      expect(rateLimiter.delete).toHaveBeenCalled();
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login('fake@example.com', VALID_PASSWORD)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError for wrong password', async () => {
      userRepo.findByEmail.mockResolvedValue(createExistingUser());
      hasher.compare.mockResolvedValue(false);

      await expect(authService.login(VALID_EMAIL, 'wrongpassword')).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should not expose whether user exists or password is wrong', async () => {
      // Both should return same generic message
      userRepo.findByEmail.mockResolvedValue(null);
      const error1 = await authService
        .login('fake@example.com', VALID_PASSWORD)
        .catch((e: Error) => e.message);

      userRepo.findByEmail.mockResolvedValue(createExistingUser());
      hasher.compare.mockResolvedValue(false);
      const error2 = await authService
        .login(VALID_EMAIL, 'wrong')
        .catch((e: Error) => e.message);

      expect(error1).toBe('Invalid credentials');
      expect(error2).toBe('Invalid credentials');
    });

    it('should enforce rate limiting on login', async () => {
      rateLimiter.increment.mockResolvedValue(6); // Exceeds limit of 5

      await expect(authService.login(VALID_EMAIL, VALID_PASSWORD)).rejects.toThrow(
        RateLimitError,
      );
    });

    it('should increment rate limiter on each attempt', async () => {
      userRepo.findByEmail.mockResolvedValue(createExistingUser());

      await authService.login(VALID_EMAIL, VALID_PASSWORD);

      expect(rateLimiter.increment).toHaveBeenCalledWith(
        expect.stringContaining('login:'),
        900,
      );
    });
  });

  // --- Refresh Token ---
  describe('refreshToken', () => {
    it('should return new token pair for valid refresh token', async () => {
      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      tokenService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        AuthenticationError,
      );
    });
  });
});

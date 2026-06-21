import rateLimit from 'express-rate-limit';
import { AppConfig } from '../../config/environment';

/**
 * Creates the global rate limiter.
 * 100 requests per 15 minutes per IP/user.
 */
export function createGlobalRateLimiter(config: AppConfig): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests. Please try again later.',
    },
    keyGenerator: (req) => {
      // Rate limit by authenticated user ID if available, otherwise by IP
      const authReq = req as { user?: { userId: string } };
      return authReq.user?.userId ?? req.ip ?? 'unknown';
    },
  });
}

/**
 * Creates a strict rate limiter for login attempts.
 * 5 attempts per 15 minutes.
 */
export function createLoginRateLimiter(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many login attempts. Please try again in 15 minutes.',
    },
    skipSuccessfulRequests: true,
  });
}

/**
 * Creates a rate limiter for AI/Gemini endpoints.
 * 10 requests per 15 minutes.
 */
export function createAIRateLimiter(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many AI requests. Please try again later.',
    },
  });
}

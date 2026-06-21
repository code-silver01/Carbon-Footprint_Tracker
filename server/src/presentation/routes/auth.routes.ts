import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors,
} from '../middleware/ValidationMiddleware';
import { createLoginRateLimiter } from '../middleware/RateLimitMiddleware';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

export function createAuthRoutes(
  authController: AuthController,
  config: AppConfig,
  logger: ILogger,
): Router {
  const router = Router();
  const loginLimiter = createLoginRateLimiter();
  const authMiddleware = createAuthMiddleware(config, logger);

  /**
   * POST /api/auth/register
   * Register a new user account.
   */
  router.post(
    '/register',
    registerValidationRules,
    handleValidationErrors,
    authController.register,
  );

  /**
   * POST /api/auth/login
   * Authenticate and receive tokens.
   */
  router.post(
    '/login',
    loginLimiter,
    loginValidationRules,
    handleValidationErrors,
    authController.login,
  );

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token.
   */
  router.post('/refresh', authController.refreshToken);

  /**
   * GET /api/auth/profile
   * Get authenticated user's profile.
   */
  router.get('/profile', authMiddleware, authController.getProfile);

  return router;
}

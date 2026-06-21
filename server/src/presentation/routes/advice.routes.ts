import { Router } from 'express';
import { AdvisorController } from '../controllers/AdvisorController';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { createAIRateLimiter } from '../middleware/RateLimitMiddleware';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

export function createAdviceRoutes(
  advisorController: AdvisorController,
  config: AppConfig,
  logger: ILogger,
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config, logger);
  const aiLimiter = createAIRateLimiter();

  /**
   * GET /api/advice
   * Get AI-powered sustainability recommendations.
   */
  router.get(
    '/',
    authMiddleware,
    aiLimiter,
    advisorController.getRecommendations,
  );

  return router;
}

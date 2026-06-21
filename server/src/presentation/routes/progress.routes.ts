import { Router } from 'express';
import { ProgressController } from '../controllers/ProgressController';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

export function createProgressRoutes(
  progressController: ProgressController,
  config: AppConfig,
  logger: ILogger,
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config, logger);

  /**
   * GET /api/progress/dashboard
   * Get full dashboard data.
   */
  router.get('/dashboard', authMiddleware, progressController.getDashboard);

  return router;
}

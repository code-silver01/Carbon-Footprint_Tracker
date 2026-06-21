import { Router } from 'express';
import { FootprintController } from '../controllers/FootprintController';
import { footprintValidationRules, handleValidationErrors } from '../middleware/ValidationMiddleware';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

export function createFootprintRoutes(
  footprintController: FootprintController,
  config: AppConfig,
  logger: ILogger,
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config, logger);

  /**
   * POST /api/footprints
   * Calculate and store a new carbon footprint.
   */
  router.post(
    '/',
    authMiddleware,
    footprintValidationRules,
    handleValidationErrors,
    footprintController.create,
  );

  /**
   * GET /api/footprints
   * Get footprint history for authenticated user.
   */
  router.get('/', authMiddleware, footprintController.getHistory);

  /**
   * GET /api/footprints/latest
   * Get the most recent footprint.
   */
  router.get('/latest', authMiddleware, footprintController.getLatest);

  return router;
}

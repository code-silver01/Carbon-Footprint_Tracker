import { Router } from 'express';
import { RoadmapController } from '../controllers/RoadmapController';
import { roadmapValidationRules, handleValidationErrors } from '../middleware/ValidationMiddleware';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { AppConfig } from '../../config/environment';
import { ILogger } from '../../domain/services/AuthService';

export function createRoadmapRoutes(
  roadmapController: RoadmapController,
  config: AppConfig,
  logger: ILogger,
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config, logger);

  /**
   * POST /api/roadmaps
   * Generate a new reduction roadmap.
   */
  router.post(
    '/',
    authMiddleware,
    roadmapValidationRules,
    handleValidationErrors,
    roadmapController.generate,
  );

  /**
   * GET /api/roadmaps/active
   * Get the user's active roadmap.
   */
  router.get('/active', authMiddleware, roadmapController.getActive);

  /**
   * GET /api/roadmaps/strategies
   * Get all available strategies.
   */
  router.get('/strategies', authMiddleware, roadmapController.getStrategies);

  /**
   * PATCH /api/roadmaps/:roadmapId/milestones/:milestoneId
   * Update a milestone's status.
   */
  router.patch(
    '/:roadmapId/milestones/:milestoneId',
    authMiddleware,
    roadmapController.updateMilestone,
  );

  return router;
}

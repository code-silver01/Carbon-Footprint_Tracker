import { Response, NextFunction } from 'express';
import { ProgressTracker } from '../../domain/services/ProgressTracker';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';

/**
 * ProgressController — handles dashboard and progress tracking endpoints.
 */
export class ProgressController {
  constructor(private readonly progressTracker: ProgressTracker) {}

  getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const dashboard = await this.progressTracker.getDashboardData(userId);
      res.status(200).json(dashboard);
    } catch (error) {
      next(error);
    }
  };
}

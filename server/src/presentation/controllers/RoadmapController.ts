import { Response, NextFunction } from 'express';
import { RoadmapService } from '../../domain/services/RoadmapService';
import { IFootprintRepository } from '../../domain/repositories/IFootprintRepository';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';

/**
 * RoadmapController — handles roadmap generation and management.
 */
export class RoadmapController {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly footprintRepository: IFootprintRepository,
  ) {}

  generate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { strategyIds } = req.body as { strategyIds: string[] };

      const footprint = await this.footprintRepository.getLatest(userId);
      if (!footprint) {
        res.status(404).json({
          error: 'No footprint data found. Please calculate your footprint first.',
        });
        return;
      }

      const roadmap = await this.roadmapService.generateRoadmap(userId, footprint, strategyIds);
      res.status(201).json(roadmap.toJSON());
    } catch (error) {
      next(error);
    }
  };

  getActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const roadmap = await this.roadmapService.getActiveRoadmap(userId);
      if (!roadmap) {
        res.status(404).json({ error: 'No active roadmap found' });
        return;
      }

      res.status(200).json(roadmap.toJSON());
    } catch (error) {
      next(error);
    }
  };

  getStrategies = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const strategies = this.roadmapService.getAvailableStrategies();
      res.status(200).json({ strategies });
    } catch (error) {
      next(error);
    }
  };

  updateMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roadmapId, milestoneId } = req.params;
      const { status } = req.body as { status: 'pending' | 'in_progress' | 'completed' | 'skipped' };

      await this.roadmapService.updateMilestoneStatus(roadmapId, milestoneId, status);
      res.status(200).json({ message: 'Milestone updated' });
    } catch (error) {
      next(error);
    }
  };
}

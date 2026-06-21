import { Response, NextFunction } from 'express';
import { SustainabilityAdvisor } from '../../domain/services/SustainabilityAdvisor';
import { IFootprintRepository } from '../../domain/repositories/IFootprintRepository';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';

/**
 * AdvisorController — handles AI-powered sustainability advice endpoints.
 */
export class AdvisorController {
  constructor(
    private readonly sustainabilityAdvisor: SustainabilityAdvisor,
    private readonly footprintRepository: IFootprintRepository,
  ) {}

  getRecommendations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get latest footprint for the user
      const footprint = await this.footprintRepository.getLatest(userId);
      if (!footprint) {
        res.status(404).json({
          error: 'No footprint data found. Please calculate your footprint first.',
        });
        return;
      }

      const advice = await this.sustainabilityAdvisor.generateRecommendations(userId, footprint);

      res.status(200).json({
        advice: {
          topSources: advice.topSources,
          strategies: advice.strategies,
          weeklyChallenge: advice.weeklyChallenge,
          generatedAt: advice.generatedAt.toISOString(),
        },
        footprintSummary: {
          total: footprint.total,
          month: footprint.month,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

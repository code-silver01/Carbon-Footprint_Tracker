import { Response, NextFunction } from 'express';
import { EmissionsCalculator } from '../../domain/services/EmissionsCalculator';
import { ProgressTracker } from '../../domain/services/ProgressTracker';
import { IFootprintRepository } from '../../domain/repositories/IFootprintRepository';
import { CarbonFootprint, FootprintInput, DietType } from '../../domain/entities/CarbonFootprint';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * FootprintController — handles carbon footprint calculation and retrieval.
 */
export class FootprintController {
  constructor(
    private readonly emissionsCalculator: EmissionsCalculator,
    private readonly footprintRepository: IFootprintRepository,
    private readonly progressTracker: ProgressTracker,
  ) {}

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const body = req.body as {
        transportation: { carMiles: number; bikeMiles: number; transitMiles: number; flightHours: number };
        energy: { electricityKwh: number; renewablePercentage: number };
        dietType: string;
        shopping: { monthlySpend: number; fastFashionFrequency: number };
      };

      const input: FootprintInput = {
        transportation: body.transportation,
        energy: body.energy,
        dietType: body.dietType as DietType,
        shopping: body.shopping,
      };

      // Calculate emissions
      const { breakdown, total } = await this.emissionsCalculator.calculateTotal(input);

      const now = new Date();
      const month = now.toISOString().slice(0, 7); // YYYY-MM

      // Create footprint entity
      const footprint = new CarbonFootprint({
        id: uuidv4(),
        userId,
        input,
        breakdown,
        total,
        calculatedAt: now,
        month,
      });

      // Persist
      await this.footprintRepository.create(footprint);

      // Update progress tracking
      await this.progressTracker.updateProgress(userId, footprint);

      res.status(201).json(footprint.toJSON());
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const footprints = await this.footprintRepository.getByUserId(userId, limit);

      res.status(200).json({
        footprints: footprints.map((fp) => fp.toJSON()),
        count: footprints.length,
      });
    } catch (error) {
      next(error);
    }
  };

  getLatest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const footprint = await this.footprintRepository.getLatest(userId);
      if (!footprint) {
        res.status(404).json({ error: 'No footprint data found' });
        return;
      }

      res.status(200).json(footprint.toJSON());
    } catch (error) {
      next(error);
    }
  };
}

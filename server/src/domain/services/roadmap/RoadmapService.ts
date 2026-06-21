import { IRoadmapRepository } from '../../repositories/IRoadmapRepository';
import { Roadmap, Milestone, DifficultyLevel } from '../../value-objects/Milestone';
import { CarbonFootprint } from '../../entities/CarbonFootprint';
import { ValidationError } from '../../errors';
import { ILogger } from '../AuthService';
import { v4 as uuidv4 } from 'uuid';
import { IMilestoneCalculator } from './MilestoneCalculator';
import { IStrategyAllocator } from './StrategyAllocator';
import { Strategy, DEFAULT_STRATEGIES } from './strategies';

/**
 * RoadmapService — orchestrates personalized carbon reduction roadmap generation.
 *
 * Delegates milestone calculation and strategy allocation to specialized services,
 * adhering to the Single Responsibility Principle.
 *
 * @example
 * ```typescript
 * const roadmap = await roadmapService.generateRoadmap(userId, footprint, ['strat-carpool']);
 * ```
 */
export class RoadmapService {
  constructor(
    private readonly roadmapRepository: IRoadmapRepository,
    private readonly milestoneCalculator: IMilestoneCalculator,
    private readonly strategyAllocator: IStrategyAllocator,
    private readonly logger: ILogger,
  ) {}

  /**
   * Generate a new roadmap for a user based on their footprint and chosen strategies.
   *
   * @param userId - The authenticated user's ID
   * @param footprint - The user's latest carbon footprint data
   * @param selectedStrategyIds - Array of strategy IDs the user has committed to
   * @returns A fully constructed Roadmap with progressive milestones
   *
   * @throws {ValidationError} If no strategies are selected or IDs are invalid
   */
  async generateRoadmap(
    userId: string,
    footprint: CarbonFootprint,
    selectedStrategyIds: string[],
  ): Promise<Roadmap> {
    if (selectedStrategyIds.length === 0) {
      throw new ValidationError('Must select at least one strategy');
    }

    const strategies = DEFAULT_STRATEGIES.filter((s) => selectedStrategyIds.includes(s.id));
    if (strategies.length === 0) {
      throw new ValidationError('No valid strategies found for the given IDs');
    }

    const totalPotentialReduction = strategies.reduce((sum, s) => sum + s.maxReductionKg, 0);

    // Get existing roadmaps for version tracking
    const existingRoadmaps = await this.roadmapRepository.getVersionHistory(userId);
    const nextVersion = existingRoadmaps.length + 1;

    // Delegate to specialized calculators
    const milestones = this.milestoneCalculator.calculateMilestones(totalPotentialReduction);
    const allocations = this.strategyAllocator.allocateStrategies(strategies, milestones.length);

    // Merge allocations into milestones
    const finalMilestones = milestones.map((m, idx) =>
      new Milestone({
        ...m,
        strategies: allocations[idx] ?? [],
      }),
    );

    const roadmap = new Roadmap({
      id: uuidv4(),
      userId,
      milestones: finalMilestones,
      selectedStrategies: selectedStrategyIds,
      baselineFootprint: footprint.total,
      version: nextVersion,
      createdAt: new Date(),
    });

    await this.roadmapRepository.create(roadmap);

    this.logger.info('Roadmap generated', {
      userId,
      strategyCount: selectedStrategyIds.length,
      version: nextVersion,
      totalReduction: totalPotentialReduction,
    });

    return roadmap;
  }

  /**
   * Get the active roadmap for a user.
   */
  async getActiveRoadmap(userId: string): Promise<Roadmap | null> {
    return this.roadmapRepository.getActiveByUserId(userId);
  }

  /**
   * Get version history of roadmaps.
   */
  async getVersionHistory(userId: string): Promise<Roadmap[]> {
    return this.roadmapRepository.getVersionHistory(userId);
  }

  /**
   * Update a milestone's status.
   *
   * @param roadmapId - The roadmap to update
   * @param milestoneId - The specific milestone within the roadmap
   * @param status - The new status to set
   */
  async updateMilestoneStatus(
    roadmapId: string,
    milestoneId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
  ): Promise<void> {
    await this.roadmapRepository.updateMilestoneStatus(roadmapId, milestoneId, status);
    this.logger.info('Milestone status updated', { roadmapId, milestoneId, status });
  }

  /**
   * Get available strategies (all default strategies).
   */
  getAvailableStrategies(): Strategy[] {
    return [...DEFAULT_STRATEGIES];
  }
}

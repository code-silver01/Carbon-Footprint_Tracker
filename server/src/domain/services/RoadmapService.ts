import { IRoadmapRepository } from '../repositories/IRoadmapRepository';

import { Roadmap, Milestone, DifficultyLevel } from '../value-objects/Milestone';
import { CarbonFootprint } from '../entities/CarbonFootprint';
import { ValidationError } from '../errors';
import { ILogger } from './AuthService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Strategy definition — reduction strategies available to users.
 */
export interface Strategy {
  id: string;
  title: string;
  description: string;
  category: string;
  maxReductionKg: number;
  difficulty: DifficultyLevel;
  estimatedMonthlySavings: number;
}

/**
 * Default strategies available in the system.
 */
export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'strat-carpool',
    title: 'Carpool or Ride-Share',
    description: 'Share rides to reduce per-person emissions by up to 50%',
    category: 'transportation',
    maxReductionKg: 50,
    difficulty: 2,
    estimatedMonthlySavings: 80,
  },
  {
    id: 'strat-transit',
    title: 'Switch to Public Transit',
    description: 'Replace car trips with bus or rail for daily commute',
    category: 'transportation',
    maxReductionKg: 80,
    difficulty: 3,
    estimatedMonthlySavings: 120,
  },
  {
    id: 'strat-bike',
    title: 'Bike for Short Trips',
    description: 'Use cycling for trips under 5 miles',
    category: 'transportation',
    maxReductionKg: 30,
    difficulty: 2,
    estimatedMonthlySavings: 40,
  },
  {
    id: 'strat-flights',
    title: 'Reduce Air Travel',
    description: 'Choose virtual meetings or train alternatives when possible',
    category: 'transportation',
    maxReductionKg: 200,
    difficulty: 4,
    estimatedMonthlySavings: 300,
  },
  {
    id: 'strat-renewable',
    title: 'Switch to Renewable Energy',
    description: 'Sign up for a green energy plan or install solar panels',
    category: 'energy',
    maxReductionKg: 100,
    difficulty: 3,
    estimatedMonthlySavings: 50,
  },
  {
    id: 'strat-efficiency',
    title: 'Improve Home Efficiency',
    description: 'LED bulbs, smart thermostat, better insulation',
    category: 'energy',
    maxReductionKg: 40,
    difficulty: 2,
    estimatedMonthlySavings: 30,
  },
  {
    id: 'strat-plant-based',
    title: 'More Plant-Based Meals',
    description: 'Replace 3+ meat meals per week with plant-based alternatives',
    category: 'diet',
    maxReductionKg: 60,
    difficulty: 2,
    estimatedMonthlySavings: 20,
  },
  {
    id: 'strat-local-food',
    title: 'Buy Local & Seasonal',
    description: 'Reduce food miles by shopping at farmers markets',
    category: 'diet',
    maxReductionKg: 25,
    difficulty: 1,
    estimatedMonthlySavings: 10,
  },
  {
    id: 'strat-slow-fashion',
    title: 'Choose Slow Fashion',
    description: 'Buy quality clothing that lasts, avoid fast fashion',
    category: 'shopping',
    maxReductionKg: 35,
    difficulty: 2,
    estimatedMonthlySavings: 50,
  },
  {
    id: 'strat-reduce-buy',
    title: 'Reduce Overall Consumption',
    description: 'Practice mindful purchasing, repair before replacing',
    category: 'shopping',
    maxReductionKg: 45,
    difficulty: 3,
    estimatedMonthlySavings: 100,
  },
];

/**
 * RoadmapService — generates personalized carbon reduction roadmaps.
 *
 * Creates 30/90/365-day plans with milestones, strategy allocation,
 * progressive difficulty, and version tracking.
 */
export class RoadmapService {
  constructor(
    private readonly roadmapRepository: IRoadmapRepository,
    private readonly logger: ILogger,
  ) {}

  /**
   * Generate a new roadmap for a user based on their footprint and chosen strategies.
   */
  async generateRoadmap(
    userId: string,
    footprint: CarbonFootprint,
    selectedStrategyIds: string[],
  ): Promise<Roadmap> {
    // Validate inputs
    if (selectedStrategyIds.length === 0) {
      throw new ValidationError('Must select at least one strategy');
    }

    // Resolve strategies
    const strategies = DEFAULT_STRATEGIES.filter((s) => selectedStrategyIds.includes(s.id));
    if (strategies.length === 0) {
      throw new ValidationError('No valid strategies found for the given IDs');
    }

    const totalPotentialReduction = strategies.reduce((sum, s) => sum + s.maxReductionKg, 0);

    // Get existing roadmaps for version tracking
    const existingRoadmaps = await this.roadmapRepository.getVersionHistory(userId);
    const nextVersion = existingRoadmaps.length + 1;

    // Generate milestones for 30, 90, 365 days
    const milestones = this.calculateMilestones(totalPotentialReduction, strategies);

    const roadmap = new Roadmap({
      id: uuidv4(),
      userId,
      milestones,
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

  /**
   * Calculates milestones for 30, 90, and 365-day periods.
   * Progressively increases difficulty and distributes strategies.
   */
  private calculateMilestones(
    totalReduction: number,
    strategies: Strategy[],
  ): Milestone[] {
    const periods: Array<{
      dayRange: [number, number];
      reductionFraction: number;
      difficulty: DifficultyLevel;
    }> = [
      { dayRange: [1, 30], reductionFraction: 0.2, difficulty: 2 },
      { dayRange: [31, 90], reductionFraction: 0.5, difficulty: 3 },
      { dayRange: [91, 365], reductionFraction: 1.0, difficulty: 4 },
    ];

    return periods.map((period, index) => {
      const reduction = totalReduction * period.reductionFraction;
      const allocatedStrategies = this.distributeStrategies(strategies, index, periods.length);

      return new Milestone({
        id: `milestone-${index + 1}`,
        dayRange: period.dayRange,
        targetReduction: Math.round(reduction * 100) / 100,
        estimatedSavings: Math.round(reduction * 0.14 * 100) / 100,
        difficulty: period.difficulty,
        strategies: allocatedStrategies.map((s) => s.id),
        status: 'pending',
      });
    });
  }

  /**
   * Distributes strategies across milestones evenly.
   */
  private distributeStrategies(
    strategies: Strategy[],
    milestoneIndex: number,
    totalMilestones: number,
  ): Strategy[] {
    const perMilestone = Math.ceil(strategies.length / totalMilestones);
    const start = milestoneIndex * perMilestone;
    const end = Math.min(start + perMilestone, strategies.length);
    return strategies.slice(start, end);
  }
}

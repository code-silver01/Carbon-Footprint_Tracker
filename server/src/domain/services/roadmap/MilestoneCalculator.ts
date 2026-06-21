import { DifficultyLevel, MilestoneProps } from '../../value-objects/Milestone';

const COST_PER_KG_CO2 = 0.14;

/**
 * Period configuration for milestone calculation.
 * Each period defines a time range, the fraction of total reduction to target,
 * and the difficulty level assigned to that period.
 */
interface MilestonePeriod {
  readonly dayRange: [number, number];
  readonly reductionFraction: number;
  readonly difficulty: DifficultyLevel;
}

/**
 * IMilestoneCalculator — interface for milestone computation.
 * Enables dependency injection and testability without full RoadmapService.
 */
export interface IMilestoneCalculator {
  /**
   * Calculates milestone checkpoints for a carbon reduction roadmap.
   *
   * @param totalReduction - Total achievable CO₂ reduction in kg
   * @returns Array of MilestoneProps (without strategies, which are allocated separately)
   */
  calculateMilestones(totalReduction: number): MilestoneProps[];
}

/**
 * MilestoneCalculator — isolates milestone calculation logic.
 *
 * Algorithm:
 * 1. Distribute total achievable reduction across 3 time periods (30/90/365 days)
 * 2. Apply progressive difficulty scaling (easy → hard)
 * 3. Estimate monetary savings per milestone at $0.14/kg CO₂
 *
 * Single Responsibility: compute milestones for a roadmap.
 * Testable without the full RoadmapService.
 *
 * @example
 * ```typescript
 * const calculator = new MilestoneCalculator();
 * const milestones = calculator.calculateMilestones(150); // 150 kg CO₂
 * // Returns: [30-day easy, 90-day medium, 365-day hard]
 * ```
 */
export class MilestoneCalculator implements IMilestoneCalculator {
  /**
   * Progressive milestone periods with increasing difficulty.
   * - 30 days: 20% of total reduction (warm-up)
   * - 90 days: 50% of total reduction (building habits)
   * - 365 days: 100% of total reduction (long-term commitment)
   */
  private static readonly PERIODS: readonly MilestonePeriod[] = Object.freeze([
    { dayRange: [1, 30] as [number, number], reductionFraction: 0.2, difficulty: 2 as DifficultyLevel },
    { dayRange: [31, 90] as [number, number], reductionFraction: 0.5, difficulty: 3 as DifficultyLevel },
    { dayRange: [91, 365] as [number, number], reductionFraction: 1.0, difficulty: 4 as DifficultyLevel },
  ]);



  /**
   * Calculates progressive milestone checkpoints for a carbon reduction roadmap.
   * Distributes the total achievable reduction across predefined time periods (e.g., 30/90/365 days),
   * applying increasing difficulty and estimating monetary savings per milestone.
   *
   * @param totalReduction - The total achievable CO₂ reduction in kg.
   * @returns An array of MilestoneProps objects representing each milestone checkpoint.
   */
  calculateMilestones(totalReduction: number): MilestoneProps[] {
    return MilestoneCalculator.PERIODS.map((period, index) => {
      const reduction = totalReduction * period.reductionFraction;

      return {
        id: `milestone-${index + 1}`,
        dayRange: period.dayRange,
        targetReduction: Math.round(reduction * 100) / 100,
        estimatedSavings: Math.round(reduction * COST_PER_KG_CO2 * 100) / 100,
        difficulty: period.difficulty,
        strategies: [], // Populated by StrategyAllocator
        status: 'pending' as const,
      };
    });
  }
}

import { Strategy } from './strategies';

/**
 * IStrategyAllocator — distributes strategies across milestones.
 * Enables dependency injection and testability.
 */
export interface IStrategyAllocator {
  /**
   * Distributes strategies evenly across milestones.
   * Earlier milestones receive easier strategies; later milestones receive harder ones.
   *
   * @param strategies - The resolved Strategy objects to distribute
   * @param milestoneCount - Number of milestones to distribute across
   * @returns A 2D array where each inner array contains strategy IDs for that milestone
   */
  allocateStrategies(strategies: Strategy[], milestoneCount: number): string[][];
}

/**
 * StrategyAllocator — distributes strategies across milestones.
 *
 * Handles allocation logic separately from milestone calculation.
 * Sorts strategies by difficulty and distributes them so that
 * earlier milestones get easier strategies and later milestones get harder ones.
 *
 * @example
 * ```typescript
 * const allocator = new StrategyAllocator();
 * const allocations = allocator.allocateStrategies(strategies, 3);
 * // allocations[0] = ['strat-local-food'] (easy, for 30-day milestone)
 * // allocations[2] = ['strat-flights']    (hard, for 365-day milestone)
 * ```
 */
export class StrategyAllocator implements IStrategyAllocator {
  allocateStrategies(strategies: Strategy[], milestoneCount: number): string[][] {
    if (milestoneCount === 0 || strategies.length === 0) {
      return Array.from({ length: milestoneCount }, () => []);
    }

    // Sort strategies by difficulty (ascending) so easier strategies come first
    const sorted = [...strategies].sort((a, b) => a.difficulty - b.difficulty);

    // Initialize empty allocation buckets
    const allocations: string[][] = Array.from({ length: milestoneCount }, () => []);

    // Distribute strategies round-robin across milestones
    const perMilestone = Math.ceil(sorted.length / milestoneCount);
    sorted.forEach((strategy, idx) => {
      const milestoneIdx = Math.min(
        Math.floor(idx / perMilestone),
        milestoneCount - 1,
      );
      allocations[milestoneIdx].push(strategy.id);
    });

    return allocations;
  }
}

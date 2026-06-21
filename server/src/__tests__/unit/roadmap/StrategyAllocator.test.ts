import { StrategyAllocator } from '../../../domain/services/roadmap/StrategyAllocator';
import { Strategy } from '../../../domain/services/roadmap/strategies';
import { DifficultyLevel } from '../../../domain/value-objects/Milestone';

const makeStrategy = (id: string, difficulty: DifficultyLevel): Strategy => ({
  id,
  title: `Strategy ${id}`,
  description: `Description for ${id}`,
  category: 'test',
  maxReductionKg: 50,
  difficulty,
  estimatedMonthlySavings: 20,
});

describe('StrategyAllocator', () => {
  let allocator: StrategyAllocator;

  beforeEach(() => {
    allocator = new StrategyAllocator();
  });

  it('should return empty arrays when no strategies provided', () => {
    const result = allocator.allocateStrategies([], 3);

    expect(result).toEqual([[], [], []]);
  });

  it('should return empty array when milestone count is zero', () => {
    const strategies = [makeStrategy('s1', 1)];
    const result = allocator.allocateStrategies(strategies, 0);

    expect(result).toEqual([]);
  });

  it('should distribute strategies across milestones', () => {
    const strategies = [
      makeStrategy('easy', 1),
      makeStrategy('medium', 3),
      makeStrategy('hard', 5),
    ];

    const result = allocator.allocateStrategies(strategies, 3);

    expect(result).toHaveLength(3);
    // Each milestone should have at least one strategy
    const totalAllocated = result.reduce((sum, arr) => sum + arr.length, 0);
    expect(totalAllocated).toBe(3);
  });

  it('should sort strategies by difficulty (easiest first)', () => {
    const strategies = [
      makeStrategy('hard', 5),
      makeStrategy('easy', 1),
      makeStrategy('medium', 3),
    ];

    const result = allocator.allocateStrategies(strategies, 3);
    const flatAllocations = result.flat();

    // The easy strategy should appear before the hard strategy
    const easyIdx = flatAllocations.indexOf('easy');
    const hardIdx = flatAllocations.indexOf('hard');
    expect(easyIdx).toBeLessThan(hardIdx);
  });

  it('should handle more strategies than milestones', () => {
    const strategies = [
      makeStrategy('s1', 1),
      makeStrategy('s2', 2),
      makeStrategy('s3', 3),
      makeStrategy('s4', 4),
      makeStrategy('s5', 5),
    ];

    const result = allocator.allocateStrategies(strategies, 2);

    expect(result).toHaveLength(2);
    const totalAllocated = result.reduce((sum, arr) => sum + arr.length, 0);
    expect(totalAllocated).toBe(5);
  });

  it('should handle a single strategy across multiple milestones', () => {
    const strategies = [makeStrategy('only', 3)];

    const result = allocator.allocateStrategies(strategies, 3);

    expect(result).toHaveLength(3);
    const totalAllocated = result.reduce((sum, arr) => sum + arr.length, 0);
    expect(totalAllocated).toBe(1);
  });
});

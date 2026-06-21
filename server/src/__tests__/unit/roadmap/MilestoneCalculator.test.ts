import { MilestoneCalculator } from '../../../domain/services/roadmap/MilestoneCalculator';

describe('MilestoneCalculator', () => {
  let calculator: MilestoneCalculator;

  beforeEach(() => {
    calculator = new MilestoneCalculator();
  });

  it('should create exactly 3 milestones with progressive difficulty', () => {
    const milestones = calculator.calculateMilestones(100);

    expect(milestones).toHaveLength(3);
    expect(milestones[0].difficulty).toBe(2);
    expect(milestones[1].difficulty).toBe(3);
    expect(milestones[2].difficulty).toBe(4);
  });

  it('should create progressive day ranges (30/90/365)', () => {
    const milestones = calculator.calculateMilestones(100);

    expect(milestones[0].dayRange).toEqual([1, 30]);
    expect(milestones[1].dayRange).toEqual([31, 90]);
    expect(milestones[2].dayRange).toEqual([91, 365]);
  });

  it('should calculate correct reduction fractions (20%/50%/100%)', () => {
    const total = 200;
    const milestones = calculator.calculateMilestones(total);

    expect(milestones[0].targetReduction).toBe(40);   // 200 * 0.2
    expect(milestones[1].targetReduction).toBe(100);   // 200 * 0.5
    expect(milestones[2].targetReduction).toBe(200);   // 200 * 1.0
  });

  it('should calculate estimated savings at $0.14/kg CO₂', () => {
    const milestones = calculator.calculateMilestones(100);

    // 100 * 0.2 * 0.14 = 2.80
    expect(milestones[0].estimatedSavings).toBe(2.8);
    // 100 * 0.5 * 0.14 = 7.00
    expect(milestones[1].estimatedSavings).toBe(7);
    // 100 * 1.0 * 0.14 = 14.00
    expect(milestones[2].estimatedSavings).toBe(14);
  });

  it('should handle zero total reduction without errors', () => {
    const milestones = calculator.calculateMilestones(0);

    expect(milestones).toHaveLength(3);
    milestones.forEach(m => {
      expect(m.targetReduction).toBe(0);
      expect(m.estimatedSavings).toBe(0);
    });
  });

  it('should handle very small values with proper rounding', () => {
    const milestones = calculator.calculateMilestones(0.001);

    milestones.forEach(m => {
      expect(Number.isFinite(m.targetReduction)).toBe(true);
      expect(Number.isFinite(m.estimatedSavings)).toBe(true);
    });
  });

  it('should handle very large values without overflow', () => {
    const milestones = calculator.calculateMilestones(1_000_000);

    milestones.forEach(m => {
      expect(Number.isFinite(m.targetReduction)).toBe(true);
      expect(m.targetReduction).toBeGreaterThanOrEqual(0);
    });
  });

  it('should set all milestones to pending status initially', () => {
    const milestones = calculator.calculateMilestones(150);

    milestones.forEach(m => {
      expect(m.status).toBe('pending');
    });
  });

  it('should leave strategies array empty (populated by StrategyAllocator)', () => {
    const milestones = calculator.calculateMilestones(100);

    milestones.forEach(m => {
      expect(m.strategies).toEqual([]);
    });
  });
});

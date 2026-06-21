import { ProgressTracker } from '../../domain/services/ProgressTracker';
import { IFootprintRepository } from '../../domain/repositories/IFootprintRepository';
import { IProgressRepository, MonthlyProgress } from '../../domain/repositories/IProgressRepository';
import { CarbonFootprint } from '../../domain/entities/CarbonFootprint';
import { ILogger } from '../../domain/services/AuthService';

function createMockFootprintRepo(): jest.Mocked<IFootprintRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    getByUserId: jest.fn().mockResolvedValue([]),
    getMonthlyFootprints: jest.fn().mockResolvedValue([]),
    getLatest: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockProgressRepo(): jest.Mocked<IProgressRepository> {
  return {
    getMonthlyProgress: jest.fn().mockResolvedValue([]),
    upsertMonthlyProgress: jest.fn().mockResolvedValue(undefined),
    getLeaderboard: jest.fn().mockResolvedValue([]),
    getUserRank: jest.fn().mockResolvedValue(1),
  };
}

function createMockLogger(): jest.Mocked<ILogger> {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

function createFootprint(total: number, month: string): CarbonFootprint {
  return new CarbonFootprint({
    id: `fp-${month}`,
    userId: 'user-123',
    input: {
      transportation: { carMiles: 100, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
      energy: { electricityKwh: 100, renewablePercentage: 0 },
      dietType: 'mixed',
      shopping: { monthlySpend: 100, fastFashionFrequency: 0 },
    },
    breakdown: {
      transportation: total * 0.4,
      energy: total * 0.3,
      diet: total * 0.2,
      shopping: total * 0.1,
    },
    total,
    calculatedAt: new Date(`${month}-15`),
    month,
  });
}

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  let footprintRepo: jest.Mocked<IFootprintRepository>;
  let progressRepo: jest.Mocked<IProgressRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    footprintRepo = createMockFootprintRepo();
    progressRepo = createMockProgressRepo();
    logger = createMockLogger();
    tracker = new ProgressTracker(footprintRepo, progressRepo, logger);
  });

  describe('calculateSustainabilityScore', () => {
    it('should return 100 for very low emissions (below perfect threshold)', () => {
      const footprints = [createFootprint(50, '2024-01')]; // Below 83 kg threshold
      const score = tracker.calculateSustainabilityScore(footprints);
      expect(score).toBe(100);
    });

    it('should return 0 for very high emissions (double global average)', () => {
      const footprints = [createFootprint(700, '2024-01')]; // Above 666 (333*2)
      const score = tracker.calculateSustainabilityScore(footprints);
      expect(score).toBe(0);
    });

    it('should return ~50 for global average emissions', () => {
      const footprints = [createFootprint(333, '2024-01')]; // Global average
      const score = tracker.calculateSustainabilityScore(footprints);
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(60);
    });

    it('should return 50 when no data available', () => {
      const score = tracker.calculateSustainabilityScore([]);
      expect(score).toBe(50);
    });

    it('should use the most recent footprint', () => {
      const footprints = [
        createFootprint(50, '2024-03'), // Most recent (first in array)
        createFootprint(500, '2024-02'),
        createFootprint(600, '2024-01'),
      ];
      const score = tracker.calculateSustainabilityScore(footprints);
      expect(score).toBe(100); // Based on 50 kg
    });
  });

  describe('calculateTrend', () => {
    it('should return "improving" when emissions decrease', () => {
      const progress: MonthlyProgress[] = [
        { userId: 'u1', month: '2024-03', totalEmissions: 200, savings: 133, sustainabilityScore: 70, updatedAt: new Date() },
        { userId: 'u1', month: '2024-02', totalEmissions: 250, savings: 83, sustainabilityScore: 60, updatedAt: new Date() },
        { userId: 'u1', month: '2024-01', totalEmissions: 300, savings: 33, sustainabilityScore: 50, updatedAt: new Date() },
      ];
      const trend = tracker.calculateTrend(progress);
      expect(trend).toBe('improving');
    });

    it('should return "declining" when emissions increase', () => {
      const progress: MonthlyProgress[] = [
        { userId: 'u1', month: '2024-03', totalEmissions: 400, savings: 0, sustainabilityScore: 30, updatedAt: new Date() },
        { userId: 'u1', month: '2024-02', totalEmissions: 350, savings: 0, sustainabilityScore: 40, updatedAt: new Date() },
        { userId: 'u1', month: '2024-01', totalEmissions: 300, savings: 33, sustainabilityScore: 50, updatedAt: new Date() },
      ];
      const trend = tracker.calculateTrend(progress);
      expect(trend).toBe('declining');
    });

    it('should return "stable" when emissions stay similar', () => {
      const progress: MonthlyProgress[] = [
        { userId: 'u1', month: '2024-03', totalEmissions: 300, savings: 33, sustainabilityScore: 50, updatedAt: new Date() },
        { userId: 'u1', month: '2024-02', totalEmissions: 305, savings: 28, sustainabilityScore: 49, updatedAt: new Date() },
        { userId: 'u1', month: '2024-01', totalEmissions: 302, savings: 31, sustainabilityScore: 50, updatedAt: new Date() },
      ];
      const trend = tracker.calculateTrend(progress);
      expect(trend).toBe('stable');
    });

    it('should return "stable" with insufficient data', () => {
      const trend = tracker.calculateTrend([]);
      expect(trend).toBe('stable');
    });
  });

  describe('updateProgress', () => {
    it('should upsert monthly progress', async () => {
      const footprint = createFootprint(250, '2024-01');
      await tracker.updateProgress('user-123', footprint);

      expect(progressRepo.upsertMonthlyProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          month: '2024-01',
          totalEmissions: 250,
          savings: 83, // 333 - 250
        }),
      );
    });

    it('should not report negative savings', async () => {
      const footprint = createFootprint(500, '2024-01'); // Above average
      await tracker.updateProgress('user-123', footprint);

      expect(progressRepo.upsertMonthlyProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          savings: 0, // Max(0, 333-500) = 0
        }),
      );
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
      footprintRepo.getMonthlyFootprints.mockResolvedValue([createFootprint(250, '2024-01')]);
      progressRepo.getMonthlyProgress.mockResolvedValue([
        { userId: 'u1', month: '2024-01', totalEmissions: 250, savings: 83, sustainabilityScore: 70, updatedAt: new Date() },
      ]);
      progressRepo.getLeaderboard.mockResolvedValue([
        { userId: 'u1', displayName: 'Test', monthlyReduction: 83, rank: 1 },
      ]);
      progressRepo.getUserRank.mockResolvedValue(1);

      const dashboard = await tracker.getDashboardData('user-123');

      expect(dashboard).toHaveProperty('monthlyProgress');
      expect(dashboard).toHaveProperty('currentMonthSavings');
      expect(dashboard).toHaveProperty('cumulativeSavings');
      expect(dashboard).toHaveProperty('sustainabilityScore');
      expect(dashboard).toHaveProperty('leaderboard');
      expect(dashboard).toHaveProperty('userRank');
      expect(dashboard).toHaveProperty('trend');
    });
  });
});

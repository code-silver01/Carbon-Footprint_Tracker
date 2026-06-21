import { RoadmapService, MilestoneCalculator, StrategyAllocator, DEFAULT_STRATEGIES } from '../../../domain/services/roadmap';
import { IRoadmapRepository } from '../../../domain/repositories/IRoadmapRepository';
import { CarbonFootprint } from '../../../domain/entities/CarbonFootprint';
import { ValidationError } from '../../../domain/errors';
import { ILogger } from '../../../domain/services/AuthService';

function createMockRoadmapRepo(): jest.Mocked<IRoadmapRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    getActiveByUserId: jest.fn().mockResolvedValue(null),
    getVersionHistory: jest.fn().mockResolvedValue([]),
    updateMilestoneStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger(): jest.Mocked<ILogger> {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

function createTestFootprint(): CarbonFootprint {
  return new CarbonFootprint({
    id: 'fp-123',
    userId: 'user-123',
    input: {
      transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
      energy: { electricityKwh: 300, renewablePercentage: 0 },
      dietType: 'mixed',
      shopping: { monthlySpend: 500, fastFashionFrequency: 2 },
    },
    breakdown: { transportation: 205.5, energy: 114, diet: 183.33, shopping: 50 },
    total: 552.83,
    calculatedAt: new Date(),
    month: '2024-01',
  });
}

describe('RoadmapService', () => {
  let service: RoadmapService;
  let roadmapRepo: jest.Mocked<IRoadmapRepository>;
  let logger: jest.Mocked<ILogger>;
  let footprint: CarbonFootprint;

  beforeEach(() => {
    roadmapRepo = createMockRoadmapRepo();
    logger = createMockLogger();
    service = new RoadmapService(roadmapRepo, new MilestoneCalculator(), new StrategyAllocator(), logger);
    footprint = createTestFootprint();
  });

  describe('generateRoadmap', () => {
    it('should throw error if no strategies selected', async () => {
      await expect(service.generateRoadmap('user-123', footprint, [])).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw error for invalid strategy IDs', async () => {
      await expect(
        service.generateRoadmap('user-123', footprint, ['invalid-id']),
      ).rejects.toThrow(ValidationError);
    });

    it('should generate roadmap with 3 milestones', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      expect(roadmap.milestones).toHaveLength(3);
    });

    it('should set difficulty levels progressively', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 6).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      expect(roadmap.milestones[0].difficulty).toBe(2);
      expect(roadmap.milestones[1].difficulty).toBe(3);
      expect(roadmap.milestones[2].difficulty).toBe(4);
    });

    it('should set correct day ranges', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      expect(roadmap.milestones[0].dayRange).toEqual([1, 30]);
      expect(roadmap.milestones[1].dayRange).toEqual([31, 90]);
      expect(roadmap.milestones[2].dayRange).toEqual([91, 365]);
    });

    it('should distribute strategies across milestones', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 6).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      // Each milestone should have at least some strategies
      roadmap.milestones.forEach((milestone) => {
        expect(milestone.strategies.length).toBeGreaterThan(0);
      });

      // Total distributed should equal selected
      const totalDistributed = roadmap.milestones.reduce(
        (sum, m) => sum + m.strategies.length,
        0,
      );
      expect(totalDistributed).toBe(6);
    });

    it('should store roadmap in repository', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      await service.generateRoadmap('user-123', footprint, strategyIds);

      expect(roadmapRepo.create).toHaveBeenCalled();
    });

    it('should track version number', async () => {
      // Simulate existing roadmaps
      roadmapRepo.getVersionHistory.mockResolvedValue([{} as any, {} as any]);

      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      expect(roadmap.version).toBe(3); // 2 existing + 1 new
    });

    it('should calculate progressive reduction targets', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      // Each subsequent milestone should have higher or equal reduction
      for (let i = 1; i < roadmap.milestones.length; i++) {
        expect(roadmap.milestones[i].targetReduction).toBeGreaterThanOrEqual(
          roadmap.milestones[i - 1].targetReduction,
        );
      }
    });

    it('should set all milestones to pending status initially', async () => {
      const strategyIds = DEFAULT_STRATEGIES.slice(0, 3).map((s) => s.id);
      const roadmap = await service.generateRoadmap('user-123', footprint, strategyIds);

      roadmap.milestones.forEach((milestone) => {
        expect(milestone.status).toBe('pending');
      });
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return all default strategies', () => {
      const strategies = service.getAvailableStrategies();
      expect(strategies.length).toBe(DEFAULT_STRATEGIES.length);
    });

    it('should return a copy (not a reference)', () => {
      const strategies1 = service.getAvailableStrategies();
      const strategies2 = service.getAvailableStrategies();
      expect(strategies1).not.toBe(strategies2);
    });
  });

  describe('updateMilestoneStatus', () => {
    it('should delegate to repository', async () => {
      await service.updateMilestoneStatus('roadmap-1', 'milestone-1', 'completed');

      expect(roadmapRepo.updateMilestoneStatus).toHaveBeenCalledWith(
        'roadmap-1',
        'milestone-1',
        'completed',
      );
    });

    it('should log the update', async () => {
      await service.updateMilestoneStatus('roadmap-1', 'milestone-1', 'in_progress');

      expect(logger.info).toHaveBeenCalledWith(
        'Milestone status updated',
        expect.objectContaining({
          roadmapId: 'roadmap-1',
          milestoneId: 'milestone-1',
          status: 'in_progress',
        }),
      );
    });
  });
});

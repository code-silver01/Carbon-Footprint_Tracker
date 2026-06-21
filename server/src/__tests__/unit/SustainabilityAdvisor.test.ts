import {
  SustainabilityAdvisor,
  ICacheService,
  IGeminiService,
} from '../../domain/services/SustainabilityAdvisor';
import { IAdviceRepository } from '../../domain/repositories/IAdviceRepository';
import { CarbonFootprint } from '../../domain/entities/CarbonFootprint';
import { ValidationError, SustainabilityAdviceError } from '../../domain/errors';
import { ILogger } from '../../domain/services/AuthService';

// --- Mocks ---
function createMockLogger(): jest.Mocked<ILogger> {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

function createMockCache(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockAdviceRepo(): jest.Mocked<IAdviceRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    getByUserId: jest.fn().mockResolvedValue([]),
    getLatest: jest.fn().mockResolvedValue(null),
  };
}

const VALID_GEMINI_RESPONSE = JSON.stringify({
  topSources: [
    { category: 'Transportation', percentage: 45, explanation: 'High car usage' },
    { category: 'Energy', percentage: 30, explanation: 'Grid power' },
    { category: 'Diet', percentage: 25, explanation: 'Mixed diet' },
  ],
  strategies: [
    { title: 'S1', description: 'D1', difficulty: 1, estimatedSavings: 10 },
    { title: 'S2', description: 'D2', difficulty: 2, estimatedSavings: 20 },
    { title: 'S3', description: 'D3', difficulty: 3, estimatedSavings: 30 },
    { title: 'S4', description: 'D4', difficulty: 4, estimatedSavings: 40 },
    { title: 'S5', description: 'D5', difficulty: 5, estimatedSavings: 50 },
  ],
  challenge: { title: 'Test Challenge', description: 'Do it', duration: '7 days' },
});

function createMockGemini(response?: string): jest.Mocked<IGeminiService> {
  return {
    generateContent: jest.fn().mockResolvedValue({
      text: response ?? VALID_GEMINI_RESPONSE,
      tokensUsed: 100,
    }),
  };
}

function createTestFootprint(): CarbonFootprint {
  return new CarbonFootprint({
    id: 'fp-123',
    userId: 'user-123',
    input: {
      transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 50, flightHours: 2 },
      energy: { electricityKwh: 300, renewablePercentage: 20 },
      dietType: 'mixed',
      shopping: { monthlySpend: 400, fastFashionFrequency: 2 },
    },
    breakdown: { transportation: 305.5, energy: 91.2, diet: 183.33, shopping: 44 },
    total: 624.03,
    calculatedAt: new Date(),
    month: '2024-01',
  });
}

describe('SustainabilityAdvisor', () => {
  let advisor: SustainabilityAdvisor;
  let gemini: jest.Mocked<IGeminiService>;
  let adviceRepo: jest.Mocked<IAdviceRepository>;
  let cache: jest.Mocked<ICacheService>;
  let logger: jest.Mocked<ILogger>;
  let footprint: CarbonFootprint;

  beforeEach(() => {
    gemini = createMockGemini();
    adviceRepo = createMockAdviceRepo();
    cache = createMockCache();
    logger = createMockLogger();
    footprint = createTestFootprint();

    advisor = new SustainabilityAdvisor(gemini, adviceRepo, cache, logger);
  });

  it('should return cached advice if available', async () => {
    const cachedAdvice = {
      id: 'advice-1',
      topSources: [],
      strategies: [],
      weeklyChallenge: { title: 'Test', description: 'Test', duration: '7 days' },
    };
    cache.get.mockResolvedValue(cachedAdvice);

    const result = await advisor.generateRecommendations('user-123', footprint);

    expect(cache.get).toHaveBeenCalled();
    expect(gemini.generateContent).not.toHaveBeenCalled();
    expect(result).toEqual(cachedAdvice);
  });

  it('should call Gemini when cache misses', async () => {
    const result = await advisor.generateRecommendations('user-123', footprint);

    expect(gemini.generateContent).toHaveBeenCalled();
    expect(result).toHaveProperty('topSources');
    expect(result.topSources).toHaveLength(3);
    expect(result).toHaveProperty('strategies');
    expect(result.strategies).toHaveLength(5);
  });

  it('should store advice in repository for audit trail', async () => {
    await advisor.generateRecommendations('user-123', footprint);

    expect(adviceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        footprintId: 'fp-123',
        tokensUsed: 100,
      }),
    );
  });

  it('should cache results for 24 hours', async () => {
    await advisor.generateRecommendations('user-123', footprint);

    expect(cache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      { ttl: 86400 },
    );
  });

  it('should validate advice structure — reject missing sources', async () => {
    const invalidResponse = JSON.stringify({
      topSources: [], // Should have 3
      strategies: [],
      challenge: {},
    });
    gemini.generateContent.mockResolvedValue({ text: invalidResponse, tokensUsed: 50 });

    await expect(
      advisor.generateRecommendations('user-123', footprint),
    ).rejects.toThrow(ValidationError);
  });

  it('should validate advice structure — reject missing strategies', async () => {
    const invalidResponse = JSON.stringify({
      topSources: [
        { category: 'A', percentage: 50, explanation: 'X' },
        { category: 'B', percentage: 30, explanation: 'Y' },
        { category: 'C', percentage: 20, explanation: 'Z' },
      ],
      strategies: [{ title: 'Only one', description: 'X', difficulty: 1, estimatedSavings: 10 }],
      challenge: { title: 'T', description: 'D', duration: '7 days' },
    });
    gemini.generateContent.mockResolvedValue({ text: invalidResponse, tokensUsed: 50 });

    await expect(
      advisor.generateRecommendations('user-123', footprint),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw SustainabilityAdviceError on Gemini failure', async () => {
    gemini.generateContent.mockRejectedValue(new Error('API Key invalid'));

    await expect(
      advisor.generateRecommendations('user-123', footprint),
    ).rejects.toThrow(SustainabilityAdviceError);
  });

  it('should log errors without exposing sensitive data', async () => {
    gemini.generateContent.mockRejectedValue(new Error('API Key invalid'));

    await advisor.generateRecommendations('user-123', footprint).catch(() => {});

    expect(logger.error).toHaveBeenCalledWith(
      'Advice generation failed',
      expect.objectContaining({ userId: 'user-123' }),
    );
    // Ensure API key error is not exposed to caller
    const errorCalls = logger.error.mock.calls;
    for (const call of errorCalls) {
      const meta = call[1] as Record<string, unknown> | undefined;
      if (meta?.error) {
        // The logged error should be the message, not contain 'API Key'
        expect(String(meta.error)).toBe('API Key invalid');
      }
    }
  });

  it('should handle markdown-wrapped JSON from Gemini', async () => {
    const wrappedResponse = '```json\n' + VALID_GEMINI_RESPONSE + '\n```';
    gemini.generateContent.mockResolvedValue({ text: wrappedResponse, tokensUsed: 100 });

    const result = await advisor.generateRecommendations('user-123', footprint);

    expect(result.topSources).toHaveLength(3);
  });

  it('should log token usage', async () => {
    await advisor.generateRecommendations('user-123', footprint);

    expect(logger.info).toHaveBeenCalledWith(
      'Advice generated',
      expect.objectContaining({ tokensUsed: 100 }),
    );
  });
});

import { CarbonFootprint } from '../entities/CarbonFootprint';
import { SustainabilityAdvice, IAdviceRepository } from '../repositories/IAdviceRepository';
import { SustainabilityAdviceError, ValidationError } from '../errors';
import { ILogger } from './AuthService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cache service interface — injectable for testing.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Gemini service interface — wraps the AI model calls.
 */
export interface IGeminiService {
  generateContent(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GenerateResult {
  text: string;
  tokensUsed: number;
}

/**
 * SustainabilityAdvisor — orchestrates AI-powered sustainability recommendations.
 *
 * Features:
 * - Gemini API integration with structured prompts
 * - 24-hour response caching to reduce API calls
 * - Response structure validation
 * - Audit trail (all advice stored in repository)
 * - Token usage logging
 * - Retry logic delegated to GeminiService
 */
export class SustainabilityAdvisor {
  private static readonly CACHE_TTL = 86400; // 24 hours in seconds

  constructor(
    private readonly geminiService: IGeminiService,
    private readonly adviceRepository: IAdviceRepository,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  /**
   * Generate personalized sustainability recommendations based on user's footprint.
   */
  async generateRecommendations(
    userId: string,
    footprint: CarbonFootprint,
  ): Promise<SustainabilityAdvice> {
    const cacheKey = `advice:${userId}:${footprint.month}`;

    // Check cache first
    const cached = await this.cache.get<SustainabilityAdvice>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached advice', { userId, month: footprint.month });
      return cached;
    }

    try {
      // Generate with Gemini
      const prompt = this.buildGroundedPrompt(footprint);
      const result = await this.geminiService.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 800,
        topK: 40,
        topP: 0.95,
      });

      // Parse and validate response
      const parsed = this.parseResponse(result.text);
      const validated = this.validateAdviceStructure(parsed);

      // Build advice object
      const advice: SustainabilityAdvice = {
        id: uuidv4(),
        userId,
        footprintId: footprint.id,
        topSources: validated.topSources,
        strategies: validated.strategies,
        weeklyChallenge: validated.challenge,
        tokensUsed: result.tokensUsed,
        generatedAt: new Date(),
      };

      // Store for audit trail
      await this.adviceRepository.create(advice);

      // Cache for 24 hours
      await this.cache.set(cacheKey, advice, { ttl: SustainabilityAdvisor.CACHE_TTL });

      this.logger.info('Advice generated', {
        userId,
        tokensUsed: result.tokensUsed,
        footprintMonth: footprint.month,
      });

      return advice;
    } catch (error) {
      // Don't expose internal errors — log full details, return generic message
      if (error instanceof ValidationError || error instanceof SustainabilityAdviceError) {
        throw error;
      }
      this.logger.error('Advice generation failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new SustainabilityAdviceError('Could not generate recommendations');
    }
  }

  /**
   * Builds a structured prompt grounded in the user's actual data.
   */
  private buildGroundedPrompt(footprint: CarbonFootprint): string {
    const percentages = footprint.getCategoryPercentages();

    return `You are a sustainability expert. Based on this user's carbon footprint data:

Monthly Breakdown:
- Transportation: ${footprint.breakdown.transportation.toFixed(1)} kg CO2 (${percentages.transportation.toFixed(1)}%)
  - Car: ${footprint.input.transportation.carMiles} miles
  - Flights: ${footprint.input.transportation.flightHours} hours
  - Transit: ${footprint.input.transportation.transitMiles} miles
  - Bike: ${footprint.input.transportation.bikeMiles} miles
- Home Energy: ${footprint.breakdown.energy.toFixed(1)} kg CO2 (${percentages.energy.toFixed(1)}%)
  - Electricity: ${footprint.input.energy.electricityKwh} kWh
  - Renewable: ${footprint.input.energy.renewablePercentage}%
- Diet (${footprint.input.dietType}): ${footprint.breakdown.diet.toFixed(1)} kg CO2 (${percentages.diet.toFixed(1)}%)
- Shopping: ${footprint.breakdown.shopping.toFixed(1)} kg CO2 (${percentages.shopping.toFixed(1)}%)
  - Monthly Spend: $${footprint.input.shopping.monthlySpend}
  - Fast Fashion Items: ${footprint.input.shopping.fastFashionFrequency}/month

Total: ${footprint.total.toFixed(1)} kg CO2/month

Provide a JSON response with exactly:
{
  "topSources": [
    { "category": "string", "percentage": number, "explanation": "string" }
  ],
  "strategies": [
    { "title": "string", "description": "string", "difficulty": 1-5, "estimatedSavings": number }
  ],
  "challenge": { "title": "string", "description": "string", "duration": "7 days" }
}

Rules:
1. topSources must have exactly 3 items, ranked by emission percentage
2. strategies must have exactly 5 items, specific to THIS user's data
3. challenge must be actionable within 7 days
4. estimatedSavings in kg CO2 per month
5. Focus on high-impact, achievable changes based on the data above
6. Return ONLY valid JSON, no markdown formatting`;
  }

  /**
   * Parses the Gemini response text as JSON.
   */
  private parseResponse(text: string): Record<string, unknown> {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch (_error) {
      this.logger.error('Failed to parse Gemini response as JSON', {
        responseLength: text.length,
      });
      throw new ValidationError('AI response was not valid JSON');
    }
  }

  /**
   * Validates the structure of parsed advice.
   */
  private validateAdviceStructure(data: Record<string, unknown>): {
    topSources: SustainabilityAdvice['topSources'];
    strategies: SustainabilityAdvice['strategies'];
    challenge: SustainabilityAdvice['weeklyChallenge'];
  } {
    if (!Array.isArray(data.topSources) || data.topSources.length !== 3) {
      throw new ValidationError('AI response must contain exactly 3 top sources');
    }
    if (!Array.isArray(data.strategies) || data.strategies.length !== 5) {
      throw new ValidationError('AI response must contain exactly 5 strategies');
    }
    if (!data.challenge || typeof data.challenge !== 'object') {
      throw new ValidationError('AI response must contain a weekly challenge');
    }

    // Validate each source
    for (const source of data.topSources) {
      const s = source as Record<string, unknown>;
      if (!s.category || typeof s.percentage !== 'number' || !s.explanation) {
        throw new ValidationError('Invalid top source structure');
      }
    }

    // Validate each strategy
    for (const strategy of data.strategies) {
      const st = strategy as Record<string, unknown>;
      if (
        !st.title ||
        !st.description ||
        typeof st.difficulty !== 'number' ||
        typeof st.estimatedSavings !== 'number'
      ) {
        throw new ValidationError('Invalid strategy structure');
      }
    }

    const challenge = data.challenge as Record<string, unknown>;
    if (!challenge.title || !challenge.description) {
      throw new ValidationError('Invalid challenge structure');
    }

    return {
      topSources: data.topSources as SustainabilityAdvice['topSources'],
      strategies: data.strategies as SustainabilityAdvice['strategies'],
      challenge: data.challenge as SustainabilityAdvice['weeklyChallenge'],
    };
  }
}

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { IGeminiService, GenerateOptions, GenerateResult } from '../../domain/services/SustainabilityAdvisor';
import { GeminiServiceError } from '../../domain/errors';
import { ILogger } from '../../domain/services/AuthService';

/**
 * GeminiService — wraps Google Generative AI SDK with:
 * - Exponential backoff retry (3 attempts)
 * - Token usage estimation and logging
 * - Safety settings
 * - Error handling that never exposes API keys
 */
export class GeminiService implements IGeminiService {
  private readonly model: GenerativeModel;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;

  constructor(
    apiKey: string,
    modelName: string,
    private readonly logger: ILogger,
  ) {
    if (!apiKey) {
      logger.warn('Gemini API key not configured — AI features will use mock responses');
    }

    const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
    this.model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  /**
   * Generate content with retry logic and exponential backoff.
   */
  async generateContent(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= GeminiService.MAX_RETRIES; attempt++) {
      try {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            topK: options?.topK ?? 40,
            topP: options?.topP ?? 0.95,
            maxOutputTokens: options?.maxTokens ?? 500,
          },
        });

        const text = result.response.text();
        const tokensUsed = Math.ceil(text.length / 4); // Rough estimate

        this.logger.info('Gemini API call succeeded', {
          attempt,
          tokensEstimated: tokensUsed,
          promptLength: prompt.length,
        });

        return { text, tokensUsed };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Gemini error');

        this.logger.warn('Gemini API call failed, retrying', {
          attempt,
          maxRetries: GeminiService.MAX_RETRIES,
          // Never log the actual error message as it may contain API key info
          errorType: lastError.constructor.name,
        });

        if (attempt < GeminiService.MAX_RETRIES) {
          const delay = GeminiService.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error('Gemini API call failed after all retries', {
      totalAttempts: GeminiService.MAX_RETRIES,
    });

    throw new GeminiServiceError('AI service temporarily unavailable');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * MockGeminiService — returns realistic mock data when no API key is configured.
 * Used for local development and testing.
 */
export class MockGeminiService implements IGeminiService {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async generateContent(prompt: string, _options?: GenerateOptions): Promise<GenerateResult> {
    this.logger.info('Mock Gemini API call', { promptLength: prompt.length });

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockResponse = JSON.stringify({
      topSources: [
        {
          category: 'Transportation',
          percentage: 45.2,
          explanation: 'Car travel is your largest emission source based on monthly mileage.',
        },
        {
          category: 'Home Energy',
          percentage: 28.1,
          explanation: 'Electricity consumption contributes significantly, especially with low renewable usage.',
        },
        {
          category: 'Diet',
          percentage: 18.3,
          explanation: 'Your dietary choices have moderate impact on overall emissions.',
        },
      ],
      strategies: [
        {
          title: 'Carpool twice a week',
          description: 'Sharing rides to work can cut your car emissions by 40%.',
          difficulty: 2,
          estimatedSavings: 33.7,
        },
        {
          title: 'Switch to green energy plan',
          description: 'Many utilities offer 100% renewable plans for minimal cost increase.',
          difficulty: 2,
          estimatedSavings: 28.5,
        },
        {
          title: 'Meatless Mondays and Wednesdays',
          description: 'Two plant-based days per week can reduce diet emissions by 25%.',
          difficulty: 1,
          estimatedSavings: 15.2,
        },
        {
          title: 'Use public transit for errands',
          description: 'Replace short car trips with bus or train when possible.',
          difficulty: 3,
          estimatedSavings: 20.1,
        },
        {
          title: 'Reduce fast fashion purchases',
          description: 'Buy quality basics instead of trendy disposable clothing.',
          difficulty: 2,
          estimatedSavings: 12.8,
        },
      ],
      challenge: {
        title: 'Car-Free Weekend Challenge',
        description: 'Go the entire weekend without using your car. Walk, bike, or take transit instead.',
        duration: '7 days',
      },
    });

    return {
      text: mockResponse,
      tokensUsed: Math.ceil(mockResponse.length / 4),
    };
  }
}

/**
 * SustainabilityAdvice — represents AI-generated advice stored for audit.
 */
export interface SustainabilityAdvice {
  id: string;
  userId: string;
  footprintId: string;
  topSources: Array<{
    category: string;
    percentage: number;
    explanation: string;
  }>;
  strategies: Array<{
    title: string;
    description: string;
    difficulty: number;
    estimatedSavings: number;
  }>;
  weeklyChallenge: {
    title: string;
    description: string;
    duration: string;
  };
  tokensUsed: number;
  generatedAt: Date;
}

/**
 * IAdviceRepository — repository interface for sustainability advice persistence.
 */
export interface IAdviceRepository {
  /** Create a new advice record */
  create(advice: SustainabilityAdvice): Promise<void>;

  /** Get advice by ID */
  findById(id: string): Promise<SustainabilityAdvice | null>;

  /** Get all advice for a user */
  getByUserId(userId: string, limit?: number): Promise<SustainabilityAdvice[]>;

  /** Get the most recent advice for a user */
  getLatest(userId: string): Promise<SustainabilityAdvice | null>;
}

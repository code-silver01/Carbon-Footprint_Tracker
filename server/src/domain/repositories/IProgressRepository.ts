/**
 * MonthlyProgress — tracks user's monthly emission data for dashboard.
 */
export interface MonthlyProgress {
  userId: string;
  month: string; // YYYY-MM
  totalEmissions: number;
  savings: number; // compared to baseline
  sustainabilityScore: number; // 0-100
  updatedAt: Date;
}

/**
 * LeaderboardEntry — represents a user's ranking.
 */
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  monthlyReduction: number;
  rank: number;
}

/**
 * IProgressRepository — repository interface for progress tracking.
 */
export interface IProgressRepository {
  /** Get monthly progress for a user */
  getMonthlyProgress(userId: string, monthsBack?: number): Promise<MonthlyProgress[]>;

  /** Update or create progress for a month */
  upsertMonthlyProgress(progress: MonthlyProgress): Promise<void>;

  /** Get leaderboard (top users by monthly reduction) */
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;

  /** Get a user's rank */
  getUserRank(userId: string): Promise<number>;
}

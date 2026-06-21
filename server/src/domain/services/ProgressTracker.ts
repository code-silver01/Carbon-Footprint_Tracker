import { IFootprintRepository } from '../repositories/IFootprintRepository';
import { IProgressRepository, MonthlyProgress, LeaderboardEntry } from '../repositories/IProgressRepository';
import { CarbonFootprint } from '../entities/CarbonFootprint';
import { ILogger } from './AuthService';

/**
 * Dashboard data returned to the frontend.
 */
export interface DashboardData {
  monthlyProgress: MonthlyProgress[];
  currentMonthSavings: number;
  cumulativeSavings: number;
  sustainabilityScore: number;
  leaderboard: LeaderboardEntry[];
  userRank: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * ProgressTracker — computes dashboard metrics, trends, and scores.
 *
 * Business logic for:
 * - Monthly CO2 trend calculation
 * - Sustainability score (0-100)
 * - Cumulative savings
 * - Leaderboard ranking
 */
export class ProgressTracker {
  /** Average monthly CO2 per person (global average ~333 kg/month) */
  private static readonly GLOBAL_AVERAGE_MONTHLY = 333;
  /** Perfect score threshold (kg CO2/month) */
  private static readonly PERFECT_THRESHOLD = 83; // ~1 ton/year

  constructor(
    private readonly footprintRepository: IFootprintRepository,
    private readonly progressRepository: IProgressRepository,
    private readonly logger: ILogger,
  ) {}

  /**
   * Get full dashboard data for a user.
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    const [monthlyProgress, leaderboard, userRank, footprints] = await Promise.all([
      this.progressRepository.getMonthlyProgress(userId, 12),
      this.progressRepository.getLeaderboard(5),
      this.progressRepository.getUserRank(userId),
      this.footprintRepository.getMonthlyFootprints(userId, 12),
    ]);

    const currentMonthSavings = this.calculateCurrentMonthSavings(footprints);
    const cumulativeSavings = this.calculateCumulativeSavings(footprints);
    const sustainabilityScore = this.calculateSustainabilityScore(footprints);
    const trend = this.calculateTrend(monthlyProgress);

    return {
      monthlyProgress,
      currentMonthSavings,
      cumulativeSavings,
      sustainabilityScore,
      leaderboard,
      userRank,
      trend,
    };
  }

  /**
   * Update progress after a new footprint is calculated.
   */
  async updateProgress(userId: string, footprint: CarbonFootprint): Promise<void> {
    const savings = ProgressTracker.GLOBAL_AVERAGE_MONTHLY - footprint.total;

    const progress: MonthlyProgress = {
      userId,
      month: footprint.month,
      totalEmissions: footprint.total,
      savings: Math.max(0, savings),
      sustainabilityScore: this.computeScore(footprint.total),
      updatedAt: new Date(),
    };

    await this.progressRepository.upsertMonthlyProgress(progress);
    this.logger.info('Progress updated', { userId, month: footprint.month });
  }

  /**
   * Calculate savings for the current month vs global average.
   */
  private calculateCurrentMonthSavings(footprints: CarbonFootprint[]): number {
    if (footprints.length === 0) return 0;

    const latest = footprints[0]; // Already sorted desc
    const savings = ProgressTracker.GLOBAL_AVERAGE_MONTHLY - latest.total;
    return Math.round(Math.max(0, savings) * 100) / 100;
  }

  /**
   * Calculate total savings across all tracked months.
   */
  private calculateCumulativeSavings(footprints: CarbonFootprint[]): number {
    return footprints.reduce((total, fp) => {
      const savings = ProgressTracker.GLOBAL_AVERAGE_MONTHLY - fp.total;
      return total + Math.max(0, savings);
    }, 0);
  }

  /**
   * Calculate sustainability score (0-100) based on latest footprint.
   *
   * Scoring logic:
   * - 100: Below "perfect" threshold (~1 ton/year)
   * - 50: At global average
   * - 0: Double the global average or higher
   */
  calculateSustainabilityScore(footprints: CarbonFootprint[]): number {
    if (footprints.length === 0) return 50; // No data = average

    const latest = footprints[0];
    return this.computeScore(latest.total);
  }

  private computeScore(monthlyEmissions: number): number {
    if (monthlyEmissions <= ProgressTracker.PERFECT_THRESHOLD) return 100;
    if (monthlyEmissions >= ProgressTracker.GLOBAL_AVERAGE_MONTHLY * 2) return 0;

    // Linear interpolation between perfect (100) and double average (0)
    const range = ProgressTracker.GLOBAL_AVERAGE_MONTHLY * 2 - ProgressTracker.PERFECT_THRESHOLD;
    const position = monthlyEmissions - ProgressTracker.PERFECT_THRESHOLD;
    const score = 100 - (position / range) * 100;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate trend based on last 3 months of progress.
   */
  calculateTrend(
    progress: MonthlyProgress[],
  ): 'improving' | 'stable' | 'declining' {
    if (progress.length < 2) return 'stable';

    const recent = progress.slice(0, 3);
    const emissions = recent.map((p) => p.totalEmissions);

    // Compare first vs last in the window
    const first = emissions[emissions.length - 1];
    const last = emissions[0];
    const changePercent = ((first - last) / first) * 100;

    if (changePercent > 5) return 'improving'; // Emissions went down
    if (changePercent < -5) return 'declining'; // Emissions went up
    return 'stable';
  }
}

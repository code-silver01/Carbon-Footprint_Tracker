import { Firestore } from '@google-cloud/firestore';
import {
  IProgressRepository,
  MonthlyProgress,
  LeaderboardEntry,
} from '../../domain/repositories/IProgressRepository';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreProgressRepository — progress tracking and leaderboard.
 */
export class FirestoreProgressRepository implements IProgressRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTIONS.PROGRESS);
  }

  async getMonthlyProgress(userId: string, monthsBack = 12): Promise<MonthlyProgress[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('month', 'desc')
      .limit(monthsBack)
      .get();

    return snapshot.docs.map((doc) => this.toProgress(doc.data() as Record<string, unknown>));
  }

  async upsertMonthlyProgress(progress: MonthlyProgress): Promise<void> {
    const docId = `${progress.userId}_${progress.month}`;
    await this.collection.doc(docId).set(
      {
        ...progress,
        updatedAt: progress.updatedAt.toISOString(),
      },
      { merge: true },
    );
  }

  async getLeaderboard(limit = 5): Promise<LeaderboardEntry[]> {
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7);

    const snapshot = await this.collection
      .where('month', '==', currentMonth)
      .orderBy('savings', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        userId: data.userId as string,
        displayName: (data.displayName as string) ?? 'Anonymous',
        monthlyReduction: data.savings as number,
        rank: index + 1,
      };
    });
  }

  async getUserRank(userId: string): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get all progress for current month, sorted by savings desc
    const snapshot = await this.collection
      .where('month', '==', currentMonth)
      .orderBy('savings', 'desc')
      .get();

    const index = snapshot.docs.findIndex((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return data.userId === userId;
    });

    return index >= 0 ? index + 1 : snapshot.size + 1;
  }

  private toProgress(data: Record<string, unknown>): MonthlyProgress {
    return {
      userId: data.userId as string,
      month: data.month as string,
      totalEmissions: data.totalEmissions as number,
      savings: data.savings as number,
      sustainabilityScore: data.sustainabilityScore as number,
      updatedAt: new Date(data.updatedAt as string),
    };
  }
}

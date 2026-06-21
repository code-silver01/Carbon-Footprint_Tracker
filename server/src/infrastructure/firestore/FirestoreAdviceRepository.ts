import { Firestore } from '@google-cloud/firestore';
import { IAdviceRepository, SustainabilityAdvice } from '../../domain/repositories/IAdviceRepository';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreAdviceRepository — stores AI-generated advice for audit trail.
 */
export class FirestoreAdviceRepository implements IAdviceRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTIONS.ADVICE);
  }

  async create(advice: SustainabilityAdvice): Promise<void> {
    await this.collection.doc(advice.id).set({
      ...advice,
      generatedAt: advice.generatedAt.toISOString(),
    });
  }

  async findById(id: string): Promise<SustainabilityAdvice | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity(doc.data() as Record<string, unknown>);
  }

  async getByUserId(userId: string, limit = 10): Promise<SustainabilityAdvice[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.data() as Record<string, unknown>));
  }

  async getLatest(userId: string): Promise<SustainabilityAdvice | null> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.toEntity(snapshot.docs[0].data() as Record<string, unknown>);
  }

  private toEntity(data: Record<string, unknown>): SustainabilityAdvice {
    return {
      id: data.id as string,
      userId: data.userId as string,
      footprintId: data.footprintId as string,
      topSources: data.topSources as SustainabilityAdvice['topSources'],
      strategies: data.strategies as SustainabilityAdvice['strategies'],
      weeklyChallenge: data.weeklyChallenge as SustainabilityAdvice['weeklyChallenge'],
      tokensUsed: data.tokensUsed as number,
      generatedAt: new Date(data.generatedAt as string),
    };
  }
}

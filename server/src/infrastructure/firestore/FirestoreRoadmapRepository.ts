import { Firestore } from '@google-cloud/firestore';
import { IRoadmapRepository } from '../../domain/repositories/IRoadmapRepository';
import { Roadmap, Milestone, MilestoneStatus, DifficultyLevel } from '../../domain/value-objects/Milestone';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreRoadmapRepository — roadmap persistence with version tracking.
 */
export class FirestoreRoadmapRepository implements IRoadmapRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTIONS.ROADMAPS);
  }

  async create(roadmap: Roadmap): Promise<void> {
    await this.collection.doc(roadmap.id).set(roadmap.toJSON());
  }

  async findById(id: string): Promise<Roadmap | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity(doc.data() as Record<string, unknown>);
  }

  async getActiveByUserId(userId: string): Promise<Roadmap | null> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.toEntity(snapshot.docs[0].data() as Record<string, unknown>);
  }

  async getVersionHistory(userId: string): Promise<Roadmap[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.data() as Record<string, unknown>));
  }

  async updateMilestoneStatus(
    roadmapId: string,
    milestoneId: string,
    status: MilestoneStatus,
  ): Promise<void> {
    const doc = await this.collection.doc(roadmapId).get();
    if (!doc.exists) return;

    const data = doc.data() as Record<string, unknown>;
    const milestones = data.milestones as Array<Record<string, unknown>>;

    const updated = milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : m.completedAt,
        };
      }
      return m;
    });

    await this.collection.doc(roadmapId).update({ milestones: updated });
  }

  private toEntity(data: Record<string, unknown>): Roadmap {
    const milestonesData = data.milestones as Array<Record<string, unknown>>;

    const milestones = milestonesData.map(
      (m) =>
        new Milestone({
          id: m.id as string,
          dayRange: m.dayRange as [number, number],
          targetReduction: m.targetReduction as number,
          estimatedSavings: m.estimatedSavings as number,
          difficulty: m.difficulty as DifficultyLevel,
          strategies: m.strategies as string[],
          status: m.status as MilestoneStatus,
          completedAt: m.completedAt ? new Date(m.completedAt as string) : undefined,
        }),
    );

    return new Roadmap({
      id: data.id as string,
      userId: data.userId as string,
      milestones,
      selectedStrategies: data.selectedStrategies as string[],
      baselineFootprint: data.baselineFootprint as number,
      version: data.version as number,
      createdAt: new Date(data.createdAt as string),
    });
  }
}

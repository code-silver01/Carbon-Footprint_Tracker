import { Firestore } from '@google-cloud/firestore';
import { IFootprintRepository } from '../../domain/repositories/IFootprintRepository';
import {
  CarbonFootprint,
  FootprintInput,
  EmissionBreakdown,
  DietType,
} from '../../domain/entities/CarbonFootprint';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreFootprintRepository — optimized Firestore queries for footprint data.
 * Uses composite indexes, date filtering, and batch operations.
 */
export class FirestoreFootprintRepository implements IFootprintRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTIONS.FOOTPRINTS);
  }

  async create(footprint: CarbonFootprint): Promise<void> {
    await this.collection.doc(footprint.id).set(footprint.toJSON());
  }

  async findById(id: string): Promise<CarbonFootprint | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity(doc.data() as Record<string, unknown>);
  }

  async getByUserId(userId: string, limit = 50): Promise<CarbonFootprint[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('calculatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.data() as Record<string, unknown>));
  }

  async getMonthlyFootprints(userId: string, monthsBack = 12): Promise<CarbonFootprint[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('calculatedAt', '>=', cutoffDate.toISOString())
      .orderBy('calculatedAt', 'desc')
      .limit(monthsBack)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.data() as Record<string, unknown>));
  }

  async getLatest(userId: string): Promise<CarbonFootprint | null> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('calculatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.toEntity(snapshot.docs[0].data() as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private toEntity(data: Record<string, unknown>): CarbonFootprint {
    const input = data.input as FootprintInput;
    const breakdown = data.breakdown as EmissionBreakdown;

    return new CarbonFootprint({
      id: data.id as string,
      userId: data.userId as string,
      input: {
        transportation: {
          carMiles: input.transportation.carMiles,
          bikeMiles: input.transportation.bikeMiles,
          transitMiles: input.transportation.transitMiles,
          flightHours: input.transportation.flightHours,
        },
        energy: {
          electricityKwh: input.energy.electricityKwh,
          renewablePercentage: input.energy.renewablePercentage,
        },
        dietType: input.dietType as DietType,
        shopping: {
          monthlySpend: input.shopping.monthlySpend,
          fastFashionFrequency: input.shopping.fastFashionFrequency,
        },
      },
      breakdown: {
        transportation: breakdown.transportation,
        energy: breakdown.energy,
        diet: breakdown.diet,
        shopping: breakdown.shopping,
      },
      total: data.total as number,
      calculatedAt: new Date(data.calculatedAt as string),
      month: data.month as string,
    });
  }
}

import { Firestore } from '@google-cloud/firestore';
import { IEmissionsRepository } from '../../domain/repositories/IEmissionsRepository';
import { EmissionsFactor, DEFAULT_EMISSION_FACTORS } from '../../domain/value-objects/EmissionsFactor';
import { DietType, TransportMode } from '../../domain/entities/CarbonFootprint';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreEmissionsRepository — reads emission factors from Firestore.
 * Caches factors locally since they change infrequently.
 * Falls back to default factors if Firestore is unavailable.
 */
export class FirestoreEmissionsRepository implements IEmissionsRepository {
  private readonly collection;
  private cachedFactors: Record<string, EmissionsFactor> | null = null;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTIONS.EMISSION_FACTORS);
  }

  async getTransportFactor(mode: TransportMode): Promise<EmissionsFactor> {
    const factors = await this.getAllFactors();
    const key = mode === 'flights' ? 'flights' : mode;
    return factors[key] ?? DEFAULT_EMISSION_FACTORS[key];
  }

  async getElectricityFactor(): Promise<EmissionsFactor> {
    const factors = await this.getAllFactors();
    return factors['electricity'] ?? DEFAULT_EMISSION_FACTORS['electricity'];
  }

  async getDietFactor(dietType: DietType): Promise<EmissionsFactor> {
    const factors = await this.getAllFactors();
    const key = `diet_${dietType.replace('-', '_')}`;
    return factors[key] ?? DEFAULT_EMISSION_FACTORS[key];
  }

  async getShoppingFactor(): Promise<EmissionsFactor> {
    const factors = await this.getAllFactors();
    return factors['shopping'] ?? DEFAULT_EMISSION_FACTORS['shopping'];
  }

  async getFastFashionFactor(): Promise<EmissionsFactor> {
    const factors = await this.getAllFactors();
    return factors['fast_fashion'] ?? DEFAULT_EMISSION_FACTORS['fast_fashion'];
  }

  async getAllFactors(): Promise<Record<string, EmissionsFactor>> {
    // Return cached if available
    if (this.cachedFactors) return this.cachedFactors;

    try {
      const snapshot = await this.collection.get();

      if (snapshot.empty) {
        // No custom factors in Firestore, use defaults
        this.cachedFactors = { ...DEFAULT_EMISSION_FACTORS };
        return this.cachedFactors;
      }

      const factors: Record<string, EmissionsFactor> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        factors[doc.id] = new EmissionsFactor({
          category: data.category as string,
          subcategory: data.subcategory as string,
          co2PerUnit: data.co2PerUnit as number,
          unit: data.unit as string,
          source: data.source as string,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated as string) : new Date(),
        });
      });

      this.cachedFactors = factors;
      return factors;
    } catch (_error) {
      // Fallback to defaults on any Firestore error
      this.cachedFactors = { ...DEFAULT_EMISSION_FACTORS };
      return this.cachedFactors;
    }
  }

  async seedDefaults(): Promise<void> {
    const batch = this.db.batch();

    for (const [key, factor] of Object.entries(DEFAULT_EMISSION_FACTORS)) {
      const ref = this.collection.doc(key);
      batch.set(ref, {
        category: factor.category,
        subcategory: factor.subcategory,
        co2PerUnit: factor.co2PerUnit,
        unit: factor.unit,
        source: factor.source,
        lastUpdated: factor.lastUpdated.toISOString(),
      });
    }

    await batch.commit();
    // Invalidate cache after seeding
    this.cachedFactors = null;
  }
}

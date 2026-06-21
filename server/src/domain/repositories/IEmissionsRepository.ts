import { EmissionsFactor } from '../value-objects/EmissionsFactor';
import { DietType, TransportMode } from '../entities/CarbonFootprint';

/**
 * IEmissionsRepository — repository interface for emission factor data.
 * Factors are configurable (stored in Firestore), not hardcoded.
 */
export interface IEmissionsRepository {
  /** Get emission factor for a transportation mode */
  getTransportFactor(mode: TransportMode): Promise<EmissionsFactor>;

  /** Get emission factor for electricity */
  getElectricityFactor(): Promise<EmissionsFactor>;

  /** Get emission factor for a diet type */
  getDietFactor(dietType: DietType): Promise<EmissionsFactor>;

  /** Get emission factor for shopping */
  getShoppingFactor(): Promise<EmissionsFactor>;

  /** Get emission factor for fast fashion */
  getFastFashionFactor(): Promise<EmissionsFactor>;

  /** Get all emission factors */
  getAllFactors(): Promise<Record<string, EmissionsFactor>>;

  /** Seed default factors (for initialization) */
  seedDefaults(): Promise<void>;
}

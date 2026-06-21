import { ValidationError } from '../errors';
import { TransportMode } from '../entities/CarbonFootprint';

/**
 * EmissionsFactor — immutable value object representing a CO2 emission factor.
 * Validated on construction. Used by EmissionsCalculator to compute footprints.
 */
export interface EmissionsFactorProps {
  category: string;
  subcategory: string;
  co2PerUnit: number;
  unit: string;
  source: string;
  lastUpdated: Date;
}

export class EmissionsFactor {
  public readonly category: string;
  public readonly subcategory: string;
  public readonly co2PerUnit: number;
  public readonly unit: string;
  public readonly source: string;
  public readonly lastUpdated: Date;

  constructor(props: EmissionsFactorProps) {
    if (props.co2PerUnit < 0) {
      throw new ValidationError('CO2 per unit cannot be negative');
    }
    if (!props.category || !props.subcategory) {
      throw new ValidationError('Category and subcategory are required');
    }

    this.category = props.category;
    this.subcategory = props.subcategory;
    this.co2PerUnit = props.co2PerUnit;
    this.unit = props.unit;
    this.source = props.source;
    this.lastUpdated = props.lastUpdated;
  }
}

/**
 * Standard emission factors — default values from EPA & IPCC data.
 * These are used as fallbacks when Firestore factors are unavailable.
 */
export const DEFAULT_EMISSION_FACTORS: Record<string, EmissionsFactor> = {
  car: new EmissionsFactor({
    category: 'transportation',
    subcategory: 'car',
    co2PerUnit: 0.411,
    unit: 'kg CO2 per mile',
    source: 'EPA 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  bike: new EmissionsFactor({
    category: 'transportation',
    subcategory: 'bike',
    co2PerUnit: 0.0,
    unit: 'kg CO2 per mile',
    source: 'Zero emissions',
    lastUpdated: new Date('2024-01-01'),
  }),
  transit: new EmissionsFactor({
    category: 'transportation',
    subcategory: 'transit',
    co2PerUnit: 0.14,
    unit: 'kg CO2 per mile',
    source: 'FTA 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  flights: new EmissionsFactor({
    category: 'transportation',
    subcategory: 'flights',
    co2PerUnit: 250.0,
    unit: 'kg CO2 per hour',
    source: 'ICAO 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  electricity: new EmissionsFactor({
    category: 'energy',
    subcategory: 'electricity',
    co2PerUnit: 0.38,
    unit: 'kg CO2 per kWh',
    source: 'EPA eGRID 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  diet_vegan: new EmissionsFactor({
    category: 'diet',
    subcategory: 'vegan',
    co2PerUnit: 91.67,
    unit: 'kg CO2 per month',
    source: 'Our World in Data 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  diet_vegetarian: new EmissionsFactor({
    category: 'diet',
    subcategory: 'vegetarian',
    co2PerUnit: 125.0,
    unit: 'kg CO2 per month',
    source: 'Our World in Data 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  diet_mixed: new EmissionsFactor({
    category: 'diet',
    subcategory: 'mixed',
    co2PerUnit: 183.33,
    unit: 'kg CO2 per month',
    source: 'Our World in Data 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  diet_high_meat: new EmissionsFactor({
    category: 'diet',
    subcategory: 'high-meat',
    co2PerUnit: 275.0,
    unit: 'kg CO2 per month',
    source: 'Our World in Data 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
  shopping: new EmissionsFactor({
    category: 'shopping',
    subcategory: 'general',
    co2PerUnit: 0.06,
    unit: 'kg CO2 per dollar',
    source: 'Carnegie Mellon IO-LCA',
    lastUpdated: new Date('2024-01-01'),
  }),
  fast_fashion: new EmissionsFactor({
    category: 'shopping',
    subcategory: 'fast_fashion',
    co2PerUnit: 10.0,
    unit: 'kg CO2 per item',
    source: 'WRAP 2023',
    lastUpdated: new Date('2024-01-01'),
  }),
};

/** Helper to get transport factor key */
export function getTransportFactorKey(mode: TransportMode): string {
  return mode === 'flights' ? 'flights' : mode;
}

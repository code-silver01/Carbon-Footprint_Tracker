import { ValidationError } from '../errors';

/** Supported diet categories with associated emission factors */
export type DietType = 'vegan' | 'vegetarian' | 'mixed' | 'high-meat';

/** Supported transportation modes */
export type TransportMode = 'car' | 'bike' | 'transit' | 'flights';

/**
 * Transportation breakdown — miles/km per month for each mode.
 */
export interface TransportationData {
  carMiles: number;
  bikeMiles: number;
  transitMiles: number;
  flightHours: number;
}

/**
 * Energy consumption data.
 */
export interface EnergyData {
  electricityKwh: number;
  renewablePercentage: number;
}

/**
 * Shopping/consumption data.
 */
export interface ShoppingData {
  monthlySpend: number;
  fastFashionFrequency: number; // items per month
}

/**
 * Complete footprint input from user.
 */
export interface FootprintInput {
  transportation: TransportationData;
  energy: EnergyData;
  dietType: DietType;
  shopping: ShoppingData;
}

/**
 * Calculated emission breakdown by category.
 */
export interface EmissionBreakdown {
  transportation: number;
  energy: number;
  diet: number;
  shopping: number;
}

export interface CarbonFootprintProps {
  id: string;
  userId: string;
  input: FootprintInput;
  breakdown: EmissionBreakdown;
  total: number;
  calculatedAt: Date;
  month: string; // YYYY-MM format
}

/**
 * CarbonFootprint entity — represents a calculated monthly footprint.
 * All values in kg CO2 equivalent.
 */
export class CarbonFootprint {
  public readonly id: string;
  public readonly userId: string;
  public readonly input: Readonly<FootprintInput>;
  public readonly breakdown: Readonly<EmissionBreakdown>;
  public readonly total: number;
  public readonly calculatedAt: Date;
  public readonly month: string;

  constructor(props: CarbonFootprintProps) {
    CarbonFootprint.validateInput(props.input);
    CarbonFootprint.validateBreakdown(props.breakdown, props.total);

    this.id = props.id;
    this.userId = props.userId;
    this.input = Object.freeze({ ...props.input });
    this.breakdown = Object.freeze({ ...props.breakdown });
    this.total = props.total;
    this.calculatedAt = props.calculatedAt;
    this.month = props.month;
  }

  /**
   * Validates all input values are non-negative and within reasonable bounds.
   */
  private static validateInput(input: FootprintInput): void {
    const { transportation, energy, shopping } = input;

    if (transportation.carMiles < 0 || transportation.carMiles > 50000) {
      throw new ValidationError('Car miles must be between 0 and 50,000');
    }
    if (transportation.bikeMiles < 0 || transportation.bikeMiles > 50000) {
      throw new ValidationError('Bike miles must be between 0 and 50,000');
    }
    if (transportation.transitMiles < 0 || transportation.transitMiles > 50000) {
      throw new ValidationError('Transit miles must be between 0 and 50,000');
    }
    if (transportation.flightHours < 0 || transportation.flightHours > 500) {
      throw new ValidationError('Flight hours must be between 0 and 500');
    }
    if (energy.electricityKwh < 0 || energy.electricityKwh > 10000) {
      throw new ValidationError('Electricity must be between 0 and 10,000 kWh');
    }
    if (energy.renewablePercentage < 0 || energy.renewablePercentage > 100) {
      throw new ValidationError('Renewable percentage must be between 0 and 100');
    }
    if (shopping.monthlySpend < 0 || shopping.monthlySpend > 100000) {
      throw new ValidationError('Monthly spend must be between 0 and 100,000');
    }
    if (shopping.fastFashionFrequency < 0 || shopping.fastFashionFrequency > 100) {
      throw new ValidationError('Fast fashion frequency must be between 0 and 100');
    }

    const validDiets: DietType[] = ['vegan', 'vegetarian', 'mixed', 'high-meat'];
    if (!validDiets.includes(input.dietType)) {
      throw new ValidationError(`Diet type must be one of: ${validDiets.join(', ')}`);
    }
  }

  private static validateBreakdown(breakdown: EmissionBreakdown, total: number): void {
    const computed =
      breakdown.transportation + breakdown.energy + breakdown.diet + breakdown.shopping;
    const tolerance = 0.01;
    if (Math.abs(computed - total) > tolerance) {
      throw new ValidationError('Emission breakdown does not match total');
    }
  }

  /**
   * Returns the largest emission category.
   */
  public getLargestCategory(): keyof EmissionBreakdown {
    const entries = Object.entries(this.breakdown) as [keyof EmissionBreakdown, number][];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  /**
   * Returns percentage contribution of each category.
   */
  public getCategoryPercentages(): Record<keyof EmissionBreakdown, number> {
    if (this.total === 0) {
      return { transportation: 0, energy: 0, diet: 0, shopping: 0 };
    }
    return {
      transportation: (this.breakdown.transportation / this.total) * 100,
      energy: (this.breakdown.energy / this.total) * 100,
      diet: (this.breakdown.diet / this.total) * 100,
      shopping: (this.breakdown.shopping / this.total) * 100,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      input: this.input,
      breakdown: this.breakdown,
      total: this.total,
      calculatedAt: this.calculatedAt.toISOString(),
      month: this.month,
    };
  }
}

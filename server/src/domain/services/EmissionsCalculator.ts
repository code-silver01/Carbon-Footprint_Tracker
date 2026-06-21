import { IEmissionsRepository } from '../repositories/IEmissionsRepository';
import { ValidationError } from '../errors';
import {
  FootprintInput,
  EmissionBreakdown,
  TransportMode,
  DietType,
} from '../entities/CarbonFootprint';

/**
 * EmissionsCalculator — pure business logic for CO2 calculations.
 * All emission factors fetched from repository (configurable, not hardcoded).
 * Fully testable with mocked dependencies.
 */
export class EmissionsCalculator {
  constructor(private readonly emissionsRepository: IEmissionsRepository) {}

  /**
   * Calculates the detailed carbon footprint based on user inputs across multiple categories.
   * Processes transportation, energy, diet, and shopping habits to provide an aggregate
   * total and a category-by-category breakdown.
   *
   * @param input - The complete footprint input data provided by the user.
   * @returns A promise that resolves to an object containing the detailed emission breakdown and the total footprint in kg CO2.
   */
  async calculateTotal(input: FootprintInput): Promise<{
    breakdown: EmissionBreakdown;
    total: number;
  }> {
    const [transportation, energy, diet, shopping] = await Promise.all([
      this.calculateTransportation(input.transportation),
      this.calculateEnergy(input.energy),
      this.calculateDiet(input.dietType),
      this.calculateShopping(input.shopping),
    ]);

    const breakdown: EmissionBreakdown = {
      transportation,
      energy,
      diet,
      shopping,
    };

    const total = transportation + energy + diet + shopping;

    return { breakdown, total: Math.round(total * 100) / 100 };
  }

  /**
   * Calculate transportation emissions in kg CO2.
   */
  async calculateTransportation(transportation: FootprintInput['transportation']): Promise<number> {
    this.validateNonNegative(transportation.carMiles, 'Car miles');
    this.validateNonNegative(transportation.bikeMiles, 'Bike miles');
    this.validateNonNegative(transportation.transitMiles, 'Transit miles');
    this.validateNonNegative(transportation.flightHours, 'Flight hours');

    const modes: Array<{ mode: TransportMode; value: number }> = [
      { mode: 'car', value: transportation.carMiles },
      { mode: 'bike', value: transportation.bikeMiles },
      { mode: 'transit', value: transportation.transitMiles },
      { mode: 'flights', value: transportation.flightHours },
    ];

    let total = 0;
    for (const { mode, value } of modes) {
      if (value > 0) {
        const factor = await this.emissionsRepository.getTransportFactor(mode);
        total += value * factor.co2PerUnit;
      }
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Calculate energy emissions in kg CO2.
   * Accounts for renewable energy percentage.
   */
  async calculateEnergy(energy: FootprintInput['energy']): Promise<number> {
    this.validateNonNegative(energy.electricityKwh, 'Electricity kWh');

    if (energy.renewablePercentage < 0 || energy.renewablePercentage > 100) {
      throw new ValidationError('Renewable percentage must be between 0 and 100');
    }

    const factor = await this.emissionsRepository.getElectricityFactor();
    const nonRenewableFraction = (100 - energy.renewablePercentage) / 100;
    const emissions = energy.electricityKwh * factor.co2PerUnit * nonRenewableFraction;

    return Math.round(emissions * 100) / 100;
  }

  /**
   * Calculate diet-related emissions in kg CO2 per month.
   */
  async calculateDiet(dietType: DietType): Promise<number> {
    const validDiets: DietType[] = ['vegan', 'vegetarian', 'mixed', 'high-meat'];
    if (!validDiets.includes(dietType)) {
      throw new ValidationError(`Invalid diet type: ${dietType}`);
    }

    const factor = await this.emissionsRepository.getDietFactor(dietType);
    return Math.round(factor.co2PerUnit * 100) / 100;
  }

  /**
   * Calculate shopping/consumption emissions in kg CO2.
   */
  async calculateShopping(shopping: FootprintInput['shopping']): Promise<number> {
    this.validateNonNegative(shopping.monthlySpend, 'Monthly spend');
    this.validateNonNegative(shopping.fastFashionFrequency, 'Fast fashion frequency');

    const [shoppingFactor, fashionFactor] = await Promise.all([
      this.emissionsRepository.getShoppingFactor(),
      this.emissionsRepository.getFastFashionFactor(),
    ]);

    const generalEmissions = shopping.monthlySpend * shoppingFactor.co2PerUnit;
    const fashionEmissions = shopping.fastFashionFrequency * fashionFactor.co2PerUnit;

    return Math.round((generalEmissions + fashionEmissions) * 100) / 100;
  }

  /**
   * Validates that a number is non-negative.
   */
  private validateNonNegative(value: number, fieldName: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a valid number`);
    }
    if (value < 0) {
      throw new ValidationError(`${fieldName} cannot be negative`);
    }
  }
}

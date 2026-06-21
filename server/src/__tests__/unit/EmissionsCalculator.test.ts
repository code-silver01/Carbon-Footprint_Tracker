import { EmissionsCalculator } from '../../domain/services/EmissionsCalculator';
import { IEmissionsRepository } from '../../domain/repositories/IEmissionsRepository';
import { EmissionsFactor } from '../../domain/value-objects/EmissionsFactor';
import { ValidationError } from '../../domain/errors';
import { FootprintInput } from '../../domain/entities/CarbonFootprint';

// --- Mock Repository ---
function createMockEmissionsRepository(
  overrides?: Partial<Record<string, number>>,
): jest.Mocked<IEmissionsRepository> {
  const makeFactor = (co2PerUnit: number, category: string, sub: string): EmissionsFactor =>
    new EmissionsFactor({
      category,
      subcategory: sub,
      co2PerUnit,
      unit: 'test',
      source: 'test',
      lastUpdated: new Date(),
    });

  return {
    getTransportFactor: jest.fn().mockImplementation(async (mode: string) => {
      const defaults: Record<string, number> = {
        car: 0.411,
        bike: 0,
        transit: 0.14,
        flights: 250,
      };
      return makeFactor(overrides?.[mode] ?? defaults[mode] ?? 0, 'transport', mode);
    }),
    getElectricityFactor: jest
      .fn()
      .mockResolvedValue(
        makeFactor(overrides?.electricity ?? 0.38, 'energy', 'electricity'),
      ),
    getDietFactor: jest.fn().mockImplementation(async (dietType: string) => {
      const defaults: Record<string, number> = {
        vegan: 91.67,
        vegetarian: 125,
        mixed: 183.33,
        'high-meat': 275,
      };
      return makeFactor(overrides?.[dietType] ?? defaults[dietType] ?? 0, 'diet', dietType);
    }),
    getShoppingFactor: jest
      .fn()
      .mockResolvedValue(makeFactor(overrides?.shopping ?? 0.06, 'shopping', 'general')),
    getFastFashionFactor: jest
      .fn()
      .mockResolvedValue(makeFactor(overrides?.fast_fashion ?? 10, 'shopping', 'fast_fashion')),
    getAllFactors: jest.fn().mockResolvedValue({}),
    seedDefaults: jest.fn().mockResolvedValue(undefined),
  };
}

describe('EmissionsCalculator', () => {
  let calculator: EmissionsCalculator;
  let mockRepo: jest.Mocked<IEmissionsRepository>;

  beforeEach(() => {
    mockRepo = createMockEmissionsRepository();
    calculator = new EmissionsCalculator(mockRepo);
  });

  // --- Transportation ---
  describe('calculateTransportation', () => {
    it('should calculate CO2 for car travel using repository factor', async () => {
      const result = await calculator.calculateTransportation({
        carMiles: 100,
        bikeMiles: 0,
        transitMiles: 0,
        flightHours: 0,
      });

      expect(result).toBe(41.1);
      expect(mockRepo.getTransportFactor).toHaveBeenCalledWith('car');
    });

    it('should calculate CO2 for flights', async () => {
      const result = await calculator.calculateTransportation({
        carMiles: 0,
        bikeMiles: 0,
        transitMiles: 0,
        flightHours: 2,
      });

      expect(result).toBe(500);
    });

    it('should return zero for bike travel', async () => {
      const result = await calculator.calculateTransportation({
        carMiles: 0,
        bikeMiles: 50,
        transitMiles: 0,
        flightHours: 0,
      });

      expect(result).toBe(0);
    });

    it('should sum multiple transportation modes', async () => {
      const result = await calculator.calculateTransportation({
        carMiles: 100,
        bikeMiles: 0,
        transitMiles: 50,
        flightHours: 1,
      });

      // 100 * 0.411 + 50 * 0.14 + 1 * 250 = 41.1 + 7 + 250 = 298.1
      expect(result).toBe(298.1);
    });

    it('should throw ValidationError for negative car miles', async () => {
      await expect(
        calculator.calculateTransportation({
          carMiles: -10,
          bikeMiles: 0,
          transitMiles: 0,
          flightHours: 0,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative flight hours', async () => {
      await expect(
        calculator.calculateTransportation({
          carMiles: 0,
          bikeMiles: 0,
          transitMiles: 0,
          flightHours: -5,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle zero values correctly', async () => {
      const result = await calculator.calculateTransportation({
        carMiles: 0,
        bikeMiles: 0,
        transitMiles: 0,
        flightHours: 0,
      });

      expect(result).toBe(0);
    });

    it('should throw for NaN values', async () => {
      await expect(
        calculator.calculateTransportation({
          carMiles: NaN,
          bikeMiles: 0,
          transitMiles: 0,
          flightHours: 0,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- Energy ---
  describe('calculateEnergy', () => {
    it('should calculate electricity emissions', async () => {
      const result = await calculator.calculateEnergy({
        electricityKwh: 300,
        renewablePercentage: 0,
      });

      // 300 * 0.38 = 114
      expect(result).toBe(114);
    });

    it('should reduce emissions by renewable percentage', async () => {
      const result = await calculator.calculateEnergy({
        electricityKwh: 300,
        renewablePercentage: 50,
      });

      // 300 * 0.38 * 0.5 = 57
      expect(result).toBe(57);
    });

    it('should return zero for 100% renewable', async () => {
      const result = await calculator.calculateEnergy({
        electricityKwh: 300,
        renewablePercentage: 100,
      });

      expect(result).toBe(0);
    });

    it('should throw for negative kWh', async () => {
      await expect(
        calculator.calculateEnergy({
          electricityKwh: -100,
          renewablePercentage: 0,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for renewable percentage > 100', async () => {
      await expect(
        calculator.calculateEnergy({
          electricityKwh: 300,
          renewablePercentage: 150,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for negative renewable percentage', async () => {
      await expect(
        calculator.calculateEnergy({
          electricityKwh: 300,
          renewablePercentage: -10,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- Diet ---
  describe('calculateDiet', () => {
    it('should return vegan emissions', async () => {
      const result = await calculator.calculateDiet('vegan');
      expect(result).toBe(91.67);
    });

    it('should return high-meat emissions', async () => {
      const result = await calculator.calculateDiet('high-meat');
      expect(result).toBe(275);
    });

    it('should throw for invalid diet type', async () => {
      await expect(
        calculator.calculateDiet('carnivore' as any),
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- Shopping ---
  describe('calculateShopping', () => {
    it('should calculate general shopping emissions', async () => {
      const result = await calculator.calculateShopping({
        monthlySpend: 500,
        fastFashionFrequency: 0,
      });

      // 500 * 0.06 = 30
      expect(result).toBe(30);
    });

    it('should add fast fashion emissions', async () => {
      const result = await calculator.calculateShopping({
        monthlySpend: 500,
        fastFashionFrequency: 3,
      });

      // 500 * 0.06 + 3 * 10 = 30 + 30 = 60
      expect(result).toBe(60);
    });

    it('should throw for negative spend', async () => {
      await expect(
        calculator.calculateShopping({
          monthlySpend: -100,
          fastFashionFrequency: 0,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // --- Total Calculation ---
  describe('calculateTotal', () => {
    it('should sum all categories correctly', async () => {
      const input: FootprintInput = {
        transportation: {
          carMiles: 100,
          bikeMiles: 0,
          transitMiles: 0,
          flightHours: 0,
        },
        energy: {
          electricityKwh: 300,
          renewablePercentage: 0,
        },
        dietType: 'mixed',
        shopping: {
          monthlySpend: 500,
          fastFashionFrequency: 0,
        },
      };

      const result = await calculator.calculateTotal(input);

      // Transport: 41.1, Energy: 114, Diet: 183.33, Shopping: 30
      expect(result.breakdown.transportation).toBe(41.1);
      expect(result.breakdown.energy).toBe(114);
      expect(result.breakdown.diet).toBe(183.33);
      expect(result.breakdown.shopping).toBe(30);
      expect(result.total).toBe(368.43);
    });

    it('should handle all zeros', async () => {
      const input: FootprintInput = {
        transportation: {
          carMiles: 0,
          bikeMiles: 0,
          transitMiles: 0,
          flightHours: 0,
        },
        energy: {
          electricityKwh: 0,
          renewablePercentage: 0,
        },
        dietType: 'vegan',
        shopping: {
          monthlySpend: 0,
          fastFashionFrequency: 0,
        },
      };

      const result = await calculator.calculateTotal(input);

      // Only diet (vegan has a base emission)
      expect(result.breakdown.transportation).toBe(0);
      expect(result.breakdown.energy).toBe(0);
      expect(result.breakdown.diet).toBe(91.67);
      expect(result.breakdown.shopping).toBe(0);
      expect(result.total).toBe(91.67);
    });
  });
});

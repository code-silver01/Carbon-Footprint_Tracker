import { DifficultyLevel } from '../../value-objects/Milestone';

/**
 * Strategy definition — a carbon reduction strategy available to users.
 * Strategies are categorized by emissions source and scored by difficulty.
 */
export interface Strategy {
  /** Unique strategy identifier (prefixed with 'strat-') */
  readonly id: string;
  /** Human-readable strategy title */
  readonly title: string;
  /** Detailed description of what the strategy involves */
  readonly description: string;
  /** Emissions category: transportation, energy, diet, or shopping */
  readonly category: string;
  /** Maximum monthly CO₂ reduction in kilograms */
  readonly maxReductionKg: number;
  /** Difficulty rating from 1 (easiest) to 5 (hardest) */
  readonly difficulty: DifficultyLevel;
  /** Estimated monthly monetary savings in USD */
  readonly estimatedMonthlySavings: number;
}

/**
 * Default strategies available in the system.
 * Curated from EPA and IPCC data on personal emissions reduction potential.
 */
export const DEFAULT_STRATEGIES: readonly Strategy[] = Object.freeze([
  {
    id: 'strat-carpool',
    title: 'Carpool or Ride-Share',
    description: 'Share rides to reduce per-person emissions by up to 50%',
    category: 'transportation',
    maxReductionKg: 50,
    difficulty: 2 as DifficultyLevel,
    estimatedMonthlySavings: 80,
  },
  {
    id: 'strat-transit',
    title: 'Switch to Public Transit',
    description: 'Replace car trips with bus or rail for daily commute',
    category: 'transportation',
    maxReductionKg: 80,
    difficulty: 3 as DifficultyLevel,
    estimatedMonthlySavings: 120,
  },
  {
    id: 'strat-bike',
    title: 'Bike for Short Trips',
    description: 'Use cycling for trips under 5 miles',
    category: 'transportation',
    maxReductionKg: 30,
    difficulty: 2 as DifficultyLevel,
    estimatedMonthlySavings: 40,
  },
  {
    id: 'strat-flights',
    title: 'Reduce Air Travel',
    description: 'Choose virtual meetings or train alternatives when possible',
    category: 'transportation',
    maxReductionKg: 200,
    difficulty: 4 as DifficultyLevel,
    estimatedMonthlySavings: 300,
  },
  {
    id: 'strat-renewable',
    title: 'Switch to Renewable Energy',
    description: 'Sign up for a green energy plan or install solar panels',
    category: 'energy',
    maxReductionKg: 100,
    difficulty: 3 as DifficultyLevel,
    estimatedMonthlySavings: 50,
  },
  {
    id: 'strat-efficiency',
    title: 'Improve Home Efficiency',
    description: 'LED bulbs, smart thermostat, better insulation',
    category: 'energy',
    maxReductionKg: 40,
    difficulty: 2 as DifficultyLevel,
    estimatedMonthlySavings: 30,
  },
  {
    id: 'strat-plant-based',
    title: 'More Plant-Based Meals',
    description: 'Replace 3+ meat meals per week with plant-based alternatives',
    category: 'diet',
    maxReductionKg: 60,
    difficulty: 2 as DifficultyLevel,
    estimatedMonthlySavings: 20,
  },
  {
    id: 'strat-local-food',
    title: 'Buy Local & Seasonal',
    description: 'Reduce food miles by shopping at farmers markets',
    category: 'diet',
    maxReductionKg: 25,
    difficulty: 1 as DifficultyLevel,
    estimatedMonthlySavings: 10,
  },
  {
    id: 'strat-slow-fashion',
    title: 'Choose Slow Fashion',
    description: 'Buy quality clothing that lasts, avoid fast fashion',
    category: 'shopping',
    maxReductionKg: 35,
    difficulty: 2 as DifficultyLevel,
    estimatedMonthlySavings: 50,
  },
  {
    id: 'strat-reduce-buy',
    title: 'Reduce Overall Consumption',
    description: 'Practice mindful purchasing, repair before replacing',
    category: 'shopping',
    maxReductionKg: 45,
    difficulty: 3 as DifficultyLevel,
    estimatedMonthlySavings: 100,
  },
]);

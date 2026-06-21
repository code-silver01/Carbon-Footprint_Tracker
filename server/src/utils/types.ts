/**
 * Branded types for compile-time distinction.
 *
 * While UserId, FootprintId, and StrategyId are all strings at runtime,
 * the branded type pattern prevents accidental misuse at compile time.
 *
 * @example
 * ```typescript
 * const userId = makeUserId('abc-123');
 * const footprintId = makeFootprintId('fp-456');
 * // getUserFootprint(footprintId, userId) — compiler ensures correct order
 * ```
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type FootprintId = Brand<string, 'FootprintId'>;
export type StrategyId = Brand<string, 'StrategyId'>;
export type RoadmapId = Brand<string, 'RoadmapId'>;
export type MilestoneId = Brand<string, 'MilestoneId'>;

/** Type-safe constructors for branded IDs */
export const makeUserId = (id: string): UserId => id as UserId;
export const makeFootprintId = (id: string): FootprintId => id as FootprintId;
export const makeStrategyId = (id: string): StrategyId => id as StrategyId;
export const makeRoadmapId = (id: string): RoadmapId => id as RoadmapId;
export const makeMilestoneId = (id: string): MilestoneId => id as MilestoneId;

/**
 * Result<T, E> type for explicit error handling.
 *
 * Forces callers to handle both success and failure cases
 * instead of relying on implicit exception propagation.
 *
 * @example
 * ```typescript
 * const result = await calculateFootprint(input);
 * if (result.ok) {
 *   console.log('Total CO₂:', result.value);
 * } else {
 *   console.error('Validation failed:', result.error.message);
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a successful Result */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Construct a failure Result */
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * NonEmptyArray<T> — guarantees at least one element at the type level.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Type guard to check if an array is non-empty.
 */
export function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

/**
 * Percentage — constrained to 0-100 range.
 */
export type Percentage = number & { readonly __percentage: true };

export function makePercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new RangeError(`Percentage must be between 0 and 100, got ${value}`);
  }
  return value as Percentage;
}

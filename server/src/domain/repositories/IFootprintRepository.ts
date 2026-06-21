import { CarbonFootprint } from '../entities/CarbonFootprint';

/**
 * IFootprintRepository — repository interface for carbon footprint persistence.
 */
export interface IFootprintRepository {
  /** Create a new footprint record */
  create(footprint: CarbonFootprint): Promise<void>;

  /** Find footprint by ID */
  findById(id: string): Promise<CarbonFootprint | null>;

  /** Get all footprints for a user, ordered by date descending */
  getByUserId(userId: string, limit?: number): Promise<CarbonFootprint[]>;

  /** Get footprints within a date range */
  getMonthlyFootprints(userId: string, monthsBack?: number): Promise<CarbonFootprint[]>;

  /** Get the most recent footprint for a user */
  getLatest(userId: string): Promise<CarbonFootprint | null>;

  /** Delete a footprint */
  delete(id: string): Promise<void>;
}

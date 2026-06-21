import { User } from '../entities/User';

/**
 * IUserRepository — repository interface for User persistence.
 * Infrastructure layer provides the concrete implementation (Firestore, Postgres, etc.)
 */
export interface IUserRepository {
  /** Create a new user */
  create(user: User): Promise<void>;

  /** Find user by ID */
  findById(id: string): Promise<User | null>;

  /** Find user by email (case-insensitive) */
  findByEmail(email: string): Promise<User | null>;

  /** Update user profile */
  update(id: string, data: Partial<Pick<User, 'displayName'>>): Promise<void>;

  /** Delete user and associated data */
  delete(id: string): Promise<void>;
}

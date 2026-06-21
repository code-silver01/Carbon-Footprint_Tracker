import { ValidationError } from '../errors';

/**
 * User entity — core domain object representing a registered user.
 * Framework-agnostic: no Firestore, no Express, no ORM dependencies.
 */
export interface UserProps {
  id: string;
  email: string;
  hashedPassword: string;
  displayName?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly hashedPassword: string;
  public readonly displayName: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.validateEmail(props.email);

    this.id = props.id;
    this.email = props.email.toLowerCase().trim();
    this.hashedPassword = props.hashedPassword;
    this.displayName = props.displayName ?? this.deriveDisplayName(props.email);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt ?? props.createdAt;
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  private deriveDisplayName(email: string): string {
    return email.split('@')[0] ?? 'User';
  }

  /**
   * Serializes to a plain object for persistence.
   * Never includes raw password — only the hash.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.email,
      hashedPassword: this.hashedPassword,
      displayName: this.displayName,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

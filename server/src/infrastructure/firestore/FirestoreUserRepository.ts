import { Firestore } from '@google-cloud/firestore';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { COLLECTIONS } from './FirestoreConfig';

/**
 * FirestoreUserRepository — Firestore implementation of IUserRepository.
 * Translates between domain entities and Firestore documents.
 */
export class FirestoreUserRepository implements IUserRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTIONS.USERS);
  }

  async create(user: User): Promise<void> {
    await this.collection.doc(user.id).set(user.toJSON());
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity(doc.data() as Record<string, unknown>);
  }

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await this.collection
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.toEntity(doc.data() as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Pick<User, 'displayName'>>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  /**
   * Maps a Firestore document to a User domain entity.
   */
  private toEntity(data: Record<string, unknown>): User {
    return new User({
      id: data.id as string,
      email: data.email as string,
      hashedPassword: data.hashedPassword as string,
      displayName: data.displayName as string | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: data.updatedAt ? new Date(data.updatedAt as string) : undefined,
    });
  }
}

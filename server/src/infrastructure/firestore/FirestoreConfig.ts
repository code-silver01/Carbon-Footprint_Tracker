import { Firestore, Settings } from '@google-cloud/firestore';
import { AppConfig } from '../../config/environment';

/**
 * Creates and configures a Firestore client instance.
 * Supports both production (GCP) and local emulator modes.
 */
export function createFirestoreClient(config: AppConfig): Firestore {
  const settings: Settings = {
    projectId: config.googleCloudProject,
  };

  // If emulator host is set, configure for local development
  if (config.firestoreEmulatorHost) {
    settings.host = config.firestoreEmulatorHost;
    settings.ssl = false;
  }

  return new Firestore(settings);
}

/**
 * Collection names — centralized to avoid typos.
 */
export const COLLECTIONS = {
  USERS: 'users',
  FOOTPRINTS: 'footprints',
  EMISSION_FACTORS: 'emissionFactors',
  ADVICE: 'advice',
  ROADMAPS: 'roadmaps',
  PROGRESS: 'progress',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

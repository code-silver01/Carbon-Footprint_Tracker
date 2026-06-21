import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { ILogger } from '../../domain/services/AuthService';

/**
 * SecretManagerService — loads secrets at initialization, caches in memory.
 * Falls back to environment variables in development.
 * Never logs secret values.
 */
export class SecretManagerService {
  private readonly client: SecretManagerServiceClient;
  private readonly secretCache: Map<string, string> = new Map();
  private readonly projectId: string;

  constructor(
    projectId: string,
    private readonly logger: ILogger,
    private readonly useSecretManager: boolean = false,
  ) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
  }

  /**
   * Get a secret value. Uses cache, then Secret Manager, then env vars.
   */
  async getSecret(secretId: string): Promise<string> {
    // Check cache first
    const cached = this.secretCache.get(secretId);
    if (cached) return cached;

    // Try Secret Manager in production
    if (this.useSecretManager) {
      try {
        const name = `projects/${this.projectId}/secrets/${secretId}/versions/latest`;
        const [version] = await this.client.accessSecretVersion({ name });
        const value = version.payload?.data?.toString() ?? '';

        this.secretCache.set(secretId, value);
        this.logger.info('Secret loaded from Secret Manager', {
          secretId,
          // Never log the actual secret value
        });

        return value;
      } catch (error) {
        this.logger.warn('Failed to load secret from Secret Manager, falling back to env', {
          secretId,
          error: error instanceof Error ? error.constructor.name : 'Unknown',
        });
      }
    }

    // Fallback to environment variables
    const envKey = secretId.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envKey] ?? '';
    this.secretCache.set(secretId, envValue);
    return envValue;
  }

  /**
   * Pre-load all required secrets at startup.
   * This is called during initialization, not at request time.
   */
  async preloadSecrets(secretIds: string[]): Promise<void> {
    this.logger.info('Pre-loading secrets', { count: secretIds.length });

    const results = await Promise.allSettled(
      secretIds.map((id) => this.getSecret(id)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn('Some secrets failed to load', {
        failedCount: failed.length,
        totalCount: secretIds.length,
      });
    }
  }

  /**
   * Clear the cache (for testing).
   */
  clearCache(): void {
    this.secretCache.clear();
  }
}

import NodeCache from 'node-cache';
import { ICacheService } from '../../domain/services/SustainabilityAdvisor';

/**
 * InMemoryCacheService — node-cache implementation of ICacheService.
 * Used for local development. Redis-compatible interface for production swap.
 */
export class InMemoryCacheService implements ICacheService {
  private readonly cache: NodeCache;

  constructor(defaultTtlSeconds: number = 3600) {
    this.cache = new NodeCache({
      stdTTL: defaultTtlSeconds,
      checkperiod: 120,
      useClones: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, options?: { ttl: number }): Promise<void> {
    if (options?.ttl) {
      this.cache.set(key, value, options.ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.del(key);
  }

  /**
   * Get cache stats (for monitoring).
   */
  getStats(): { hits: number; misses: number; keys: number } {
    const stats = this.cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: this.cache.keys().length,
    };
  }

  /**
   * Clear all cached items.
   */
  flush(): void {
    this.cache.flushAll();
  }
}

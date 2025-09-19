import { Injectable, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  observable?: Observable<T>;
}

interface CacheConfig {
  defaultTtlMs: number;
  maxCacheSize: number;
  trackingCacheTtlMs: number;
  shippingCacheTtlMs: number;
}

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();

  private readonly config: CacheConfig = {
    defaultTtlMs: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 1000,
    trackingCacheTtlMs: 10 * 60 * 1000, // 10 minutes for tracking
    shippingCacheTtlMs: 30 * 60 * 1000, // 30 minutes for shipping rates
  };

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Get cached data or execute the provider function
   */
  getOrSet<T>(
    key: string,
    provider: () => Observable<T>,
    ttlMs?: number
  ): Observable<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    // Return cached data if valid
    if (entry && entry.expiry > now) {
      this.logger.debug(`Cache hit for key: ${key}`);

      // If there's an ongoing observable, return it to prevent duplicate requests
      if (entry.observable) {
        return entry.observable;
      }

      return of(entry.data);
    }

    // Check cache size and clean if necessary
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntries();
    }

    this.logger.debug(`Cache miss for key: ${key}, executing provider`);

    // Create shareable observable to prevent duplicate concurrent requests
    const observable$ = provider().pipe(
      tap(data => {
        // Cache the result
        const expiry = now + (ttlMs || this.config.defaultTtlMs);
        this.cache.set(key, {
          data,
          timestamp: now,
          expiry,
        });
        this.logger.debug(`Cached data for key: ${key}, expires at ${new Date(expiry).toISOString()}`);
      }),
      shareReplay(1)
    );

    // Store the observable temporarily to prevent duplicate requests
    if (entry) {
      entry.observable = observable$;
    } else {
      this.cache.set(key, {
        data: null,
        timestamp: now,
        expiry: now,
        observable: observable$,
      });
    }

    return observable$;
  }

  /**
   * Cache tracking data with appropriate TTL
   */
  cacheTrackingData<T>(
    trackingNumber: string,
    provider: () => Observable<T>
  ): Observable<T> {
    const key = `tracking:${trackingNumber}`;
    return this.getOrSet(key, provider, this.config.trackingCacheTtlMs);
  }

  /**
   * Cache shipping rates with appropriate TTL
   */
  cacheShippingRates<T>(
    origin: string,
    destination: string,
    packageHash: string,
    provider: () => Observable<T>
  ): Observable<T> {
    const key = `shipping:${origin}:${destination}:${packageHash}`;
    return this.getOrSet(key, provider, this.config.shippingCacheTtlMs);
  }

  /**
   * Get cached data without executing provider
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry || entry.expiry <= Date.now()) {
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data manually
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    const expiry = now + (ttlMs || this.config.defaultTtlMs);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiry,
    });

    this.logger.debug(`Manually cached data for key: ${key}`);
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Deleted cache entry for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Clear cache entries by pattern
   */
  clearByPattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleared ${deletedCount} cache entries matching pattern: ${pattern}`);
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    hitRate: number;
    memoryUsage: string;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiry <= now) {
        expiredCount++;
      }
    }

    // Rough memory usage estimation
    const entriesMemory = this.cache.size * 200; // Rough estimate
    const memoryUsage = `~${(entriesMemory / 1024).toFixed(2)} KB`;

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      hitRate: 0, // Would need hit/miss tracking for accurate calculation
      memoryUsage,
    };
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? entry.expiry > Date.now() : false;
  }

  /**
   * Get TTL for a specific key in milliseconds
   */
  getTtl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    const remaining = entry.expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    Object.assign(this.config, config);
    this.logger.log('Cache configuration updated:', this.config);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10% of entries
    const entriesToRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.logger.debug(`Evicted ${entriesToRemove} oldest cache entries`);
  }

  /**
   * Generate hash for cache key based on object
   */
  generateHash(obj: any): string {
    return btoa(JSON.stringify(obj)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
}
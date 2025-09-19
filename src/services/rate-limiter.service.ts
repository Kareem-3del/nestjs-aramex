import { Injectable, Logger } from '@nestjs/common';
import { Observable, of, throwError, timer } from 'rxjs';
import { concatMap, delay, map, mergeMap, retryWhen, take } from 'rxjs/operators';

interface RateLimitEntry {
  requests: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  retryAttempts: number;
  retryDelayMs: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  private readonly config: RateLimitConfig = {
    maxRequestsPerMinute: 60, // Aramex typical limit
    retryAttempts: 3,
    retryDelayMs: 1000,
  };

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpiredEntries(), 60000);
  }

  /**
   * Execute a request with rate limiting
   */
  executeWithRateLimit<T>(
    requestFn: () => Observable<T>,
    key = 'default'
  ): Observable<T> {
    return this.checkRateLimit(key).pipe(
      concatMap(() => requestFn()),
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            if (this.isRateLimitError(error) && index < this.config.retryAttempts) {
              const delayTime = this.config.retryDelayMs * Math.pow(2, index);
              this.logger.warn(`Rate limit hit, retrying in ${delayTime}ms (attempt ${index + 1})`);
              return timer(delayTime);
            }
            return throwError(() => error);
          }),
          take(this.config.retryAttempts)
        )
      )
    );
  }

  /**
   * Check if the request is within rate limits
   */
  private checkRateLimit(key: string): Observable<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let entry = this.rateLimitMap.get(key);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      entry = {
        requests: 0,
        resetTime: now + 60000,
      };
      this.rateLimitMap.set(key, entry);
    }

    if (entry.requests >= this.config.maxRequestsPerMinute) {
      const waitTime = entry.resetTime - now;
      this.logger.warn(`Rate limit exceeded for key: ${key}, waiting ${waitTime}ms`);

      return timer(waitTime).pipe(
        map(() => {
          // Reset the counter after waiting
          entry!.requests = 0;
          entry!.resetTime = Date.now() + 60000;
        })
      );
    }

    entry.requests++;
    return of(undefined);
  }

  /**
   * Check if an error is related to rate limiting
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    const statusCode = error.statusCode || error.status;
    const message = error.message || '';

    return (
      statusCode === 429 || // Too Many Requests
      statusCode === 503 || // Service Unavailable
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('too many requests') ||
      message.toLowerCase().includes('quota exceeded')
    );
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (entry.resetTime <= now) {
        this.rateLimitMap.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  getRateLimitStatus(key = 'default'): {
    requestsRemaining: number;
    resetTime: number;
    isLimited: boolean;
  } {
    const entry = this.rateLimitMap.get(key);

    if (!entry || entry.resetTime <= Date.now()) {
      return {
        requestsRemaining: this.config.maxRequestsPerMinute,
        resetTime: Date.now() + 60000,
        isLimited: false,
      };
    }

    const remaining = Math.max(0, this.config.maxRequestsPerMinute - entry.requests);

    return {
      requestsRemaining: remaining,
      resetTime: entry.resetTime,
      isLimited: remaining === 0,
    };
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    Object.assign(this.config, config);
    this.logger.log('Rate limit configuration updated:', this.config);
  }

  /**
   * Reset rate limit for a specific key
   */
  resetRateLimit(key = 'default'): void {
    this.rateLimitMap.delete(key);
    this.logger.debug(`Rate limit reset for key: ${key}`);
  }
}
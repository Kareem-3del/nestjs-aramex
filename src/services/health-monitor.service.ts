import { Injectable, Logger } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AramexHttpService } from './aramex-http.service';
import { AramexSoapService } from './aramex-soap.service';
import { CacheManagerService } from './cache-manager.service';
import { RateLimiterService } from './rate-limiter.service';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestTime: number;
  slowRequestThreshold: number;
  slowRequestCount: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  httpService: boolean;
  soapService: boolean;
  cacheService: boolean;
  lastChecked: number;
  responseTime: number;
  errors: string[];
}

export interface SystemStats {
  performance: PerformanceMetrics;
  health: HealthStatus;
  cache: {
    totalEntries: number;
    hitRate: number;
    memoryUsage: string;
  };
  rateLimit: {
    requestsRemaining: number;
    isLimited: boolean;
    resetTime: number;
  };
}

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastRequestTime: 0,
    slowRequestThreshold: 5000, // 5 seconds
    slowRequestCount: 0,
  };

  private requestTimes: number[] = [];
  private errorCount = 0;
  private readonly maxRequestHistory = 100;

  constructor(
    private readonly httpService: AramexHttpService,
    private readonly soapService: AramexSoapService,
    private readonly cacheManager: CacheManagerService,
    private readonly rateLimiter: RateLimiterService
  ) {
    // Log performance summary every 5 minutes
    setInterval(() => this.logPerformanceSummary(), 5 * 60 * 1000);
  }

  /**
   * Monitor a request and track performance metrics
   */
  monitorRequest<T>(
    requestName: string,
    requestFn: () => Observable<T>
  ): Observable<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting request: ${requestName}`);

    return requestFn().pipe(
      tap(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        this.recordRequestMetrics(responseTime, false);
        this.logger.debug(`Request ${requestName} completed in ${responseTime}ms`);
      }),
      catchError((error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        this.recordRequestMetrics(responseTime, true);
        this.logger.error(`Request ${requestName} failed after ${responseTime}ms:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const errors: string[] = [];
    let httpServiceHealthy = false;
    let soapServiceHealthy = false;
    let cacheServiceHealthy = true;

    try {
      // Test HTTP service connectivity
      await this.testHttpServiceHealth();
      httpServiceHealthy = true;
    } catch (error: any) {
      errors.push(`HTTP service unhealthy: ${error?.message || 'Unknown error'}`);
    }

    try {
      // Test SOAP service connectivity
      soapServiceHealthy = this.soapService.isClientReady();
      if (!soapServiceHealthy) {
        errors.push('SOAP service client not ready');
      }
    } catch (error: any) {
      errors.push(`SOAP service unhealthy: ${error?.message || 'Unknown error'}`);
    }

    try {
      // Test cache service
      this.cacheManager.getStats();
    } catch (error: any) {
      cacheServiceHealthy = false;
      errors.push(`Cache service unhealthy: ${error?.message || 'Unknown error'}`);
    }

    const responseTime = Date.now() - startTime;
    const overallHealthy = httpServiceHealthy && soapServiceHealthy && cacheServiceHealthy;
    const hasMinorIssues = errors.length > 0 && errors.length < 2;

    const status: HealthStatus = {
      status: overallHealthy ? 'healthy' : hasMinorIssues ? 'degraded' : 'unhealthy',
      httpService: httpServiceHealthy,
      soapService: soapServiceHealthy,
      cacheService: cacheServiceHealthy,
      lastChecked: Date.now(),
      responseTime,
      errors,
    };

    this.logger.log(`Health check completed in ${responseTime}ms - Status: ${status.status}`);
    return status;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    const [health, cacheStats, rateLimitStatus] = await Promise.all([
      this.performHealthCheck(),
      Promise.resolve(this.cacheManager.getStats()),
      Promise.resolve(this.rateLimiter.getRateLimitStatus()),
    ]);

    return {
      performance: this.getPerformanceMetrics(),
      health,
      cache: cacheStats,
      rateLimit: rateLimitStatus,
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastRequestTime: 0,
      slowRequestThreshold: this.metrics.slowRequestThreshold,
      slowRequestCount: 0,
    };
    this.requestTimes = [];
    this.errorCount = 0;
    this.logger.log('Performance metrics reset');
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: { slowRequestThreshold?: number }): void {
    if (thresholds.slowRequestThreshold) {
      this.metrics.slowRequestThreshold = thresholds.slowRequestThreshold;
    }
    this.logger.log('Performance thresholds updated:', thresholds);
  }

  /**
   * Get health check endpoint for monitoring tools
   */
  getHealthEndpoint(): Observable<{ status: string; timestamp: number }> {
    return new Observable(subscriber => {
      this.performHealthCheck()
        .then(health => {
          subscriber.next({
            status: health.status,
            timestamp: health.lastChecked,
          });
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  /**
   * Record request metrics
   */
  private recordRequestMetrics(responseTime: number, isError: boolean): void {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = Date.now();

    // Track response times
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.maxRequestHistory) {
      this.requestTimes.shift();
    }

    // Update average response time
    this.metrics.averageResponseTime =
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;

    // Track slow requests
    if (responseTime > this.metrics.slowRequestThreshold) {
      this.metrics.slowRequestCount++;
    }

    // Track errors
    if (isError) {
      this.errorCount++;
    }

    // Update error rate
    this.metrics.errorRate = (this.errorCount / this.metrics.requestCount) * 100;
  }

  /**
   * Test HTTP service health with a lightweight request
   */
  private async testHttpServiceHealth(): Promise<void> {
    try {
      // Simple connectivity test - just checking if the service is responsive
      const clientInfo = this.httpService.getClientInfo();
      if (!clientInfo || !clientInfo.UserName) {
        throw new Error('HTTP service configuration invalid');
      }
    } catch (error: any) {
      throw new Error(`HTTP service test failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Log performance summary
   */
  private logPerformanceSummary(): void {
    if (this.metrics.requestCount === 0) {
      return;
    }

    const summary = {
      requestCount: this.metrics.requestCount,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      errorRate: Math.round(this.metrics.errorRate * 100) / 100,
      slowRequestCount: this.metrics.slowRequestCount,
      slowRequestPercentage: Math.round((this.metrics.slowRequestCount / this.metrics.requestCount) * 100),
    };

    this.logger.log('Performance Summary (last 5 minutes):', summary);

    // Alert on high error rate or slow requests
    if (summary.errorRate > 10) {
      this.logger.warn(`High error rate detected: ${summary.errorRate}%`);
    }

    if (summary.slowRequestPercentage > 20) {
      this.logger.warn(`High slow request percentage: ${summary.slowRequestPercentage}%`);
    }
  }
}
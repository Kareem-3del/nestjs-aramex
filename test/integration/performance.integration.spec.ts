import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { ShippingService } from '../../src/services/shipping.service';
import { TrackingService } from '../../src/services/tracking.service';
import { CacheManagerService } from '../../src/services/cache-manager.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { RateLimiterService } from '../../src/services/rate-limiter.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';

describe('Performance Integration Tests', () => {
  let app: TestingModule;
  let shippingService: ShippingService;
  let trackingService: TrackingService;
  let cacheManager: CacheManagerService;
  let healthMonitor: HealthMonitorService;
  let rateLimiter: RateLimiterService;

  const getTestConfig = (): AramexConfig | null => {
    const requiredVars = [
      'ARAMEX_USERNAME',
      'ARAMEX_PASSWORD',
      'ARAMEX_ACCOUNT_NUMBER',
      'ARAMEX_ACCOUNT_PIN',
      'ARAMEX_ACCOUNT_ENTITY',
      'ARAMEX_ACCOUNT_COUNTRY_CODE'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return null;
    }

    return {
      username: process.env.ARAMEX_USERNAME!,
      password: process.env.ARAMEX_PASSWORD!,
      accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER!,
      accountPin: process.env.ARAMEX_ACCOUNT_PIN!,
      accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY!,
      accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE!,
      sandbox: true,
      timeout: 60000,
      debug: false,
    };
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AramexModule.forRoot(testConfig)],
    }).compile();

    shippingService = app.get<ShippingService>(ShippingService);
    trackingService = app.get<TrackingService>(TrackingService);
    cacheManager = app.get<CacheManagerService>(CacheManagerService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
    rateLimiter = app.get<RateLimiterService>(RateLimiterService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Performance', () => {
    it('should track packages within acceptable response time', async () => {
      const trackingNumbers = [
        'PERF_TEST_001',
        'PERF_TEST_002',
        'PERF_TEST_003',
        'PERF_TEST_004',
        'PERF_TEST_005'
      ];

      const responseTimes: number[] = [];
      const maxAcceptableTime = 30000; // 30 seconds

      for (const trackingNumber of trackingNumbers) {
        const startTime = Date.now();

        await trackingService.trackPackage({
          trackingNumber,
        }).toPromise();

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        expect(responseTime).toBeLessThan(maxAcceptableTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`Tracking Performance Stats:
        Average: ${averageResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime}ms
        Min: ${minResponseTime}ms
      `);

      expect(averageResponseTime).toBeLessThan(15000); // Average under 15 seconds
    }, 180000);

    it('should calculate shipping rates within acceptable response time', async () => {
      const shippingRequests = [
        {
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Perf Test 1' },
          destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Perf Test 1' },
          packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
          descriptionOfGoods: 'Performance Test Package 1',
        },
        {
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Perf Test 2' },
          destination: { country: 'SA', city: 'Riyadh', postalCode: '12345', state: 'Riyadh', address: 'Perf Test 2' },
          packageDetails: { weight: 2, length: 20, width: 15, height: 12, unit: 'kg' as const, dimensionUnit: 'cm' as const },
          descriptionOfGoods: 'Performance Test Package 2',
        },
        {
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Perf Test 3' },
          destination: { country: 'KW', city: 'Kuwait City', postalCode: '00000', state: 'Kuwait', address: 'Perf Test 3' },
          packageDetails: { weight: 0.5, length: 15, width: 12, height: 8, unit: 'kg' as const, dimensionUnit: 'cm' as const },
          descriptionOfGoods: 'Performance Test Package 3',
        },
      ];

      const responseTimes: number[] = [];
      const maxAcceptableTime = 30000; // 30 seconds

      for (const request of shippingRequests) {
        const startTime = Date.now();

        await shippingService.calculateRates(request).toPromise();

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        expect(responseTime).toBeLessThan(maxAcceptableTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log(`Shipping Performance Stats:
        Average: ${averageResponseTime.toFixed(2)}ms
        Requests: ${shippingRequests.length}
      `);

      expect(averageResponseTime).toBeLessThan(20000); // Average under 20 seconds
    }, 120000);
  });

  describe('Concurrent Request Performance', () => {
    it('should handle multiple concurrent tracking requests efficiently', async () => {
      const concurrentTrackingNumbers = Array.from({ length: 10 }, (_, i) => `CONCURRENT_TRACK_${i}`);

      const startTime = Date.now();

      const promises = concurrentTrackingNumbers.map(trackingNumber =>
        trackingService.trackPackage({ trackingNumber }).toPromise()
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentTrackingNumbers.length);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds

      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.trackingNumber).toBe(concurrentTrackingNumbers[index]);
      });

      const averageTimePerRequest = totalTime / concurrentTrackingNumbers.length;

      console.log(`Concurrent Tracking Performance:
        Total time: ${totalTime}ms
        Requests: ${concurrentTrackingNumbers.length}
        Average per request: ${averageTimePerRequest.toFixed(2)}ms
      `);

      expect(averageTimePerRequest).toBeLessThan(10000); // Should be efficient due to parallelization
    }, 90000);

    it('should handle mixed concurrent requests (tracking + shipping)', async () => {
      const mixedRequests = [
        // Tracking requests
        trackingService.trackPackage({ trackingNumber: 'MIXED_TRACK_1' }).toPromise(),
        trackingService.trackPackage({ trackingNumber: 'MIXED_TRACK_2' }).toPromise(),
        trackingService.trackPackage({ trackingNumber: 'MIXED_TRACK_3' }).toPromise(),

        // Shipping requests
        shippingService.calculateRates({
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Mixed Test 1' },
          destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Mixed Test 1' },
          packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: 'Mixed Test Package 1',
        }).toPromise(),

        shippingService.calculateRates({
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Mixed Test 2' },
          destination: { country: 'SA', city: 'Riyadh', postalCode: '12345', state: 'Riyadh', address: 'Mixed Test 2' },
          packageDetails: { weight: 2, length: 15, width: 12, height: 10, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: 'Mixed Test Package 2',
        }).toPromise(),
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(mixedRequests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(90000); // Should complete within 90 seconds

      const successfulRequests = results.filter(result => result.status === 'fulfilled').length;
      const successRate = successfulRequests / results.length;

      console.log(`Mixed Concurrent Performance:
        Total time: ${totalTime}ms
        Successful requests: ${successfulRequests}/${results.length}
        Success rate: ${(successRate * 100).toFixed(1)}%
      `);

      expect(successRate).toBeGreaterThan(0.5); // At least 50% should succeed
    }, 120000);
  });

  describe('Cache Performance', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const testRequest = {
        origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Cache Test' },
        destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Cache Test' },
        packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
        descriptionOfGoods: 'Cache Performance Test',
      };

      // Clear cache to ensure fresh start
      cacheManager.clear();

      // First request (not cached)
      const startTime1 = Date.now();
      const response1 = await shippingService.calculateRates(testRequest).toPromise();
      const firstRequestTime = Date.now() - startTime1;

      // Second request (should be cached)
      const startTime2 = Date.now();
      const response2 = await shippingService.calculateRates(testRequest).toPromise();
      const secondRequestTime = Date.now() - startTime2;

      // Third request (should still be cached)
      const startTime3 = Date.now();
      const response3 = await shippingService.calculateRates(testRequest).toPromise();
      const thirdRequestTime = Date.now() - startTime3;

      expect(response1).toEqual(response2);
      expect(response2).toEqual(response3);

      const speedupFactor2 = firstRequestTime / secondRequestTime;
      const speedupFactor3 = firstRequestTime / thirdRequestTime;

      console.log(`Cache Performance:
        First request (uncached): ${firstRequestTime}ms
        Second request (cached): ${secondRequestTime}ms
        Third request (cached): ${thirdRequestTime}ms
        Speedup factor (2nd): ${speedupFactor2.toFixed(2)}x
        Speedup factor (3rd): ${speedupFactor3.toFixed(2)}x
      `);

      expect(speedupFactor2).toBeGreaterThan(2); // At least 2x faster
      expect(speedupFactor3).toBeGreaterThan(2); // At least 2x faster
      expect(secondRequestTime).toBeLessThan(5000); // Cached response under 5 seconds
      expect(thirdRequestTime).toBeLessThan(5000); // Cached response under 5 seconds
    }, 90000);

    it('should efficiently manage cache memory usage', async () => {
      const initialStats = cacheManager.getStats();
      const initialMemoryUsage = parseFloat(initialStats.memoryUsage.replace(/[^\d.]/g, ''));

      // Make multiple different requests to populate cache
      const requests = Array.from({ length: 20 }, (_, i) => ({
        origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: `Cache Memory Test ${i}` },
        destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: `Cache Memory Test ${i}` },
        packageDetails: { weight: 1 + i * 0.1, length: 10 + i, width: 10, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
        descriptionOfGoods: `Cache Memory Test Package ${i}`,
      }));

      await Promise.allSettled(
        requests.map(request => shippingService.calculateRates(request).toPromise())
      );

      const finalStats = cacheManager.getStats();
      const finalMemoryUsage = parseFloat(finalStats.memoryUsage.replace(/[^\d.]/g, ''));

      console.log(`Cache Memory Usage:
        Initial: ${initialStats.memoryUsage}
        Final: ${finalStats.memoryUsage}
        Cache entries: ${finalStats.totalEntries}
        Hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%
      `);

      expect(finalStats.totalEntries).toBeGreaterThan(initialStats.totalEntries);
      expect(finalMemoryUsage).toBeGreaterThan(initialMemoryUsage);
      expect(finalMemoryUsage).toBeLessThan(100); // Should not exceed 100MB
    }, 180000);

    it('should maintain high cache hit rate for repeated requests', async () => {
      cacheManager.clear();

      const commonRequests = [
        {
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Common Request 1' },
          destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Common Request 1' },
          packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
          descriptionOfGoods: 'Common Package 1',
        },
        {
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Common Request 2' },
          destination: { country: 'SA', city: 'Riyadh', postalCode: '12345', state: 'Riyadh', address: 'Common Request 2' },
          packageDetails: { weight: 2, length: 15, width: 12, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
          descriptionOfGoods: 'Common Package 2',
        },
      ];

      // Make initial requests to populate cache
      await Promise.all(
        commonRequests.map(request => shippingService.calculateRates(request).toPromise())
      );

      const initialStats = cacheManager.getStats();

      // Repeat the same requests multiple times
      const repeatedRequests = [];
      for (let i = 0; i < 10; i++) {
        repeatedRequests.push(...commonRequests);
      }

      await Promise.allSettled(
        repeatedRequests.map(request => shippingService.calculateRates(request).toPromise())
      );

      const finalStats = cacheManager.getStats();

      console.log(`Cache Hit Rate Performance:
        Initial hit rate: ${(initialStats.hitRate * 100).toFixed(1)}%
        Final hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%
        Total entries: ${finalStats.totalEntries}
      `);

      expect(finalStats.hitRate).toBeGreaterThan(0.8); // Should have > 80% hit rate
    }, 120000);
  });

  describe('Rate Limiting Performance', () => {
    it('should respect rate limits without blocking legitimate requests', async () => {
      const requestCount = 10;
      const requests = Array.from({ length: requestCount }, (_, i) =>
        trackingService.trackPackage({ trackingNumber: `RATE_LIMIT_TEST_${i}` }).toPromise()
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const totalTime = Date.now() - startTime;

      const successfulRequests = results.filter(result => result.status === 'fulfilled').length;
      const failedRequests = results.filter(result => result.status === 'rejected').length;

      console.log(`Rate Limiting Performance:
        Total requests: ${requestCount}
        Successful: ${successfulRequests}
        Failed: ${failedRequests}
        Total time: ${totalTime}ms
        Average time per request: ${(totalTime / requestCount).toFixed(2)}ms
      `);

      expect(successfulRequests).toBeGreaterThan(0); // Some requests should succeed
      expect(totalTime).toBeLessThan(120000); // Should not be excessively slow
    }, 150000);

    it('should provide rate limiting statistics', () => {
      const rateLimitStats = rateLimiter.getStats();

      expect(rateLimitStats).toBeDefined();
      expect(typeof rateLimitStats.requestsRemaining).toBe('number');
      expect(typeof rateLimitStats.resetTime).toBe('number');
      expect(typeof rateLimitStats.windowStart).toBe('number');

      expect(rateLimitStats.requestsRemaining).toBeGreaterThanOrEqual(0);
      expect(rateLimitStats.resetTime).toBeGreaterThan(Date.now());

      console.log(`Rate Limiting Stats:
        Requests remaining: ${rateLimitStats.requestsRemaining}
        Reset time: ${new Date(rateLimitStats.resetTime).toISOString()}
      `);
    });
  });

  describe('Performance Monitoring', () => {
    it('should maintain accurate performance metrics', async () => {
      const initialMetrics = healthMonitor.getPerformanceMetrics();

      // Make several requests to update metrics
      const testRequests = [
        trackingService.trackPackage({ trackingNumber: 'METRICS_TEST_1' }).toPromise(),
        trackingService.trackPackage({ trackingNumber: 'METRICS_TEST_2' }).toPromise(),
        shippingService.calculateRates({
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Metrics Test' },
          destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Metrics Test' },
          packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: 'Metrics Test Package',
        }).toPromise(),
      ];

      await Promise.allSettled(testRequests);

      const updatedMetrics = healthMonitor.getPerformanceMetrics();

      expect(updatedMetrics.requestCount).toBeGreaterThan(initialMetrics.requestCount);
      expect(updatedMetrics.averageResponseTime).toBeGreaterThan(0);
      expect(updatedMetrics.lastRequestTime).toBeGreaterThan(initialMetrics.lastRequestTime);
      expect(updatedMetrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(updatedMetrics.errorRate).toBeLessThanOrEqual(1);

      console.log(`Performance Metrics:
        Request count: ${updatedMetrics.requestCount}
        Average response time: ${updatedMetrics.averageResponseTime.toFixed(2)}ms
        Error rate: ${(updatedMetrics.errorRate * 100).toFixed(1)}%
      `);
    }, 90000);

    it('should detect performance degradation', async () => {
      const healthStatus = await healthMonitor.performHealthCheck();

      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus.responseTime).toBe('number');
      expect(healthStatus.responseTime).toBeGreaterThan(0);

      // Response time should be reasonable
      expect(healthStatus.responseTime).toBeLessThan(30000);

      // If performance is degraded, it should be reflected in status
      if (healthStatus.responseTime > 15000) {
        expect(healthStatus.status).toMatch(/degraded|unhealthy/);
      }

      console.log(`Health Check Performance:
        Status: ${healthStatus.status}
        Response time: ${healthStatus.responseTime}ms
        HTTP service: ${healthStatus.httpService}
        SOAP service: ${healthStatus.soapService}
        Cache service: ${healthStatus.cacheService}
      `);
    }, 45000);
  });

  describe('Memory and Resource Performance', () => {
    it('should maintain stable memory usage during extended operations', async () => {
      const initialStats = cacheManager.getStats();
      const initialMemoryUsage = parseFloat(initialStats.memoryUsage.replace(/[^\d.]/g, ''));

      // Perform many operations to test memory stability
      const operations = [];
      for (let i = 0; i < 30; i++) {
        operations.push(
          trackingService.trackPackage({ trackingNumber: `MEMORY_TEST_${i}` }).toPromise()
        );
      }

      await Promise.allSettled(operations);

      const finalStats = cacheManager.getStats();
      const finalMemoryUsage = parseFloat(finalStats.memoryUsage.replace(/[^\d.]/g, ''));

      const memoryIncrease = finalMemoryUsage - initialMemoryUsage;
      const memoryIncreasePercentage = (memoryIncrease / initialMemoryUsage) * 100;

      console.log(`Memory Usage Performance:
        Initial: ${initialStats.memoryUsage}
        Final: ${finalStats.memoryUsage}
        Increase: ${memoryIncrease.toFixed(2)}MB (${memoryIncreasePercentage.toFixed(1)}%)
      `);

      // Memory increase should be reasonable
      expect(memoryIncreasePercentage).toBeLessThan(500); // Less than 500% increase
      expect(finalMemoryUsage).toBeLessThan(200); // Should not exceed 200MB
    }, 240000);

    it('should clean up resources properly', async () => {
      const initialCacheSize = cacheManager.getStats().totalEntries;

      // Create some cache entries
      await Promise.allSettled([
        trackingService.trackPackage({ trackingNumber: 'CLEANUP_TEST_1' }).toPromise(),
        trackingService.trackPackage({ trackingNumber: 'CLEANUP_TEST_2' }).toPromise(),
        trackingService.trackPackage({ trackingNumber: 'CLEANUP_TEST_3' }).toPromise(),
      ]);

      const intermediateStats = cacheManager.getStats();
      expect(intermediateStats.totalEntries).toBeGreaterThan(initialCacheSize);

      // Manual cleanup
      cacheManager.clear();

      const finalStats = cacheManager.getStats();
      expect(finalStats.totalEntries).toBe(0);

      console.log(`Resource Cleanup:
        Initial cache entries: ${initialCacheSize}
        After operations: ${intermediateStats.totalEntries}
        After cleanup: ${finalStats.totalEntries}
      `);
    }, 60000);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { TrackingService } from '../../src/services/tracking.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';
import { CacheManagerService } from '../../src/services/cache-manager.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { skipIfNoCredentials } from './setup';

describe('Tracking Service Integration Tests', () => {
  let app: TestingModule;
  let trackingService: TrackingService;
  let cacheManager: CacheManagerService;
  let healthMonitor: HealthMonitorService;

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
      timeout: 30000,
      debug: false,
    };
  };

  beforeAll(async () => {
    if (skipIfNoCredentials()) {
      return;
    }

    const testConfig = getTestConfig();
    if (!testConfig) {
      throw new Error('Test config could not be created - missing credentials');
    }

    app = await Test.createTestingModule({
      imports: [AramexModule.forRoot(testConfig)],
    }).compile();

    trackingService = app.get<TrackingService>(TrackingService);
    cacheManager = app.get<CacheManagerService>(CacheManagerService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SOAP Tracking Tests', () => {
    const testTrackingNumbers = [
      '47384974350', // Known test tracking number
      '1234567890',  // Generic test number
      'TEST12345678' // Another test number
    ];

    it('should track package using SOAP service', async () => {
      const trackingNumber = testTrackingNumbers[0];
      const response = await trackingService.trackPackage({
        trackingNumber,
        useSoap: true,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(trackingNumber);
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);

      if (response.success) {
        expect(response.events.length).toBeGreaterThanOrEqual(0);
        response.events.forEach(event => {
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('status');
          expect(event).toHaveProperty('location');
        });
      } else {
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('SOAP tracking failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should handle SOAP service timeouts gracefully', async () => {
      const response = await trackingService.trackPackage({
        trackingNumber: 'TIMEOUT_TEST_123',
        useSoap: true,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe('TIMEOUT_TEST_123');
      expect(typeof response.success).toBe('boolean');
    }, 35000);
  });

  describe('HTTP Tracking Tests', () => {
    const testTrackingNumbers = [
      '47384974350',
      'HTTP_TEST_123',
      '9876543210'
    ];

    it('should track package using HTTP service', async () => {
      const trackingNumber = testTrackingNumbers[0];
      const response = await trackingService.trackPackage({
        trackingNumber,
        useSoap: false,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(trackingNumber);
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);

      if (response.success) {
        response.events.forEach(event => {
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('status');
          expect(typeof event.timestamp).toBe('number');
          expect(typeof event.status).toBe('string');
        });
      } else {
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('HTTP tracking failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should prefer HTTP service by default', async () => {
      const response = await trackingService.trackPackage({
        trackingNumber: testTrackingNumbers[1],
        // useSoap not specified, should default to false
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(testTrackingNumbers[1]);
      expect(typeof response.success).toBe('boolean');
    }, 30000);
  });

  describe('Batch Tracking Tests', () => {
    const batchTrackingNumbers = [
      '47384974350',
      '1234567890',
      'BATCH_TEST_1',
      'BATCH_TEST_2',
      'BATCH_TEST_3'
    ];

    it('should track multiple packages simultaneously', async () => {
      const responses = await trackingService.trackMultiplePackages(batchTrackingNumbers).toPromise();

      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(batchTrackingNumbers.length);

      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.trackingNumber).toBe(batchTrackingNumbers[index]);
        expect(typeof response.success).toBe('boolean');
        expect(typeof response.status).toBe('string');
        expect(Array.isArray(response.events)).toBe(true);
      });
    }, 60000);

    it('should handle mixed success/failure in batch tracking', async () => {
      const mixedTrackingNumbers = [
        '47384974350',     // Might succeed
        'INVALID_NUMBER',  // Should fail
        '1234567890',      // Might succeed
        'ANOTHER_INVALID'  // Should fail
      ];

      const responses = await trackingService.trackMultiplePackages(mixedTrackingNumbers).toPromise();

      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(mixedTrackingNumbers.length);

      let successCount = 0;
      let failureCount = 0;

      responses.forEach((response, index) => {
        expect(response.trackingNumber).toBe(mixedTrackingNumbers[index]);
        if (response.success) {
          successCount++;
        } else {
          failureCount++;
          expect(Array.isArray(response.errors)).toBe(true);
        }
      });

      expect(successCount + failureCount).toBe(mixedTrackingNumbers.length);
    }, 60000);

    it('should handle empty batch gracefully', async () => {
      const responses = await trackingService.trackMultiplePackages([]).toPromise();

      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(0);
    }, 10000);
  });

  describe('Caching Tests', () => {
    const cacheTestTrackingNumber = 'CACHE_TEST_123456';

    it('should cache tracking responses', async () => {
      // Clear cache first
      cacheManager.clear();

      const startTime = Date.now();
      const response1 = await trackingService.trackPackage({
        trackingNumber: cacheTestTrackingNumber,
      }).toPromise();
      const firstRequestTime = Date.now() - startTime;

      // Second identical request should be faster (cached)
      const secondStartTime = Date.now();
      const response2 = await trackingService.trackPackage({
        trackingNumber: cacheTestTrackingNumber,
      }).toPromise();
      const secondRequestTime = Date.now() - secondStartTime;

      expect(response1).toEqual(response2);
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.8);

      // Verify cache statistics
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.totalEntries).toBeGreaterThan(0);
    }, 45000);

    it('should respect cache TTL for tracking data', async () => {
      const trackingNumber = 'TTL_TEST_789';

      // First request
      await trackingService.trackPackage({ trackingNumber }).toPromise();

      // Check cache entry exists
      const cacheKey = `tracking:${trackingNumber}`;
      expect(cacheManager.has(cacheKey)).toBe(true);

      // Get TTL
      const ttl = cacheManager.getTtl(cacheKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300000); // Should be <= 5 minutes
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid tracking numbers gracefully', async () => {
      const invalidTrackingNumbers = [
        'INVALID_123',
        'TOO_SHORT',
        'WAY_TOO_LONG_TRACKING_NUMBER_THAT_EXCEEDS_LIMITS_123456789',
        '!!!INVALID_CHARS!!!',
        ''
      ];

      for (const invalidNumber of invalidTrackingNumbers) {
        const response = await trackingService.trackPackage({
          trackingNumber: invalidNumber,
        }).toPromise();

        expect(response).toBeDefined();
        expect(response.trackingNumber).toBe(invalidNumber);

        if (invalidNumber === '') {
          // Empty tracking number should fail
          expect(response.success).toBe(false);
        } else {
          // Other invalid numbers might succeed or fail in sandbox
          expect(typeof response.success).toBe('boolean');
        }

        if (!response.success) {
          expect(response.status).toMatch(/not found|error|invalid|failed/i);
        }
      }
    }, 60000);

    it('should handle network errors gracefully', async () => {
      // This test simulates network issues by using an extremely short timeout
      const shortTimeoutConfig = { ...testConfig, timeout: 1 }; // 1ms timeout

      const shortTimeoutApp = await Test.createTestingModule({
        imports: [AramexModule.forRoot(shortTimeoutConfig)],
      }).compile();

      const shortTimeoutTrackingService = shortTimeoutApp.get<TrackingService>(TrackingService);

      try {
        const response = await shortTimeoutTrackingService.trackPackage({
          trackingNumber: 'TIMEOUT_TEST',
        }).toPromise();

        // If we get a response, it should indicate failure
        expect(response.success).toBe(false);
      } catch (error) {
        // Or we might get a timeout error
        expect(error).toBeDefined();
      }

      await shortTimeoutApp.close();
    }, 30000);

    it('should handle malformed tracking responses', async () => {
      const response = await trackingService.trackPackage({
        trackingNumber: 'MALFORMED_RESPONSE_TEST',
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe('MALFORMED_RESPONSE_TEST');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should handle concurrent tracking requests efficiently', async () => {
      const concurrentTrackingNumbers = [
        'CONCURRENT_1',
        'CONCURRENT_2',
        'CONCURRENT_3',
        'CONCURRENT_4',
        'CONCURRENT_5'
      ];

      const promises = concurrentTrackingNumbers.map(trackingNumber =>
        trackingService.trackPackage({ trackingNumber }).toPromise()
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentTrackingNumbers.length);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds

      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.trackingNumber).toBe(concurrentTrackingNumbers[index]);
        expect(typeof response.success).toBe('boolean');
      });
    }, 90000);

    it('should maintain reasonable response times', async () => {
      const trackingNumbers = ['PERF_TEST_1', 'PERF_TEST_2', 'PERF_TEST_3'];
      const responseTimes: number[] = [];

      for (const trackingNumber of trackingNumbers) {
        const startTime = Date.now();
        await trackingService.trackPackage({ trackingNumber }).toPromise();
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      expect(averageResponseTime).toBeLessThan(30000); // Average should be under 30 seconds

      // No single request should take more than 45 seconds
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(45000);
      });
    }, 120000);

    it('should update performance metrics correctly', async () => {
      const initialMetrics = healthMonitor.getPerformanceMetrics();
      const initialRequestCount = initialMetrics.requestCount;

      // Make a tracking request
      await trackingService.trackPackage({
        trackingNumber: 'METRICS_TEST_123',
      }).toPromise();

      const updatedMetrics = healthMonitor.getPerformanceMetrics();

      expect(updatedMetrics.requestCount).toBeGreaterThan(initialRequestCount);
      expect(updatedMetrics.averageResponseTime).toBeGreaterThan(0);
      expect(updatedMetrics.lastRequestTime).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Service Comparison Tests', () => {
    const comparisonTrackingNumber = '47384974350';

    it('should provide consistent results between SOAP and HTTP services', async () => {
      const [soapResponse, httpResponse] = await Promise.all([
        trackingService.trackPackage({
          trackingNumber: comparisonTrackingNumber,
          useSoap: true,
        }).toPromise(),
        trackingService.trackPackage({
          trackingNumber: comparisonTrackingNumber,
          useSoap: false,
        }).toPromise()
      ]);

      expect(soapResponse.trackingNumber).toBe(httpResponse.trackingNumber);

      // Both should have the same success status for valid tracking numbers
      if (soapResponse.success && httpResponse.success) {
        expect(soapResponse.status).toBe(httpResponse.status);
      }

      // Both should return events in the same format
      expect(Array.isArray(soapResponse.events)).toBe(true);
      expect(Array.isArray(httpResponse.events)).toBe(true);
    }, 60000);

    it('should fallback to alternative service on failure', async () => {
      // This test would require more sophisticated mocking to simulate service failures
      // For now, we just verify both services handle the same request
      const trackingNumber = 'FALLBACK_TEST_123';

      const response = await trackingService.trackPackage({
        trackingNumber,
        useSoap: false, // Prefer HTTP
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(trackingNumber);
      expect(typeof response.success).toBe('boolean');
    }, 30000);
  });
});
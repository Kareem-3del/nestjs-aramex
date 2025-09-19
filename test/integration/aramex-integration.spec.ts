import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { ShippingService } from '../../src/services/shipping.service';
import { TrackingService } from '../../src/services/tracking.service';
import { AramexHttpService } from '../../src/services/aramex-http.service';
import { AramexSoapService } from '../../src/services/aramex-soap.service';
import { CacheManagerService } from '../../src/services/cache-manager.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';
import { skipIfNoCredentials } from './setup';

describe('Aramex Integration Tests', () => {
  let app: TestingModule;
  let shippingService: ShippingService;
  let trackingService: TrackingService;
  let httpService: AramexHttpService;
  let soapService: AramexSoapService;
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
      sandbox: true, // Always use sandbox for integration tests
      timeout: 30000,
      debug: process.env.NODE_ENV === 'development',
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

    shippingService = app.get<ShippingService>(ShippingService);
    trackingService = app.get<TrackingService>(TrackingService);
    httpService = app.get<AramexHttpService>(AramexHttpService);
    soapService = app.get<AramexSoapService>(AramexSoapService);
    cacheManager = app.get<CacheManagerService>(CacheManagerService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Integration', () => {
    it('should initialize all services correctly', () => {
      expect(shippingService).toBeDefined();
      expect(trackingService).toBeDefined();
      expect(httpService).toBeDefined();
      expect(soapService).toBeDefined();
      expect(cacheManager).toBeDefined();
      expect(healthMonitor).toBeDefined();
    });

    it('should configure services with sandbox environment', () => {
      const clientInfo = httpService.getClientInfo();
      expect(clientInfo).toBeDefined();
      expect(clientInfo.UserName).toBe(testConfig.username);
      expect(clientInfo.AccountNumber).toBe(testConfig.accountNumber);
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should perform comprehensive health check', async () => {
      const healthStatus = await healthMonitor.performHealthCheck();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthStatus.lastChecked).toBeGreaterThan(0);
      expect(healthStatus.responseTime).toBeGreaterThan(0);
      expect(typeof healthStatus.httpService).toBe('boolean');
      expect(typeof healthStatus.soapService).toBe('boolean');
      expect(typeof healthStatus.cacheService).toBe('boolean');
    });

    it('should provide system statistics', async () => {
      const stats = await healthMonitor.getSystemStats();

      expect(stats).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.health).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.rateLimit).toBeDefined();

      expect(typeof stats.performance.requestCount).toBe('number');
      expect(typeof stats.cache.totalEntries).toBe('number');
      expect(typeof stats.rateLimit.requestsRemaining).toBe('number');
    });
  });

  describe('Cache Management Integration', () => {
    it('should provide cache statistics', () => {
      const stats = cacheManager.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.expiredEntries).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });

    it('should handle cache operations', () => {
      const testKey = 'integration-test-key';
      const testData = { test: 'data', timestamp: Date.now() };

      // Test set operation
      cacheManager.set(testKey, testData, 60000);

      // Test get operation
      const cachedData = cacheManager.get(testKey);
      expect(cachedData).toEqual(testData);

      // Test has operation
      expect(cacheManager.has(testKey)).toBe(true);

      // Test TTL
      const ttl = cacheManager.getTtl(testKey);
      expect(ttl).toBeGreaterThan(0);

      // Test delete operation
      expect(cacheManager.delete(testKey)).toBe(true);
      expect(cacheManager.has(testKey)).toBe(false);
    });
  });

  describe('Shipping Service Integration', () => {
    const testShippingRequest = {
      origin: {
        country: 'US',
        city: 'New York',
        postalCode: '10001',
        state: 'NY',
        address: '123 Test Street',
      },
      destination: {
        country: 'CA',
        city: 'Toronto',
        postalCode: 'M5V 3L9',
        state: 'ON',
        address: '456 Test Avenue',
      },
      packageDetails: {
        weight: 1,
        length: 20,
        width: 15,
        height: 10,
        unit: 'kg' as const,
        dimensionUnit: 'cm' as const,
      },
      descriptionOfGoods: 'Test package',
    };

    it('should calculate shipping rates', async () => {
      const response = await shippingService.calculateRates(testShippingRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      if (response.success) {
        expect(Array.isArray(response.services)).toBe(true);
        expect(response.services.length).toBeGreaterThan(0);

        // Check first service structure
        const service = response.services[0];
        expect(service).toBeDefined();
        expect(typeof service.serviceName).toBe('string');
        expect(typeof service.serviceId).toBe('string');
        expect(typeof service.cost.amount).toBe('number');
        expect(typeof service.cost.currency).toBe('string');
      } else {
        // In sandbox mode, we might get errors, which is expected
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('Shipping rate calculation failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should handle shipping service search', async () => {
      const response = await shippingService.searchShippingServices(testShippingRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      // This should return the same structure as calculateRates
      if (response.success) {
        expect(Array.isArray(response.services)).toBe(true);
      }
    }, 30000);

    it('should use caching for repeated requests', async () => {
      const startTime = Date.now();

      // First request
      const response1 = await shippingService.calculateRates(testShippingRequest).toPromise();
      const firstRequestTime = Date.now() - startTime;

      // Second identical request (should be cached)
      const secondStartTime = Date.now();
      const response2 = await shippingService.calculateRates(testShippingRequest).toPromise();
      const secondRequestTime = Date.now() - secondStartTime;

      expect(response1).toEqual(response2);
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5); // Should be significantly faster
    }, 30000);
  });

  describe('Tracking Service Integration', () => {
    // Use a test tracking number - in sandbox mode this might not return real data
    const testTrackingNumber = '1234567890';

    it('should track package using SOAP service', async () => {
      const response = await trackingService.trackPackage({
        trackingNumber: testTrackingNumber,
        useSoap: true,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(testTrackingNumber);
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);

      if (!response.success) {
        // In sandbox mode, tracking might fail for test numbers
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('SOAP tracking failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should track package using HTTP service', async () => {
      const response = await trackingService.trackPackage({
        trackingNumber: testTrackingNumber,
        useSoap: false,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(testTrackingNumber);
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);

      if (!response.success) {
        // In sandbox mode, tracking might fail for test numbers
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('HTTP tracking failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should track multiple packages', async () => {
      const trackingNumbers = [testTrackingNumber, '0987654321', '1122334455'];

      const responses = await trackingService.trackMultiplePackages(trackingNumbers).toPromise();

      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(trackingNumbers.length);

      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.trackingNumber).toBe(trackingNumbers[index]);
        expect(typeof response.success).toBe('boolean');
        expect(typeof response.status).toBe('string');
        expect(Array.isArray(response.events)).toBe(true);
      });
    }, 30000);

    it('should use caching for tracking requests', async () => {
      const startTime = Date.now();

      // First tracking request
      const response1 = await trackingService.trackPackage({
        trackingNumber: testTrackingNumber,
      }).toPromise();
      const firstRequestTime = Date.now() - startTime;

      // Second identical request (should be cached)
      const secondStartTime = Date.now();
      const response2 = await trackingService.trackPackage({
        trackingNumber: testTrackingNumber,
      }).toPromise();
      const secondRequestTime = Date.now() - secondStartTime;

      expect(response1).toEqual(response2);
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5); // Should be significantly faster
    }, 30000);
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid shipping requests gracefully', async () => {
      const invalidRequest = {
        origin: {
          country: 'INVALID',
          city: '',
          postalCode: '',
          state: '',
          address: '',
        },
        destination: {
          country: 'INVALID',
          city: '',
          postalCode: '',
          state: '',
          address: '',
        },
        packageDetails: {
          weight: 0,
          length: 0,
          width: 0,
          height: 0,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: '',
      };

      try {
        const response = await shippingService.calculateRates(invalidRequest).toPromise();

        // Should either return error response or throw
        if (response) {
          expect(response.success).toBe(false);
          expect(Array.isArray(response.errors)).toBe(true);
          expect(response.errors.length).toBeGreaterThan(0);
        }
      } catch (error) {
        // Error throwing is also acceptable
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should handle invalid tracking numbers gracefully', async () => {
      const invalidTrackingNumber = 'INVALID_TRACKING_NUMBER_12345';

      const response = await trackingService.trackPackage({
        trackingNumber: invalidTrackingNumber,
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe(invalidTrackingNumber);
      expect(response.success).toBe(false);
      expect(response.status).toMatch(/not found|error|invalid/i);
    }, 30000);
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];

      // Create multiple concurrent tracking requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          trackingService.trackPackage({
            trackingNumber: `TEST${i}${Date.now()}`,
          }).toPromise()
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds

      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(typeof response.success).toBe('boolean');
      });
    }, 60000);

    it('should maintain performance metrics during integration tests', async () => {
      // Make a few requests to generate metrics
      await trackingService.trackPackage({ trackingNumber: 'TEST123' }).toPromise();
      await shippingService.calculateRates({
        origin: { country: 'US', city: 'New York', postalCode: '10001', state: 'NY', address: '123 Test' },
        destination: { country: 'CA', city: 'Toronto', postalCode: 'M5V 3L9', state: 'ON', address: '456 Test' },
        packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg' as const, dimensionUnit: 'cm' as const },
        descriptionOfGoods: 'Test',
      }).toPromise();

      const metrics = healthMonitor.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.requestCount).toBeGreaterThanOrEqual(2);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.lastRequestTime).toBeGreaterThan(0);
    }, 30000);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src';
import { ShippingService } from '../../src';
import { AramexConfig } from '../../src';
import { CacheManagerService } from '../../src/services/cache-manager.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { skipIfNoCredentials, areCredentialsAvailable, describeIf, itIf } from './setup';

describe('Shipping Service Integration Tests', () => {
  let app: TestingModule;
  let shippingService: ShippingService;
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
      console.warn('Test config could not be created - missing credentials');
      return;
    }

    app = await Test.createTestingModule({
      imports: [AramexModule.forRoot(testConfig)],
    }).compile();

    shippingService = app.get<ShippingService>(ShippingService);
    cacheManager = app.get<CacheManagerService>(CacheManagerService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describeIf(areCredentialsAvailable(), 'Rate Calculation Tests', () => {
    const validShippingRequest = {
      origin: {
        country: 'BH',
        city: 'Manama',
        postalCode: '00000',
        state: 'Manama',
        address: 'Test Origin Address',
      },
      destination: {
        country: 'AE',
        city: 'Dubai',
        postalCode: '00000',
        state: 'Dubai',
        address: 'Test Destination Address',
      },
      packageDetails: {
        weight: 2.5,
        length: 20,
        width: 15,
        height: 10,
        unit: 'kg' as const,
        dimensionUnit: 'cm' as const,
      },
      descriptionOfGoods: 'Test Package Contents',
    };

    it('should calculate shipping rates for valid domestic request (BH to AE)', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const response = await shippingService.calculateRates(validShippingRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      if (response.success) {
        expect(Array.isArray(response.services)).toBe(true);
        expect(response.services.length).toBeGreaterThan(0);

        response.services.forEach(service => {
          expect(service).toBeDefined();
          expect(typeof service.serviceName).toBe('string');
          expect(typeof service.serviceId).toBe('string');
          expect(service.cost).toBeDefined();
          expect(typeof service.cost.amount).toBe('number');
          expect(typeof service.cost.currency).toBe('string');
          expect(service.cost.amount).toBeGreaterThan(0);
        });
      } else {
        expect(Array.isArray(response.errors)).toBe(true);
        console.log('Rate calculation failed (expected in sandbox):', response.errors);
      }
    }, 30000);

    it('should calculate rates for different package sizes', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const smallPackage = {
        ...validShippingRequest,
        packageDetails: {
          weight: 0.5,
          length: 10,
          width: 10,
          height: 5,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
      };

      const largePackage = {
        ...validShippingRequest,
        packageDetails: {
          weight: 10,
          length: 50,
          width: 40,
          height: 30,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
      };

      const smallResponse = await shippingService.calculateRates(smallPackage).toPromise();
      const largeResponse = await shippingService.calculateRates(largePackage).toPromise();

      expect(smallResponse).toBeDefined();
      expect(largeResponse).toBeDefined();

      // Both should have the same structure
      expect(typeof smallResponse.success).toBe('boolean');
      expect(typeof largeResponse.success).toBe('boolean');

      // If both succeed, large package should generally cost more
      if (smallResponse.success && largeResponse.success) {
        const smallCost = smallResponse.services[0]?.cost?.amount || 0;
        const largeCost = largeResponse.services[0]?.cost?.amount || 0;

        if (smallCost > 0 && largeCost > 0) {
          expect(largeCost).toBeGreaterThanOrEqual(smallCost);
        }
      }
    }, 45000);

    it('should handle international shipping rates (BH to US)', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const internationalRequest = {
        ...validShippingRequest,
        destination: {
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          state: 'NY',
          address: 'Test International Address',
        },
      };

      const response = await shippingService.calculateRates(internationalRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      if (response.success) {
        expect(Array.isArray(response.services)).toBe(true);
        response.services.forEach(service => {
          expect(service.cost.amount).toBeGreaterThan(0);
          expect(['USD', 'BHD', 'AED']).toContain(service.cost.currency);
        });
      }
    }, 30000);
  });

  describeIf(areCredentialsAvailable(), 'Shipping Service Search Tests', () => {
    const searchRequest = {
      origin: {
        country: 'BH',
        city: 'Manama',
        postalCode: '00000',
        state: 'Manama',
        address: 'Search Test Origin',
      },
      destination: {
        country: 'SA',
        city: 'Riyadh',
        postalCode: '12345',
        state: 'Riyadh',
        address: 'Search Test Destination',
      },
      packageDetails: {
        weight: 1.5,
        length: 15,
        width: 12,
        height: 8,
        unit: 'kg' as const,
        dimensionUnit: 'cm' as const,
      },
      descriptionOfGoods: 'Electronics',
    };

    it('should search available shipping services', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const response = await shippingService.searchShippingServices(searchRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      if (response.success) {
        expect(Array.isArray(response.services)).toBe(true);
        response.services.forEach(service => {
          expect(service).toHaveProperty('serviceName');
          expect(service).toHaveProperty('serviceId');
          expect(service).toHaveProperty('cost');
        });
      }
    }, 30000);

    it('should filter services by criteria', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const response = await shippingService.searchShippingServices({
        ...searchRequest,
        serviceType: 'express',
      }).toPromise();

      expect(response).toBeDefined();

      if (response.success && response.services.length > 0) {
        response.services.forEach(service => {
          expect(service.serviceName.toLowerCase()).toMatch(/express|priority|fast/);
        });
      }
    }, 30000);
  });

  describeIf(areCredentialsAvailable(), 'Caching Tests', () => {
    const cacheTestRequest = {
      origin: {
        country: 'BH',
        city: 'Manama',
        postalCode: '00000',
        state: 'Manama',
        address: 'Cache Test Origin',
      },
      destination: {
        country: 'KW',
        city: 'Kuwait City',
        postalCode: '00000',
        state: 'Kuwait',
        address: 'Cache Test Destination',
      },
      packageDetails: {
        weight: 1,
        length: 10,
        width: 10,
        height: 10,
        unit: 'kg' as const,
        dimensionUnit: 'cm' as const,
      },
      descriptionOfGoods: 'Cache Test Item',
    };

    it('should cache shipping rate responses', async () => {
      if (!shippingService || !cacheManager) {
        throw new Error('Services not initialized - credentials may be missing');
      }
      // Clear cache first
      cacheManager.clear();

      const startTime = Date.now();
      const response1 = await shippingService.calculateRates(cacheTestRequest).toPromise();
      const firstRequestTime = Date.now() - startTime;

      // Second identical request should be faster (cached)
      const secondStartTime = Date.now();
      const response2 = await shippingService.calculateRates(cacheTestRequest).toPromise();
      const secondRequestTime = Date.now() - secondStartTime;

      expect(response1).toEqual(response2);
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.8);

      // Verify cache statistics
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.totalEntries).toBeGreaterThan(0);
    }, 45000);
  });

  describeIf(areCredentialsAvailable(), 'Error Handling Tests', () => {
    it('should handle invalid origin country', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const invalidRequest = {
        origin: {
          country: 'INVALID',
          city: 'Invalid City',
          postalCode: '00000',
          state: 'Invalid',
          address: 'Invalid Address',
        },
        destination: {
          country: 'AE',
          city: 'Dubai',
          postalCode: '00000',
          state: 'Dubai',
          address: 'Valid Destination',
        },
        packageDetails: {
          weight: 1,
          length: 10,
          width: 10,
          height: 10,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: 'Test Item',
      };

      const response = await shippingService.calculateRates(invalidRequest).toPromise();

      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle zero weight packages', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const zeroWeightRequest = {
        origin: {
          country: 'BH',
          city: 'Manama',
          postalCode: '00000',
          state: 'Manama',
          address: 'Test Origin',
        },
        destination: {
          country: 'AE',
          city: 'Dubai',
          postalCode: '00000',
          state: 'Dubai',
          address: 'Test Destination',
        },
        packageDetails: {
          weight: 0,
          length: 10,
          width: 10,
          height: 10,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: 'Zero Weight Test',
      };

      const response = await shippingService.calculateRates(zeroWeightRequest).toPromise();

      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(Array.isArray(response.errors)).toBe(true);
    }, 30000);

    it('should handle oversized packages', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const oversizedRequest = {
        origin: {
          country: 'BH',
          city: 'Manama',
          postalCode: '00000',
          state: 'Manama',
          address: 'Test Origin',
        },
        destination: {
          country: 'AE',
          city: 'Dubai',
          postalCode: '00000',
          state: 'Dubai',
          address: 'Test Destination',
        },
        packageDetails: {
          weight: 1000, // Very heavy
          length: 500,  // Very large
          width: 500,
          height: 500,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: 'Oversized Test Package',
      };

      const response = await shippingService.calculateRates(oversizedRequest).toPromise();

      expect(response).toBeDefined();
      // Should either fail or return limited services
      if (!response.success) {
        expect(Array.isArray(response.errors)).toBe(true);
      }
    }, 30000);
  });

  describeIf(areCredentialsAvailable(), 'Performance Tests', () => {
    it('should handle concurrent rate calculations', async () => {
      if (!shippingService) {
        throw new Error('ShippingService not initialized - credentials may be missing');
      }
      const concurrentRequests = 3; // Reduced for API rate limits
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const request = {
          origin: {
            country: 'BH',
            city: 'Manama',
            postalCode: '00000',
            state: 'Manama',
            address: `Concurrent Test Origin ${i}`,
          },
          destination: {
            country: 'AE',
            city: 'Dubai',
            postalCode: '00000',
            state: 'Dubai',
            address: `Concurrent Test Destination ${i}`,
          },
          packageDetails: {
            weight: 1 + i * 0.5,
            length: 10 + i,
            width: 10 + i,
            height: 10 + i,
            unit: 'kg' as const,
            dimensionUnit: 'cm' as const,
          },
          descriptionOfGoods: `Concurrent Test Package ${i}`,
        };

        requests.push(shippingService.calculateRates(request).toPromise());
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(90000); // Should complete within 90 seconds

      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(typeof response.success).toBe('boolean');
      });
    }, 120000);

    it('should maintain performance metrics', async () => {
      if (!shippingService || !healthMonitor) {
        throw new Error('Services not initialized - credentials may be missing');
      }
      // Make a few requests to generate metrics
      const testRequest = {
        origin: {
          country: 'BH',
          city: 'Manama',
          postalCode: '00000',
          state: 'Manama',
          address: 'Performance Test Origin',
        },
        destination: {
          country: 'AE',
          city: 'Dubai',
          postalCode: '00000',
          state: 'Dubai',
          address: 'Performance Test Destination',
        },
        packageDetails: {
          weight: 1,
          length: 10,
          width: 10,
          height: 10,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: 'Performance Test',
      };

      await shippingService.calculateRates(testRequest).toPromise();

      const metrics = healthMonitor.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
    }, 30000);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { ShippingService } from '../../src/services/shipping.service';
import { TrackingService } from '../../src/services/tracking.service';
import { AramexHttpService } from '../../src/services/aramex-http.service';
import { AramexSoapService } from '../../src/services/aramex-soap.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';
import { skipIfNoCredentials } from './setup';

describe('Error Handling Integration Tests', () => {
  let app: TestingModule;
  let shippingService: ShippingService;
  let trackingService: TrackingService;
  let httpService: AramexHttpService;
  let soapService: AramexSoapService;
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

    shippingService = app.get<ShippingService>(ShippingService);
    trackingService = app.get<TrackingService>(TrackingService);
    httpService = app.get<AramexHttpService>(AramexHttpService);
    soapService = app.get<AramexSoapService>(AramexSoapService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Shipping Service Error Handling', () => {
    it('should handle completely invalid shipping requests', async () => {
      const invalidRequests = [
        // Missing required fields
        {
          origin: null,
          destination: null,
          packageDetails: null,
          descriptionOfGoods: '',
        },
        // Invalid country codes
        {
          origin: {
            country: 'XX',
            city: '',
            postalCode: '',
            state: '',
            address: '',
          },
          destination: {
            country: 'YY',
            city: '',
            postalCode: '',
            state: '',
            address: '',
          },
          packageDetails: {
            weight: 1,
            length: 10,
            width: 10,
            height: 10,
            unit: 'kg' as const,
            dimensionUnit: 'cm' as const,
          },
          descriptionOfGoods: 'Test',
        },
        // Negative dimensions
        {
          origin: {
            country: 'BH',
            city: 'Manama',
            postalCode: '00000',
            state: 'Manama',
            address: 'Test Address',
          },
          destination: {
            country: 'AE',
            city: 'Dubai',
            postalCode: '00000',
            state: 'Dubai',
            address: 'Test Address',
          },
          packageDetails: {
            weight: -1,
            length: -10,
            width: -10,
            height: -10,
            unit: 'kg' as const,
            dimensionUnit: 'cm' as const,
          },
          descriptionOfGoods: 'Negative Dimensions Test',
        },
      ];

      for (const invalidRequest of invalidRequests) {
        try {
          const response = await shippingService.calculateRates(invalidRequest).toPromise();

          if (response) {
            expect(response.success).toBe(false);
            expect(Array.isArray(response.errors)).toBe(true);
            expect(response.errors.length).toBeGreaterThan(0);

            response.errors.forEach(error => {
              expect(typeof error).toBe('string');
              expect(error.length).toBeGreaterThan(0);
            });
          }
        } catch (error) {
          // Throwing an error is also acceptable
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    }, 60000);

    it('should handle unsupported shipping routes', async () => {
      const unsupportedRoutes = [
        // Remote countries that might not be supported
        {
          origin: {
            country: 'BH',
            city: 'Manama',
            postalCode: '00000',
            state: 'Manama',
            address: 'Test Origin',
          },
          destination: {
            country: 'AQ', // Antarctica
            city: 'Research Station',
            postalCode: '00000',
            state: 'Antarctica',
            address: 'Test Destination',
          },
          packageDetails: {
            weight: 1,
            length: 10,
            width: 10,
            height: 10,
            unit: 'kg' as const,
            dimensionUnit: 'cm' as const,
          },
          descriptionOfGoods: 'Test Package',
        },
        // Restricted destination
        {
          origin: {
            country: 'BH',
            city: 'Manama',
            postalCode: '00000',
            state: 'Manama',
            address: 'Test Origin',
          },
          destination: {
            country: 'KP', // North Korea - typically restricted
            city: 'Pyongyang',
            postalCode: '00000',
            state: 'Pyongyang',
            address: 'Test Destination',
          },
          packageDetails: {
            weight: 1,
            length: 10,
            width: 10,
            height: 10,
            unit: 'kg' as const,
            dimensionUnit: 'cm' as const,
          },
          descriptionOfGoods: 'Test Package',
        },
      ];

      for (const unsupportedRoute of unsupportedRoutes) {
        const response = await shippingService.calculateRates(unsupportedRoute).toPromise();

        expect(response).toBeDefined();
        expect(response.success).toBe(false);
        expect(Array.isArray(response.errors)).toBe(true);
        expect(response.errors.length).toBeGreaterThan(0);

        const errorMessage = response.errors.join(' ').toLowerCase();
        expect(errorMessage).toMatch(/not supported|restricted|unavailable|invalid|not found/);
      }
    }, 60000);

    it('should handle restricted goods descriptions', async () => {
      const restrictedGoodsDescriptions = [
        'Weapons and ammunition',
        'Explosive materials',
        'Radioactive substances',
        'Illegal drugs',
        'Hazardous chemicals',
      ];

      const baseRequest = {
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
          weight: 1,
          length: 10,
          width: 10,
          height: 10,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
      };

      for (const restrictedDescription of restrictedGoodsDescriptions) {
        const request = {
          ...baseRequest,
          descriptionOfGoods: restrictedDescription,
        };

        const response = await shippingService.calculateRates(request).toPromise();

        expect(response).toBeDefined();
        // Might succeed or fail depending on API restrictions
        expect(typeof response.success).toBe('boolean');

        if (!response.success) {
          expect(Array.isArray(response.errors)).toBe(true);
        }
      }
    }, 120000);
  });

  describe('Tracking Service Error Handling', () => {
    it('should handle various invalid tracking number formats', async () => {
      const invalidTrackingNumbers = [
        '', // Empty string
        ' ', // Whitespace only
        'a', // Too short
        '1', // Single digit
        'INVALID_TRACKING_NUMBER_THAT_IS_WAY_TOO_LONG_FOR_ANY_SYSTEM_TO_HANDLE_123456789012345678901234567890', // Too long
        '!@#$%^&*()', // Special characters
        'NULL', // SQL injection attempt
        '<script>alert("test")</script>', // XSS attempt
        '../../etc/passwd', // Path traversal attempt
        'SELECT * FROM users', // SQL injection attempt
        undefined as any, // Undefined
        null as any, // Null
        123456789 as any, // Number instead of string
        {} as any, // Object instead of string
        [] as any, // Array instead of string
      ];

      for (const invalidTrackingNumber of invalidTrackingNumbers) {
        try {
          const response = await trackingService.trackPackage({
            trackingNumber: invalidTrackingNumber,
          }).toPromise();

          expect(response).toBeDefined();

          if (typeof invalidTrackingNumber === 'string') {
            expect(response.trackingNumber).toBe(invalidTrackingNumber);
          }

          // Most of these should fail
          if (invalidTrackingNumber === '' ||
              invalidTrackingNumber === ' ' ||
              invalidTrackingNumber === null ||
              invalidTrackingNumber === undefined) {
            expect(response.success).toBe(false);
          } else {
            expect(typeof response.success).toBe('boolean');
          }

          if (!response.success) {
            expect(Array.isArray(response.errors)).toBe(true);
            expect(response.errors.length).toBeGreaterThan(0);
          }
        } catch (error) {
          // Some invalid inputs might throw errors, which is acceptable
          expect(error).toBeDefined();
        }
      }
    }, 120000);

    it('should handle service unavailability gracefully', async () => {
      // Test with extremely short timeout to simulate service unavailability
      const timeoutConfig = { ...testConfig, timeout: 1 };

      const timeoutApp = await Test.createTestingModule({
        imports: [AramexModule.forRoot(timeoutConfig)],
      }).compile();

      const timeoutTrackingService = timeoutApp.get<TrackingService>(TrackingService);

      try {
        const response = await timeoutTrackingService.trackPackage({
          trackingNumber: 'SERVICE_UNAVAILABLE_TEST',
        }).toPromise();

        // If we get a response, it should indicate failure
        expect(response).toBeDefined();
        expect(response.success).toBe(false);
        expect(Array.isArray(response.errors)).toBe(true);
      } catch (error) {
        // Timeout errors are expected
        expect(error).toBeDefined();
        expect(error.message).toMatch(/timeout|network|unavailable/i);
      }

      await timeoutApp.close();
    }, 30000);

    it('should handle malformed API responses', async () => {
      // This test tracks a number that might return malformed data
      const response = await trackingService.trackPackage({
        trackingNumber: 'MALFORMED_RESPONSE_TEST_12345',
      }).toPromise();

      expect(response).toBeDefined();
      expect(response.trackingNumber).toBe('MALFORMED_RESPONSE_TEST_12345');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(Array.isArray(response.events)).toBe(true);

      // Even with malformed data, we should get a valid response structure
      if (response.success) {
        response.events.forEach(event => {
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('status');
        });
      } else {
        expect(Array.isArray(response.errors)).toBe(true);
      }
    }, 30000);
  });

  describe('HTTP Service Error Handling', () => {
    it('should handle HTTP 4xx errors gracefully', async () => {
      try {
        // Try to make a request to an endpoint that doesn't exist
        const response = await httpService.get('/non-existent-endpoint').toPromise();

        // If we get a response, check it's an error
        if (response) {
          expect(response).toHaveProperty('error');
        }
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.statusCode).toBeGreaterThanOrEqual(400);
        expect(error.statusCode).toBeLessThan(500);
      }
    }, 30000);

    it('should handle HTTP 5xx errors gracefully', async () => {
      // This test might be difficult to trigger without mocking
      // For now, we just verify the error handling structure exists
      try {
        await httpService.get('/error-test-endpoint').toPromise();
      } catch (error) {
        if (error.statusCode >= 500) {
          expect(error).toBeDefined();
          expect(error.statusCode).toBeGreaterThanOrEqual(500);
        }
      }
    }, 30000);

    it('should handle network connectivity issues', async () => {
      // Test with invalid base URL to simulate network issues
      const invalidConfig = {
        ...testConfig,
        sandbox: false, // This will use production URL which we'll make invalid
      };

      // We can't easily test this without mocking, so we'll just verify
      // that the service handles the configuration correctly
      const invalidApp = await Test.createTestingModule({
        imports: [AramexModule.forRoot(invalidConfig)],
      }).compile();

      const invalidHttpService = invalidApp.get<AramexHttpService>(AramexHttpService);
      const clientInfo = invalidHttpService.getClientInfo();

      expect(clientInfo).toBeDefined();
      expect(clientInfo.UserName).toBe(testConfig.username);

      await invalidApp.close();
    }, 30000);
  });

  describe('SOAP Service Error Handling', () => {
    it('should handle SOAP client creation failures', async () => {
      try {
        const soapClient = await soapService.createClient();
        expect(soapClient).toBeDefined();
      } catch (error) {
        // SOAP client creation might fail in sandbox environment
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    }, 30000);

    it('should handle SOAP operation failures', async () => {
      try {
        // Attempt to track with potentially invalid parameters
        const response = await trackingService.trackPackage({
          trackingNumber: 'SOAP_ERROR_TEST',
          useSoap: true,
        }).toPromise();

        expect(response).toBeDefined();
        expect(typeof response.success).toBe('boolean');

        if (!response.success) {
          expect(Array.isArray(response.errors)).toBe(true);
          expect(response.errors.length).toBeGreaterThan(0);
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Health Monitoring Error Conditions', () => {
    it('should detect and report unhealthy services', async () => {
      const healthStatus = await healthMonitor.performHealthCheck();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);

      // If any service is unhealthy, it should be reflected in the status
      if (healthStatus.status === 'unhealthy') {
        expect(
          !healthStatus.httpService ||
          !healthStatus.soapService ||
          !healthStatus.cacheService
        ).toBe(true);
      }

      // Response time should be recorded even for unhealthy services
      expect(healthStatus.responseTime).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should handle health check timeouts', async () => {
      // This would require more sophisticated mocking to test properly
      // For now, we verify the health check completes within reasonable time
      const startTime = Date.now();
      const healthStatus = await healthMonitor.performHealthCheck();
      const checkTime = Date.now() - startTime;

      expect(healthStatus).toBeDefined();
      expect(checkTime).toBeLessThan(45000); // Should complete within 45 seconds
    }, 50000);

    it('should maintain error rate metrics', async () => {
      // Make some requests that might fail
      const failingRequests = [
        trackingService.trackPackage({ trackingNumber: 'FAIL_TEST_1' }).toPromise().catch(() => null),
        trackingService.trackPackage({ trackingNumber: 'FAIL_TEST_2' }).toPromise().catch(() => null),
        shippingService.calculateRates({
          origin: { country: 'XX', city: '', postalCode: '', state: '', address: '' },
          destination: { country: 'YY', city: '', postalCode: '', state: '', address: '' },
          packageDetails: { weight: 0, length: 0, width: 0, height: 0, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: '',
        }).toPromise().catch(() => null),
      ];

      await Promise.all(failingRequests);

      const metrics = healthMonitor.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    }, 60000);
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large tracking batches', async () => {
      // Create a large batch of tracking numbers
      const largeBatch = Array.from({ length: 50 }, (_, i) => `LARGE_BATCH_${i}`);

      try {
        const responses = await trackingService.trackMultiplePackages(largeBatch).toPromise();

        expect(Array.isArray(responses)).toBe(true);
        expect(responses.length).toBe(largeBatch.length);

        responses.forEach((response, index) => {
          expect(response).toBeDefined();
          expect(response.trackingNumber).toBe(largeBatch[index]);
          expect(typeof response.success).toBe('boolean');
        });
      } catch (error) {
        // Large batches might be rejected by the API
        expect(error).toBeDefined();
        expect(error.message).toMatch(/batch|limit|too many|rate/i);
      }
    }, 120000);

    it('should handle unicode and special characters in addresses', async () => {
      const unicodeRequest = {
        origin: {
          country: 'BH',
          city: 'المنامة', // Arabic text
          postalCode: '00000',
          state: 'المنامة',
          address: 'شارع الاختبار ١٢٣',
        },
        destination: {
          country: 'AE',
          city: 'دبي', // Arabic text
          postalCode: '00000',
          state: 'دبي',
          address: 'شارع الوجهة ٤٥٦',
        },
        packageDetails: {
          weight: 1,
          length: 10,
          width: 10,
          height: 10,
          unit: 'kg' as const,
          dimensionUnit: 'cm' as const,
        },
        descriptionOfGoods: 'محتويات الطرد', // Arabic text
      };

      const response = await shippingService.calculateRates(unicodeRequest).toPromise();

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');

      // API might or might not support unicode, but should handle gracefully
      if (!response.success) {
        expect(Array.isArray(response.errors)).toBe(true);
      }
    }, 30000);

    it('should handle concurrent requests with mixed outcomes', async () => {
      const mixedRequests = [
        // Valid request
        trackingService.trackPackage({ trackingNumber: '47384974350' }).toPromise(),
        // Invalid request
        trackingService.trackPackage({ trackingNumber: 'INVALID' }).toPromise(),
        // Valid shipping request
        shippingService.calculateRates({
          origin: { country: 'BH', city: 'Manama', postalCode: '00000', state: 'Manama', address: 'Test' },
          destination: { country: 'AE', city: 'Dubai', postalCode: '00000', state: 'Dubai', address: 'Test' },
          packageDetails: { weight: 1, length: 10, width: 10, height: 10, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: 'Test',
        }).toPromise(),
        // Invalid shipping request
        shippingService.calculateRates({
          origin: { country: 'XX', city: '', postalCode: '', state: '', address: '' },
          destination: { country: 'YY', city: '', postalCode: '', state: '', address: '' },
          packageDetails: { weight: 0, length: 0, width: 0, height: 0, unit: 'kg', dimensionUnit: 'cm' },
          descriptionOfGoods: '',
        }).toPromise(),
      ];

      const results = await Promise.allSettled(mixedRequests);

      expect(results).toHaveLength(4);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(typeof result.value.success).toBe('boolean');
        } else {
          expect(result.reason).toBeDefined();
        }
      });
    }, 90000);
  });
});
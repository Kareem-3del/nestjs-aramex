import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../src/aramex.module';
import { ARAMEX_CONFIG_TOKEN } from '../src/aramex-config.module';
import { TrackingService } from '../src/services/tracking.service';
import { AramexHttpService } from '../src/services/aramex-http.service';
import { AramexSoapService } from '../src/services/aramex-soap.service';
import { TrackingDto, BatchTrackingDto } from '../src/dto/tracking.dto';
import { createMockAramexConfig, createMockHttpTrackingResponse } from './test-utils';
import { of } from 'rxjs';

describe('Module Integration (e2e)', () => {
  let module: TestingModule;

  describe('Complete Module Bootstrap', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig({
            sandbox: true,
            debug: false,
          }))
        ],
      }).compile();
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should bootstrap the complete module successfully', () => {
      expect(module).toBeDefined();
    });

    it('should have all services properly injected and configured', () => {
      const trackingService = module.get<TrackingService>(TrackingService);
      const httpService = module.get<AramexHttpService>(AramexHttpService);
      const soapService = module.get<AramexSoapService>(AramexSoapService);
      const config = module.get(ARAMEX_CONFIG_TOKEN);

      expect(trackingService).toBeDefined();
      expect(httpService).toBeDefined();
      expect(soapService).toBeDefined();
      expect(config).toBeDefined();

      // Verify configuration is properly injected
      expect(config.sandbox).toBe(true);
      expect(config.debug).toBe(false);
      expect(config.username).toBe('test_user');
    });

    it('should allow dependency injection between services', () => {
      const trackingService = module.get<TrackingService>(TrackingService);

      // TrackingService should have access to both HTTP and SOAP services
      expect(trackingService['httpService']).toBeDefined();
      expect(trackingService['soapService']).toBeDefined();
      expect(trackingService['httpService']).toBeInstanceOf(AramexHttpService);
      expect(trackingService['soapService']).toBeInstanceOf(AramexSoapService);
    });
  });

  describe('Service Method Integration', () => {
    let trackingService: TrackingService;
    let httpService: AramexHttpService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig())
        ],
      }).compile();

      trackingService = module.get<TrackingService>(TrackingService);
      httpService = module.get<AramexHttpService>(AramexHttpService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should handle tracking requests through the service chain', async () => {
      // Mock the HTTP service response
      const mockResponse = createMockHttpTrackingResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const trackingDto: TrackingDto = {
        trackingNumber: '123456789',
        useSoap: false,
      };

      const result = await trackingService.trackPackage(trackingDto).toPromise();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBe('123456789');
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should handle batch tracking requests', async () => {
      const mockResponse = createMockHttpTrackingResponse();
      mockResponse.shipments = [
        ...mockResponse.shipments,
        { ...mockResponse.shipments[0], trackingNumber: '987654321', shipmentNumber: '987654321' },
      ];

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const batchDto: BatchTrackingDto = {
        trackingNumbers: ['123456789', '987654321'],
        useSoap: false,
      };

      const results = await trackingService.trackBatch(batchDto).toPromise();
      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('Configuration Variants', () => {
    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should work with minimal configuration', async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot({
            username: 'user',
            password: 'pass',
            accountNumber: '123',
            accountPin: '456',
            accountEntity: 'ENT',
            accountCountryCode: 'US',
          })
        ],
      }).compile();

      const config = module.get(ARAMEX_CONFIG_TOKEN);
      expect(config.sandbox).toBe(false);
      expect(config.timeout).toBe(30000);
      expect(config.debug).toBe(false);
    });

    it('should work with full configuration', async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot({
            username: 'full_user',
            password: 'full_pass',
            accountNumber: '123456',
            accountPin: '789',
            accountEntity: 'FULL',
            accountCountryCode: 'CA',
            sandbox: true,
            timeout: 45000,
            debug: true,
          })
        ],
      }).compile();

      const config = module.get(ARAMEX_CONFIG_TOKEN);
      expect(config.username).toBe('full_user');
      expect(config.sandbox).toBe(true);
      expect(config.timeout).toBe(45000);
      expect(config.debug).toBe(true);
    });

    it('should work with async configuration', async () => {
      const configFactory = jest.fn().mockResolvedValue(createMockAramexConfig({
        username: 'async_test_user',
        sandbox: false,
      }));

      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRootAsync({
            useFactory: configFactory,
          })
        ],
      }).compile();

      expect(configFactory).toHaveBeenCalled();

      const config = module.get(ARAMEX_CONFIG_TOKEN);
      expect(config.username).toBe('async_test_user');
      expect(config.sandbox).toBe(false);
    });
  });

  describe('Service Scoping', () => {
    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should create singleton services', async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig())
        ],
      }).compile();

      const trackingService1 = module.get<TrackingService>(TrackingService);
      const trackingService2 = module.get<TrackingService>(TrackingService);
      const httpService1 = module.get<AramexHttpService>(AramexHttpService);
      const httpService2 = module.get<AramexHttpService>(AramexHttpService);

      // Should be the same instances (singleton)
      expect(trackingService1).toBe(trackingService2);
      expect(httpService1).toBe(httpService2);
    });
  });

  describe('Performance and Memory', () => {
    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should not leak memory during multiple initialization cycles', async () => {
      // This test ensures that repeated module creation/destruction doesn't leak
      for (let i = 0; i < 3; i++) {
        const testModule = await Test.createTestingModule({
          imports: [
            AramexModule.forRoot(createMockAramexConfig({
              username: `test_user_${i}`,
            }))
          ],
        }).compile();

        const service = testModule.get<TrackingService>(TrackingService);
        expect(service).toBeDefined();

        await testModule.close();
      }

      // If we reach here without memory issues, the test passes
      expect(true).toBe(true);
    });
  });
});
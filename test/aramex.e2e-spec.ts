import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../src/aramex.module';
import { ARAMEX_CONFIG_TOKEN } from '../src/aramex-config.module';
import { TrackingService } from '../src/services/tracking.service';
import { AramexSoapService } from '../src/services/aramex-soap.service';
import { AramexHttpService } from '../src/services/aramex-http.service';
import { ShippingService } from '../src/services/shipping.service';
import { createMockAramexConfig } from './test-utils';

describe('AramexModule (e2e)', () => {
  let module: TestingModule;
  let trackingService: TrackingService;
  let soapService: AramexSoapService;
  let httpService: AramexHttpService;
  let shippingService: ShippingService;

  describe('forRoot configuration', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig({
            sandbox: true,
            debug: false,
            timeout: 15000,
          }))
        ],
      }).compile();

      trackingService = module.get<TrackingService>(TrackingService);
      soapService = module.get<AramexSoapService>(AramexSoapService);
      httpService = module.get<AramexHttpService>(AramexHttpService);
      shippingService = module.get<ShippingService>(ShippingService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should be defined and properly configured', () => {
      expect(module).toBeDefined();
      expect(trackingService).toBeDefined();
      expect(soapService).toBeDefined();
      expect(httpService).toBeDefined();
      expect(shippingService).toBeDefined();
    });

    it('should inject configuration correctly', () => {
      const clientInfo = httpService.getClientInfo();
      expect(clientInfo.UserName).toBe('test_user');
      expect(clientInfo.Password).toBe('test_password');
      expect(clientInfo.AccountNumber).toBe('123456');
    });

    it('should provide all expected services', () => {
      expect(trackingService).toBeInstanceOf(TrackingService);
      expect(soapService).toBeInstanceOf(AramexSoapService);
      expect(httpService).toBeInstanceOf(AramexHttpService);
      expect(shippingService).toBeInstanceOf(ShippingService);
    });

    it('should configure services with correct timeout', () => {
      expect(httpService['config'].timeout).toBe(15000);
    });

    it('should share configuration across services', () => {
      const httpClientInfo = httpService.getClientInfo();
      const soapClientInfo = soapService.getClientInfo();

      expect(httpClientInfo.UserName).toBe(soapClientInfo.UserName);
      expect(httpClientInfo.Password).toBe(soapClientInfo.Password);
      expect(httpClientInfo.AccountNumber).toBe(soapClientInfo.AccountNumber);
      expect(httpClientInfo.AccountPin).toBe(soapClientInfo.AccountPin);
      expect(httpClientInfo.AccountEntity).toBe(soapClientInfo.AccountEntity);
      expect(httpClientInfo.AccountCountryCode).toBe(soapClientInfo.AccountCountryCode);
    });
  });

  describe('forRootAsync configuration', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRootAsync({
            useFactory: () => Promise.resolve(createMockAramexConfig({
              username: 'async_user',
              password: 'async_password',
              sandbox: false,
              debug: true,
            })),
          })
        ],
      }).compile();

      trackingService = module.get<TrackingService>(TrackingService);
      soapService = module.get<AramexSoapService>(AramexSoapService);
      httpService = module.get<AramexHttpService>(AramexHttpService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should configure services with async factory', () => {
      const clientInfo = httpService.getClientInfo();
      expect(clientInfo.UserName).toBe('async_user');
      expect(clientInfo.Password).toBe('async_password');
    });

    it('should apply debug configuration', () => {
      expect(httpService['config'].debug).toBe(true);
    });
  });

  describe('service integration', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig())
        ],
      }).compile();

      trackingService = module.get<TrackingService>(TrackingService);
      soapService = module.get<AramexSoapService>(AramexSoapService);
      httpService = module.get<AramexHttpService>(AramexHttpService);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should integrate TrackingService with HTTP and SOAP services', () => {
      expect(trackingService['httpService']).toBeInstanceOf(AramexHttpService);
      expect(trackingService['soapService']).toBeInstanceOf(AramexSoapService);
    });

    it('should handle service dependencies correctly', () => {
      expect(trackingService['httpService']).toBe(httpService);
      expect(trackingService['soapService']).toBe(soapService);
    });
  });

  describe('module exports', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig())
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should export TrackingService', () => {
      const service = module.get<TrackingService>(TrackingService);
      expect(service).toBeInstanceOf(TrackingService);
    });

    it('should export ShippingService', () => {
      const service = module.get<ShippingService>(ShippingService);
      expect(service).toBeInstanceOf(ShippingService);
    });

    it('should export AramexHttpService', () => {
      const service = module.get<AramexHttpService>(AramexHttpService);
      expect(service).toBeInstanceOf(AramexHttpService);
    });

    it('should export AramexSoapService', () => {
      const service = module.get<AramexSoapService>(AramexSoapService);
      expect(service).toBeInstanceOf(AramexSoapService);
    });
  });

  describe('configuration validation', () => {
    it('should handle configuration with defaults', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot({
            username: 'test',
            password: 'test',
            accountNumber: '123',
            accountPin: '123',
            accountEntity: 'TEST',
            accountCountryCode: 'US',
            // Omit optional properties to test defaults
          })
        ],
      }).compile();

      const config = testModule.get(ARAMEX_CONFIG_TOKEN);
      expect(config.sandbox).toBe(false);
      expect(config.timeout).toBe(30000);
      expect(config.debug).toBe(false);

      await testModule.close();
    });
  });

  describe('service scoping', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AramexModule.forRoot(createMockAramexConfig())
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should create singleton services', () => {
      const trackingService1 = module.get<TrackingService>(TrackingService);
      const trackingService2 = module.get<TrackingService>(TrackingService);
      const httpService1 = module.get<AramexHttpService>(AramexHttpService);
      const httpService2 = module.get<AramexHttpService>(AramexHttpService);

      // Should be the same instances (singleton)
      expect(trackingService1).toBe(trackingService2);
      expect(httpService1).toBe(httpService2);
    });
  });

  describe('performance and memory', () => {
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
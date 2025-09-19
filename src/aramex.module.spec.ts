import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from './aramex.module';
import { AramexHttpService } from './services/aramex-http.service';
import { AramexSoapService } from './services/aramex-soap.service';
import { ShippingService } from './services/shipping.service';
import { TrackingService } from './services/tracking.service';
import { CacheManagerService } from './services/cache-manager.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { AramexConfig } from './interfaces/aramex-config.interface';

describe('AramexModule', () => {
  const mockConfig: AramexConfig = {
    username: 'test-user',
    password: 'test-password',
    accountNumber: 'test-account',
    accountPin: 'test-pin',
    accountEntity: 'test-entity',
    accountCountryCode: 'JO',
    sandbox: true,
    timeout: 15000,
    debug: true,
  };

  describe('forRoot', () => {
    it('should create module with default timeout', () => {
      const configWithoutTimeout: AramexConfig = {
        username: 'test-user',
        password: 'test-password',
        accountNumber: 'test-account',
        accountPin: 'test-pin',
        accountEntity: 'test-entity',
        accountCountryCode: 'JO',
        sandbox: false,
      };

      const dynamicModule = AramexModule.forRoot(configWithoutTimeout);

      expect(dynamicModule.module).toBe(AramexModule);
      expect(dynamicModule.imports).toHaveLength(2);
      expect(dynamicModule.providers).toEqual([
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ]);
      expect(dynamicModule.exports).toEqual([
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ]);
    });

    it('should create module with custom timeout', () => {
      const dynamicModule = AramexModule.forRoot(mockConfig);

      expect(dynamicModule.module).toBe(AramexModule);
      expect(dynamicModule.imports).toHaveLength(2);
      expect(dynamicModule.providers).toEqual([
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ]);
      expect(dynamicModule.exports).toEqual([
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ]);
    });

    it('should create a working module instance', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [AramexModule.forRoot(mockConfig)],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(ShippingService)).toBeDefined();
      expect(module.get(TrackingService)).toBeDefined();
      expect(module.get(AramexHttpService)).toBeDefined();
      expect(module.get(AramexSoapService)).toBeDefined();
      expect(module.get(CacheManagerService)).toBeDefined();
      expect(module.get(HealthMonitorService)).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async configuration', () => {
      const asyncOptions = {
        useFactory: () => mockConfig,
        inject: [],
      };

      const dynamicModule = AramexModule.forRootAsync(asyncOptions);

      expect(dynamicModule.module).toBe(AramexModule);
      expect(dynamicModule.imports).toHaveLength(2);
      expect(dynamicModule.providers).toEqual([
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ]);
      expect(dynamicModule.exports).toEqual([
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ]);
    });

    it('should create module with async factory and dependencies', () => {
      const asyncOptions = {
        useFactory: (configService: any) => ({
          ...mockConfig,
          timeout: configService.getTimeout(),
        }),
        inject: ['ConfigService'],
      };

      const dynamicModule = AramexModule.forRootAsync(asyncOptions);

      expect(dynamicModule.module).toBe(AramexModule);
      expect(dynamicModule.imports).toHaveLength(2);
      expect(dynamicModule.providers).toEqual([
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ]);
      expect(dynamicModule.exports).toEqual([
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ]);
    });

    it('should handle timeout option correctly in forRoot', () => {
      const configWithTimeout = { ...mockConfig, timeout: 25000 };
      const configWithoutTimeout = { ...mockConfig };
      delete configWithoutTimeout.timeout;

      const moduleWithTimeout = AramexModule.forRoot(configWithTimeout);
      const moduleWithoutTimeout = AramexModule.forRoot(configWithoutTimeout);

      expect(moduleWithTimeout.module).toBe(AramexModule);
      expect(moduleWithoutTimeout.module).toBe(AramexModule);
    });

    it('should handle optional config properties', () => {
      const minimalConfig: AramexConfig = {
        username: 'test-user',
        password: 'test-password',
        accountNumber: 'test-account',
        accountPin: 'test-pin',
        accountEntity: 'test-entity',
        accountCountryCode: 'JO',
      };

      const module = AramexModule.forRoot(minimalConfig);
      expect(module.module).toBe(AramexModule);
      expect(module.providers).toHaveLength(7);
      expect(module.exports).toHaveLength(6);
    });

    it('should create a working async module instance', async () => {
      const asyncOptions = {
        useFactory: () => mockConfig,
        inject: [],
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [AramexModule.forRootAsync(asyncOptions)],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(ShippingService)).toBeDefined();
      expect(module.get(TrackingService)).toBeDefined();
      expect(module.get(AramexHttpService)).toBeDefined();
      expect(module.get(AramexSoapService)).toBeDefined();
      expect(module.get(CacheManagerService)).toBeDefined();
      expect(module.get(HealthMonitorService)).toBeDefined();
    });

    it('should handle async configuration with Promise', async () => {
      const asyncOptions = {
        useFactory: async () => {
          // Simulate async configuration loading
          await new Promise(resolve => setTimeout(resolve, 10));
          return mockConfig;
        },
        inject: [],
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [AramexModule.forRootAsync(asyncOptions)],
      }).compile();

      expect(module).toBeDefined();
      const shippingService = module.get(ShippingService);
      expect(shippingService).toBeDefined();
    });
  });
});
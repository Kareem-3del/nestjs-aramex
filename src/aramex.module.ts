import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AramexConfigModule } from './aramex-config.module';
import { AramexHttpService } from './services/aramex-http.service';
import { AramexSoapService } from './services/aramex-soap.service';
import { ShippingService } from './services/shipping.service';
import { TrackingService } from './services/tracking.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { CacheManagerService } from './services/cache-manager.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { AramexConfig } from './interfaces/aramex-config.interface';

@Module({})
export class AramexModule {
  static forRoot(config: AramexConfig): DynamicModule {
    return {
      module: AramexModule,
      imports: [
        HttpModule.register({
          timeout: config.timeout || 30000,
        }),
        AramexConfigModule.forRoot(config),
      ],
      providers: [
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ],
      exports: [
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<AramexConfig> | AramexConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: AramexModule,
      imports: [
        HttpModule.register({
          timeout: 30000,
        }),
        AramexConfigModule.forRootAsync(options),
      ],
      providers: [
        CacheManagerService,
        RateLimiterService,
        HealthMonitorService,
        AramexHttpService,
        AramexSoapService,
        ShippingService,
        TrackingService,
      ],
      exports: [
        ShippingService,
        TrackingService,
        AramexHttpService,
        AramexSoapService,
        CacheManagerService,
        HealthMonitorService,
      ],
    };
  }
}
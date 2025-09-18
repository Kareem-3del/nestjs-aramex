import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AramexConfigModule } from './aramax-config.module';
import { AramexHttpService } from './services/aramax-http.service';
import { AramexSoapService } from './services/aramex-soap.service';
import { ShippingService } from './services/shipping.service';
import { TrackingService } from './services/tracking.service';
import { AramexConfig } from './interfaces/aramax-config.interface';

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
      ],
    };
  }
}
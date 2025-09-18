import { DynamicModule, Global, Module } from '@nestjs/common';
import { AramexConfig } from './interfaces/aramex-config.interface';

export const ARAMEX_CONFIG_TOKEN = 'ARAMEX_CONFIG';

@Global()
@Module({})
export class AramexConfigModule {
  static forRoot(config: AramexConfig): DynamicModule {
    return {
      module: AramexConfigModule,
      providers: [
        {
          provide: ARAMEX_CONFIG_TOKEN,
          useValue: {
            username: config.username,
            password: config.password,
            accountNumber: config.accountNumber,
            accountPin: config.accountPin,
            accountEntity: config.accountEntity,
            accountCountryCode: config.accountCountryCode,
            sandbox: config.sandbox || false,
            timeout: config.timeout || 30000,
            debug: config.debug || false,
          },
        },
      ],
      exports: [ARAMEX_CONFIG_TOKEN],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<AramexConfig> | AramexConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: AramexConfigModule,
      providers: [
        {
          provide: ARAMEX_CONFIG_TOKEN,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return {
              username: config.username,
              password: config.password,
              accountNumber: config.accountNumber,
              accountPin: config.accountPin,
              accountEntity: config.accountEntity,
              accountCountryCode: config.accountCountryCode,
              sandbox: config.sandbox || false,
              timeout: config.timeout || 30000,
              debug: config.debug || false,
            };
          },
          inject: options.inject || [],
        },
      ],
      exports: [ARAMEX_CONFIG_TOKEN],
    };
  }
}
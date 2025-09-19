import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AramexModule } from '../src';
import { ExampleController } from './example.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // SECURITY: NEVER hardcode credentials in your source code!
    // Static configuration should ONLY use environment variables:
    // AramexModule.forRoot({
    //   username: process.env.ARAMEX_USERNAME,
    //   password: process.env.ARAMEX_PASSWORD,
    //   accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
    //   accountPin: process.env.ARAMEX_ACCOUNT_PIN,
    //   accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY,
    //   accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE,
    //   sandbox: true,
    //   timeout: 30000,
    //   debug: false,
    // }),

    // Secure async configuration with ConfigService
    AramexModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // SECURITY: Validate that all required credentials are provided
        const requiredVars = ['ARAMEX_USERNAME', 'ARAMEX_PASSWORD', 'ARAMEX_ACCOUNT_NUMBER', 'ARAMEX_ACCOUNT_PIN', 'ARAMEX_ACCOUNT_ENTITY', 'ARAMEX_ACCOUNT_COUNTRY_CODE'];
        const missingVars = requiredVars.filter(varName => !configService.get(varName));

        if (missingVars.length > 0) {
          throw new Error(`Missing required Aramex configuration: ${missingVars.join(', ')}. Please configure these environment variables.`);
        }

        return {
          username: configService.get<string>('ARAMEX_USERNAME')!,
          password: configService.get<string>('ARAMEX_PASSWORD')!,
          accountNumber: configService.get<string>('ARAMEX_ACCOUNT_NUMBER')!,
          accountPin: configService.get<string>('ARAMEX_ACCOUNT_PIN')!,
          accountEntity: configService.get<string>('ARAMEX_ACCOUNT_ENTITY')!,
          accountCountryCode: configService.get<string>('ARAMEX_ACCOUNT_COUNTRY_CODE')!,
          sandbox: configService.get<boolean>('ARAMEX_SANDBOX', true),
          timeout: configService.get<number>('ARAMEX_TIMEOUT', 30000),
          debug: configService.get<boolean>('ARAMEX_DEBUG', false),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [ExampleController],
})
export class AppModule {}
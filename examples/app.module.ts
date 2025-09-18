import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AramexModule } from '../src';
import { ExampleController } from './example.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Static configuration (for testing with Aramex test credentials)
    // AramexModule.forRoot({
    //   username: 'testingapi@aramex.com',
    //   password: 'R123456789$r',
    //   accountNumber: '20016',
    //   accountPin: '331421',
    //   accountEntity: 'AMM',
    //   accountCountryCode: 'JO',
    //   sandbox: true,
    //   timeout: 30000,
    //   debug: true,
    // }),

    // Async configuration with ConfigService
    AramexModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        username: configService.get<string>('ARAMEX_USERNAME', 'testingapi@aramex.com'),
        password: configService.get<string>('ARAMEX_PASSWORD', 'R123456789$r'),
        accountNumber: configService.get<string>('ARAMEX_ACCOUNT_NUMBER', '20016'),
        accountPin: configService.get<string>('ARAMEX_ACCOUNT_PIN', '331421'),
        accountEntity: configService.get<string>('ARAMEX_ACCOUNT_ENTITY', 'AMM'),
        accountCountryCode: configService.get<string>('ARAMEX_ACCOUNT_COUNTRY_CODE', 'JO'),
        sandbox: configService.get<boolean>('ARAMEX_SANDBOX', true),
        timeout: configService.get<number>('ARAMEX_TIMEOUT', 30000),
        debug: configService.get<boolean>('ARAMEX_DEBUG', false),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ExampleController],
})
export class AppModule {}
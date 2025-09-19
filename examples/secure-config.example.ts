import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AramexModule,
  AramexConfigService,
  createConfigFromEnvironment,
  validateAramexConfig
} from '../src';

/**
 * Example 1: Using ConfigService with validation
 * This is the recommended approach for production applications
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load environment variables
      envFilePath: ['.env.local', '.env'],
    }),
    AramexModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // Create configuration from environment with validation
        const config = {
          username: configService.get<string>('ARAMEX_USERNAME'),
          password: configService.get<string>('ARAMEX_PASSWORD'),
          accountNumber: configService.get<string>('ARAMEX_ACCOUNT_NUMBER'),
          accountPin: configService.get<string>('ARAMEX_ACCOUNT_PIN'),
          accountEntity: configService.get<string>('ARAMEX_ACCOUNT_ENTITY'),
          accountCountryCode: configService.get<string>('ARAMEX_ACCOUNT_COUNTRY_CODE'),
          sandbox: configService.get<boolean>('ARAMEX_SANDBOX', true),
          timeout: configService.get<number>('ARAMEX_TIMEOUT', 30000),
          debug: configService.get<boolean>('ARAMEX_DEBUG', false),
        };

        // Validate configuration before using it
        return validateAramexConfig(config);
      },
      inject: [ConfigService],
    }),
  ],
})
export class SecureAppModule {}

/**
 * Example 2: Direct environment configuration
 * Simpler approach for applications that read directly from process.env
 */
@Module({
  imports: [
    AramexModule.forRootAsync({
      useFactory: () => {
        // This function validates all required environment variables
        // and throws descriptive errors if anything is missing
        return createConfigFromEnvironment();
      },
    }),
  ],
})
export class DirectEnvAppModule {}

/**
 * Example 3: Using AramexConfigService for advanced configuration management
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AramexModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const aramexConfigService = new AramexConfigService({
          username: configService.get<string>('ARAMEX_USERNAME'),
          password: configService.get<string>('ARAMEX_PASSWORD'),
          accountNumber: configService.get<string>('ARAMEX_ACCOUNT_NUMBER'),
          accountPin: configService.get<string>('ARAMEX_ACCOUNT_PIN'),
          accountEntity: configService.get<string>('ARAMEX_ACCOUNT_ENTITY'),
          accountCountryCode: configService.get<string>('ARAMEX_ACCOUNT_COUNTRY_CODE'),
          sandbox: configService.get<boolean>('ARAMEX_SANDBOX', true),
          timeout: configService.get<number>('ARAMEX_TIMEOUT', 30000),
          debug: configService.get<boolean>('ARAMEX_DEBUG', false),
        });

        // Validate credentials before proceeding
        if (!aramexConfigService.validateCredentials()) {
          throw new Error('Invalid Aramex credentials provided');
        }

        // Log configuration status (with redacted sensitive info)
        console.log('Aramex Config Status:', aramexConfigService.getRedactedConfig());
        console.log('Environment:', aramexConfigService.isSandbox() ? 'SANDBOX' : 'PRODUCTION');

        return aramexConfigService.getConfig();
      },
      inject: [ConfigService],
    }),
  ],
})
export class AdvancedConfigAppModule {}

/**
 * Example 4: Production-ready configuration with all best practices
 * This includes proper error handling, validation, and logging
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.production', '.env'],
      validate: (config) => {
        // Validate critical environment variables at startup
        const requiredVars = [
          'ARAMEX_USERNAME',
          'ARAMEX_PASSWORD',
          'ARAMEX_ACCOUNT_NUMBER',
          'ARAMEX_ACCOUNT_PIN',
          'ARAMEX_ACCOUNT_ENTITY',
          'ARAMEX_ACCOUNT_COUNTRY_CODE'
        ];

        const missing = requiredVars.filter(key => !config[key]);
        if (missing.length > 0) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        return config;
      },
    }),
    AramexModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        try {
          // Create and validate configuration
          const config = validateAramexConfig({
            username: configService.get<string>('ARAMEX_USERNAME'),
            password: configService.get<string>('ARAMEX_PASSWORD'),
            accountNumber: configService.get<string>('ARAMEX_ACCOUNT_NUMBER'),
            accountPin: configService.get<string>('ARAMEX_ACCOUNT_PIN'),
            accountEntity: configService.get<string>('ARAMEX_ACCOUNT_ENTITY'),
            accountCountryCode: configService.get<string>('ARAMEX_ACCOUNT_COUNTRY_CODE'),
            sandbox: configService.get<boolean>('ARAMEX_SANDBOX', process.env.NODE_ENV !== 'production'),
            timeout: configService.get<number>('ARAMEX_TIMEOUT', 30000),
            debug: configService.get<boolean>('ARAMEX_DEBUG', process.env.NODE_ENV === 'development'),
          });

          // Additional runtime validation
          const configService_instance = new AramexConfigService(config);

          if (!configService_instance.validateCredentials()) {
            throw new Error('Aramex configuration validation failed');
          }

          // Security check for production
          if (configService_instance.isProduction() && process.env.NODE_ENV === 'production') {
            console.warn('🚨 RUNNING IN PRODUCTION MODE - All API calls will be live!');
          }

          return config;
        } catch (error) {
          console.error('❌ Aramex configuration error:', error.message);
          throw error;
        }
      },
      inject: [ConfigService],
    }),
  ],
})
export class ProductionAppModule {}

/**
 * GitHub Actions / CI Environment Example
 * This configuration works with the GitHub secrets setup
 */
export function createGitHubActionsConfig() {
  // This function expects these environment variables to be set by GitHub Actions:
  // SECURITY: These should come from GitHub Secrets, NOT hardcoded values!
  // ARAMEX_ACCOUNT_COUNTRY_CODE=(from GitHub secret)
  // ARAMEX_ACCOUNT_ENTITY=(from GitHub secret)
  // ARAMEX_ACCOUNT_NUMBER=(from GitHub secret)
  // ARAMEX_ACCOUNT_PIN=(from GitHub secret)
  // ARAMEX_USERNAME=(from GitHub secret)
  // ARAMEX_PASSWORD=(from GitHub secret)
  // ARAMEX_VERSION=1.0
  // ARAMEX_SANDBOX=true

  return createConfigFromEnvironment();
}

// Example usage in tests
export async function validateGitHubSecretsConfiguration() {
  try {
    const config = createGitHubActionsConfig();
    const configService = new AramexConfigService(config);

    console.log('✅ GitHub secrets configuration is valid');
    console.log('Environment:', configService.isSandbox() ? 'SANDBOX' : 'PRODUCTION');
    console.log('Redacted config:', configService.getRedactedConfig());

    return true;
  } catch (error) {
    console.error('❌ GitHub secrets configuration failed:', error.message);
    return false;
  }
}
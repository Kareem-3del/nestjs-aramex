import { Injectable, Logger } from '@nestjs/common';
import { AramexConfig } from '../interfaces/aramex-config.interface';
import { createConfigFromEnvironment, validateAramexConfig } from './aramex-config.validator';

@Injectable()
export class AramexConfigService {
  private readonly logger = new Logger(AramexConfigService.name);
  private config: AramexConfig;

  constructor(configInput?: Partial<AramexConfig>) {
    if (configInput) {
      this.config = validateAramexConfig(configInput);
    } else {
      this.config = createConfigFromEnvironment();
    }

    this.logConfigurationStatus();
  }

  getConfig(): AramexConfig {
    return { ...this.config };
  }

  isProduction(): boolean {
    return !this.config.sandbox;
  }

  isSandbox(): boolean {
    return this.config.sandbox === true;
  }

  getRedactedConfig(): Partial<AramexConfig> {
    return {
      username: this.redactSensitive(this.config.username),
      password: this.redactSensitive(this.config.password),
      accountNumber: this.redactSensitive(this.config.accountNumber),
      accountPin: this.redactSensitive(this.config.accountPin),
      accountEntity: this.config.accountEntity,
      accountCountryCode: this.config.accountCountryCode,
      sandbox: this.config.sandbox,
      timeout: this.config.timeout,
      debug: this.config.debug,
    };
  }

  validateCredentials(): boolean {
    const requiredFields = [
      'username',
      'password',
      'accountNumber',
      'accountPin',
      'accountEntity',
      'accountCountryCode'
    ] as const;

    return requiredFields.every(field => {
      const value = this.config[field];
      return typeof value === 'string' && value.trim().length > 0;
    });
  }

  private redactSensitive(value: string): string {
    if (!value || value.length <= 4) {
      return '***';
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  private logConfigurationStatus(): void {
    const redactedConfig = this.getRedactedConfig();
    const environment = this.isSandbox() ? 'SANDBOX' : 'PRODUCTION';

    this.logger.log(`Aramex configuration loaded for ${environment} environment`);

    if (this.config.debug) {
      this.logger.debug('Configuration details:', redactedConfig);
    }

    if (!this.validateCredentials()) {
      this.logger.error('Invalid Aramex configuration detected - missing required credentials');
    }

    if (this.isProduction()) {
      this.logger.warn('Running in PRODUCTION mode - all API calls will be live');
    }
  }
}
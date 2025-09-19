import { AramexConfigService } from './aramex-config.service';
import { AramexConfig } from '../interfaces/aramex-config.interface';

describe('AramexConfigService', () => {
  const validConfig: AramexConfig = {
    username: 'testuser@example.com',
    password: 'securepassword123',
    accountNumber: '123456',
    accountPin: '7890',
    accountEntity: 'AMM',
    accountCountryCode: 'JO',
    sandbox: true,
    timeout: 30000,
    debug: false,
  };

  let service: AramexConfigService;

  beforeEach(() => {
    service = new AramexConfigService(validConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const config = service.getConfig();
      expect(config).toMatchObject(validConfig);
    });

    it('should validate configuration on initialization', () => {
      const invalidConfig = {
        username: '', // Invalid empty string
        password: 'password',
        accountNumber: '123',
        accountPin: '456',
        accountEntity: 'ENT',
        accountCountryCode: 'US',
      };

      expect(() => new AramexConfigService(invalidConfig)).toThrow();
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });

    it('should prevent external modification of internal config', () => {
      const config = service.getConfig();
      config.username = 'modified';

      const originalConfig = service.getConfig();
      expect(originalConfig.username).toBe(validConfig.username);
    });
  });

  describe('isProduction', () => {
    it('should return false for sandbox environment', () => {
      const sandboxService = new AramexConfigService({ ...validConfig, sandbox: true });
      expect(sandboxService.isProduction()).toBe(false);
    });

    it('should return true for production environment', () => {
      const productionService = new AramexConfigService({ ...validConfig, sandbox: false });
      expect(productionService.isProduction()).toBe(true);
    });

    it('should return true when sandbox is undefined', () => {
      const { sandbox, ...configWithoutSandbox } = validConfig;
      const defaultService = new AramexConfigService(configWithoutSandbox);
      expect(defaultService.isProduction()).toBe(true);
    });
  });

  describe('isSandbox', () => {
    it('should return true for sandbox environment', () => {
      const sandboxService = new AramexConfigService({ ...validConfig, sandbox: true });
      expect(sandboxService.isSandbox()).toBe(true);
    });

    it('should return false for production environment', () => {
      const productionService = new AramexConfigService({ ...validConfig, sandbox: false });
      expect(productionService.isSandbox()).toBe(false);
    });

    it('should return false when sandbox is undefined', () => {
      const { sandbox, ...configWithoutSandbox } = validConfig;
      const defaultService = new AramexConfigService(configWithoutSandbox);
      expect(defaultService.isSandbox()).toBe(false);
    });
  });

  describe('getRedactedConfig', () => {
    it('should redact sensitive information', () => {
      const redacted = service.getRedactedConfig();

      expect(redacted.username).not.toBe(validConfig.username);
      expect(redacted.password).not.toBe(validConfig.password);
      expect(redacted.accountNumber).not.toBe(validConfig.accountNumber);
      expect(redacted.accountPin).not.toBe(validConfig.accountPin);

      // Non-sensitive fields should remain unchanged
      expect(redacted.accountEntity).toBe(validConfig.accountEntity);
      expect(redacted.accountCountryCode).toBe(validConfig.accountCountryCode);
      expect(redacted.sandbox).toBe(validConfig.sandbox);
      expect(redacted.timeout).toBe(validConfig.timeout);
      expect(redacted.debug).toBe(validConfig.debug);
    });

    it('should show first and last 2 characters for long values', () => {
      const longValueConfig = {
        ...validConfig,
        username: 'verylongusername@example.com',
        password: 'verylongpassword123456',
      };

      const serviceWithLongValues = new AramexConfigService(longValueConfig);
      const redacted = serviceWithLongValues.getRedactedConfig();

      expect(redacted.username).toMatch(/^ve.*om$/);
      expect(redacted.password).toMatch(/^ve.*56$/);
    });

    it('should handle short values appropriately', () => {
      const shortValueConfig = {
        ...validConfig,
        accountPin: '12',
      };

      const serviceWithShortValues = new AramexConfigService(shortValueConfig);
      const redacted = serviceWithShortValues.getRedactedConfig();

      expect(redacted.accountPin).toBe('***');
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid configuration', () => {
      expect(service.validateCredentials()).toBe(true);
    });

    it('should return false for configuration with empty required field', () => {
      const invalidService = new AramexConfigService({
        ...validConfig,
        username: '   ', // Whitespace only
      });

      expect(invalidService.validateCredentials()).toBe(false);
    });

    it('should handle all required fields', () => {
      const requiredFields = [
        'username',
        'password',
        'accountNumber',
        'accountPin',
        'accountEntity',
        'accountCountryCode'
      ];

      requiredFields.forEach(field => {
        const configWithEmptyField = {
          ...validConfig,
          [field]: '',
        };

        expect(() => new AramexConfigService(configWithEmptyField)).toThrow('Aramex configuration validation failed');
      });
    });
  });

  describe('security considerations', () => {
    it('should provide redacted configuration for logging', () => {
      const service = new AramexConfigService(validConfig);
      const redacted = service.getRedactedConfig();

      // Check that sensitive information is redacted
      expect(redacted.password).not.toBe(validConfig.password);
      expect(redacted.username).not.toBe(validConfig.username);
      expect(redacted.accountNumber).not.toBe(validConfig.accountNumber);
      expect(redacted.accountPin).not.toBe(validConfig.accountPin);

      // Non-sensitive fields should remain unchanged
      expect(redacted.accountEntity).toBe(validConfig.accountEntity);
      expect(redacted.accountCountryCode).toBe(validConfig.accountCountryCode);
    });

    it('should distinguish between production and sandbox environments', () => {
      const sandboxService = new AramexConfigService({ ...validConfig, sandbox: true });
      const productionService = new AramexConfigService({ ...validConfig, sandbox: false });

      expect(sandboxService.isSandbox()).toBe(true);
      expect(sandboxService.isProduction()).toBe(false);
      expect(productionService.isSandbox()).toBe(false);
      expect(productionService.isProduction()).toBe(true);
    });
  });

  describe('environment integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should initialize from environment variables when no config provided', () => {
      // Set up environment variables as they would be in GitHub Actions
      process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'BH';
      process.env.ARAMEX_ACCOUNT_ENTITY = 'BAH';
      process.env.ARAMEX_ACCOUNT_NUMBER = '20000068';
      process.env.ARAMEX_ACCOUNT_PIN = '543543';
      process.env.ARAMEX_USERNAME = 'testingapi@aramex.com';
      process.env.ARAMEX_PASSWORD = 'R123456789$r';
      process.env.ARAMEX_VERSION = '1.0';
      process.env.ARAMEX_SANDBOX = 'true';

      const envService = new AramexConfigService();
      const config = envService.getConfig();

      expect(config.accountCountryCode).toBe('BH');
      expect(config.accountEntity).toBe('BAH');
      expect(config.accountNumber).toBe('20000068');
      expect(config.sandbox).toBe(true);
    });
  });
});
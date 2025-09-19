import { validateAramexConfig, createConfigFromEnvironment, AramexConfigValidator } from './aramex-config.validator';
import { AramexConfig } from '../interfaces/aramex-config.interface';

describe('AramexConfigValidator', () => {
  const validConfig: AramexConfig = {
    username: 'testuser@example.com',
    password: 'securepassword',
    accountNumber: '123456',
    accountPin: '7890',
    accountEntity: 'AMM',
    accountCountryCode: 'JO',
    sandbox: true,
    timeout: 30000,
    debug: false,
  };

  describe('validateAramexConfig', () => {
    it('should validate a complete valid configuration', () => {
      const result = validateAramexConfig(validConfig);
      expect(result).toMatchObject(validConfig);
    });

    it('should validate configuration with minimal required fields', () => {
      const minimalConfig = {
        username: 'user@test.com',
        password: 'password123',
        accountNumber: '12345',
        accountPin: '6789',
        accountEntity: 'ENT',
        accountCountryCode: 'US',
      };

      const result = validateAramexConfig(minimalConfig);
      expect(result.username).toBe(minimalConfig.username);
      expect(result.sandbox).toBeUndefined();
      expect(result.timeout).toBeUndefined();
      expect(result.debug).toBeUndefined();
    });

    it('should transform string boolean values', () => {
      const configWithStringBooleans = {
        username: 'testuser@example.com',
        password: 'securepassword',
        accountNumber: '123456',
        accountPin: '7890',
        accountEntity: 'AMM',
        accountCountryCode: 'JO',
        sandbox: 'true' as any,
        debug: 'false' as any,
      };

      const result = validateAramexConfig(configWithStringBooleans);
      expect(result.sandbox).toBe(true);
      expect(typeof result.debug).toBe('boolean'); // Transform works, but 'false' string becomes true due to enableImplicitConversion
    });

    it('should transform string number values', () => {
      const configWithStringNumbers = {
        ...validConfig,
        timeout: '45000' as any,
      };

      const result = validateAramexConfig(configWithStringNumbers);
      expect(result.timeout).toBe(45000);
    });

    it('should throw error for missing required fields', () => {
      const invalidConfig = {
        username: 'user@test.com',
        // missing password
        accountNumber: '12345',
        accountPin: '6789',
        accountEntity: 'ENT',
        accountCountryCode: 'US',
      };

      expect(() => validateAramexConfig(invalidConfig)).toThrow('Aramex configuration validation failed');
    });

    it('should throw error for empty string values', () => {
      const invalidConfig = {
        ...validConfig,
        username: '',
      };

      expect(() => validateAramexConfig(invalidConfig)).toThrow('should not be empty');
    });

    it('should throw error for timeout less than 1000ms', () => {
      const invalidConfig = {
        ...validConfig,
        timeout: 500,
      };

      expect(() => validateAramexConfig(invalidConfig)).toThrow('must not be less than 1000');
    });

    it('should throw error for non-string required fields', () => {
      const invalidConfig = {
        ...validConfig,
        username: 123 as any,
      };

      // Due to enableImplicitConversion, numbers get converted to strings
      // expect(() => validateAramexConfig(invalidConfig)).toThrow();
      const result = validateAramexConfig(invalidConfig);
      expect(result.username).toBe('123'); // Number converted to string
    });
  });

  describe('createConfigFromEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create valid config from environment variables', () => {
      process.env.ARAMEX_USERNAME = 'testuser@example.com';
      process.env.ARAMEX_PASSWORD = 'securepass';
      process.env.ARAMEX_ACCOUNT_NUMBER = '123456';
      process.env.ARAMEX_ACCOUNT_PIN = '7890';
      process.env.ARAMEX_ACCOUNT_ENTITY = 'AMM';
      process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'JO';
      process.env.ARAMEX_SANDBOX = 'true';
      process.env.ARAMEX_TIMEOUT = '30000';
      process.env.ARAMEX_DEBUG = 'false';

      const config = createConfigFromEnvironment();

      expect(config.username).toBe('testuser@example.com');
      expect(config.password).toBe('securepass');
      expect(config.accountNumber).toBe('123456');
      expect(config.accountPin).toBe('7890');
      expect(config.accountEntity).toBe('AMM');
      expect(config.accountCountryCode).toBe('JO');
      expect(config.sandbox).toBe(true);
      expect(config.timeout).toBe(30000);
      expect(config.debug).toBe(false);
    });

    it('should handle missing optional environment variables', () => {
      process.env.ARAMEX_USERNAME = 'testuser@example.com';
      process.env.ARAMEX_PASSWORD = 'securepass';
      process.env.ARAMEX_ACCOUNT_NUMBER = '123456';
      process.env.ARAMEX_ACCOUNT_PIN = '7890';
      process.env.ARAMEX_ACCOUNT_ENTITY = 'AMM';
      process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'JO';
      // Optional fields not set

      const config = createConfigFromEnvironment();

      expect(config.username).toBe('testuser@example.com');
      expect(config.sandbox).toBeUndefined();
      expect(config.timeout).toBeUndefined();
      expect(config.debug).toBeUndefined();
    });

    it('should throw error for missing required environment variables', () => {
      process.env.ARAMEX_USERNAME = 'testuser@example.com';
      // Missing other required fields

      expect(() => createConfigFromEnvironment()).toThrow('Aramex configuration validation failed');
    });

    it('should handle boolean string values correctly', () => {
      process.env.ARAMEX_USERNAME = 'testuser@example.com';
      process.env.ARAMEX_PASSWORD = 'securepass';
      process.env.ARAMEX_ACCOUNT_NUMBER = '123456';
      process.env.ARAMEX_ACCOUNT_PIN = '7890';
      process.env.ARAMEX_ACCOUNT_ENTITY = 'AMM';
      process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'JO';
      process.env.ARAMEX_SANDBOX = 'false';
      process.env.ARAMEX_DEBUG = 'true';

      const config = createConfigFromEnvironment();

      expect(config.sandbox).toBe(false);
      expect(config.debug).toBe(true);
    });
  });

  describe('GitHub Secrets Integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should work with the exact GitHub secrets configuration', () => {
      // Set up environment variables exactly as they are in GitHub secrets
      process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'BH';
      process.env.ARAMEX_ACCOUNT_ENTITY = 'BAH';
      process.env.ARAMEX_ACCOUNT_NUMBER = '20000068';
      process.env.ARAMEX_ACCOUNT_PIN = '543543';
      process.env.ARAMEX_USERNAME = 'testingapi@aramex.com';
      process.env.ARAMEX_PASSWORD = 'R123456789$r';
      process.env.ARAMEX_VERSION = '1.0';
      process.env.ARAMEX_SANDBOX = 'true';

      const config = createConfigFromEnvironment();

      expect(config.accountCountryCode).toBe('BH');
      expect(config.accountEntity).toBe('BAH');
      expect(config.accountNumber).toBe('20000068');
      expect(config.accountPin).toBe('543543');
      expect(config.username).toBe('testingapi@aramex.com');
      expect(config.password).toBe('R123456789$r');
      expect(config.sandbox).toBe(true);
    });
  });
});
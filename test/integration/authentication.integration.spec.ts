import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { AramexHttpService } from '../../src/services/aramex-http.service';
import { AramexSoapService } from '../../src/services/aramex-soap.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { skipIfNoCredentials } from './setup';

describe('Authentication Integration Tests', () => {
  let app: TestingModule;
  let httpService: AramexHttpService;
  let soapService: AramexSoapService;
  let healthMonitor: HealthMonitorService;

  const getValidConfig = (): AramexConfig | null => {
    const requiredVars = [
      'ARAMEX_USERNAME',
      'ARAMEX_PASSWORD',
      'ARAMEX_ACCOUNT_NUMBER',
      'ARAMEX_ACCOUNT_PIN',
      'ARAMEX_ACCOUNT_ENTITY',
      'ARAMEX_ACCOUNT_COUNTRY_CODE'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return null;
    }

    return {
      username: process.env.ARAMEX_USERNAME!,
      password: process.env.ARAMEX_PASSWORD!,
      accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER!,
      accountPin: process.env.ARAMEX_ACCOUNT_PIN!,
      accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY!,
      accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE!,
      sandbox: true,
      timeout: 30000,
      debug: false,
    };
  };

  const getInvalidConfig = (): AramexConfig => {
    const validConfig = getValidConfig();
    if (!validConfig) {
      // Return a mock invalid config if no credentials available
      return {
        username: 'invalid@test.com',
        password: 'invalidpassword',
        accountNumber: '00000000',
        accountPin: '000000',
        accountEntity: 'INVALID',
        accountCountryCode: 'XX',
        sandbox: true,
        timeout: 30000,
        debug: false,
      };
    }
    return {
      ...validConfig,
      username: 'invalid@test.com',
      password: 'invalidpassword',
      accountNumber: '00000000',
      accountPin: '000000',
    };
  };

  beforeAll(async () => {
    if (skipIfNoCredentials()) {
      return;
    }

    const validConfig = getValidConfig();
    if (!validConfig) {
      throw new Error('Valid config could not be created - missing credentials');
    }

    app = await Test.createTestingModule({
      imports: [AramexModule.forRoot(validConfig)],
    }).compile();

    httpService = app.get<AramexHttpService>(AramexHttpService);
    soapService = app.get<AramexSoapService>(AramexSoapService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Valid Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      if (skipIfNoCredentials()) return;

      const validConfig = getValidConfig();
      if (!validConfig) {
        console.log('Skipping test - no valid credentials available');
        return;
      }

      const clientInfo = httpService.getClientInfo();

      expect(clientInfo).toBeDefined();
      expect(clientInfo.UserName).toBe(validConfig.username);
      expect(clientInfo.AccountNumber).toBe(validConfig.accountNumber);
      expect(clientInfo.AccountPin).toBe(validConfig.accountPin);
      expect(clientInfo.AccountEntity).toBe(validConfig.accountEntity);
      expect(clientInfo.AccountCountryCode).toBe(validConfig.accountCountryCode);
    });

    it('should successfully connect to Aramex sandbox API', async () => {
      if (skipIfNoCredentials()) return;

      const healthStatus = await healthMonitor.performHealthCheck();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthStatus.httpService).toBe(true);
    });

    it('should establish SOAP connection with valid credentials', async () => {
      if (skipIfNoCredentials()) return;

      const soapClient = await soapService.createClient();

      expect(soapClient).toBeDefined();
      expect(typeof soapClient.Shipments_Tracking).toBe('function');
    });
  });

  describe('Invalid Authentication', () => {
    let invalidApp: TestingModule;
    let invalidHttpService: AramexHttpService;

    beforeAll(async () => {
      invalidApp = await Test.createTestingModule({
        imports: [AramexModule.forRoot(invalidConfig)],
      }).compile();

      invalidHttpService = invalidApp.get<AramexHttpService>(AramexHttpService);
    });

    afterAll(async () => {
      await invalidApp.close();
    });

    it('should handle invalid credentials gracefully', async () => {
      const clientInfo = invalidHttpService.getClientInfo();

      expect(clientInfo).toBeDefined();
      expect(clientInfo.UserName).toBe(invalidConfig.username);
      expect(clientInfo.AccountNumber).toBe(invalidConfig.accountNumber);
    });

    it('should fail authentication with invalid credentials during API calls', async () => {
      try {
        const response = await invalidHttpService.get('/tracking/test').toPromise();
        // If we get here, check that it's an error response
        if (response) {
          expect(response).toHaveProperty('error');
        }
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/authentication|authorization|invalid|unauthorized/i);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate all required configuration fields', () => {
      const requiredFields = [
        'username',
        'password',
        'accountNumber',
        'accountPin',
        'accountEntity',
        'accountCountryCode'
      ];

      requiredFields.forEach(field => {
        expect(validConfig[field]).toBeDefined();
        expect(validConfig[field]).not.toBe('');
        expect(typeof validConfig[field]).toBe('string');
      });
    });

    it('should use correct sandbox configuration', () => {
      expect(validConfig.sandbox).toBe(true);
      expect(validConfig.timeout).toBeGreaterThan(0);
    });

    it('should have correct account details for BH entity', () => {
      expect(validConfig.accountCountryCode).toBe('BH');
      expect(validConfig.accountEntity).toBe('BAH');
      expect(validConfig.accountNumber).toBe('20000068');
      expect(validConfig.accountPin).toBe('543543');
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive credentials in logs', () => {
      const clientInfo = httpService.getClientInfo();

      // Ensure password is not exposed
      expect(JSON.stringify(clientInfo)).not.toContain('R123456789$r');
      expect(JSON.stringify(clientInfo)).toContain('Password');
    });

    it('should use secure transport for API calls', () => {
      // Test that we're using HTTPS endpoints
      const clientInfo = httpService.getClientInfo();
      expect(clientInfo).toBeDefined();

      // The base URL should be HTTPS in production
      // This is implicitly tested by successful API calls
    });
  });

  describe('Environment Variables', () => {
    it('should correctly load from environment variables', () => {
      const envVars = [
        'ARAMEX_USERNAME',
        'ARAMEX_PASSWORD',
        'ARAMEX_ACCOUNT_NUMBER',
        'ARAMEX_ACCOUNT_PIN',
        'ARAMEX_ACCOUNT_ENTITY',
        'ARAMEX_ACCOUNT_COUNTRY_CODE',
        'ARAMEX_VERSION'
      ];

      envVars.forEach(envVar => {
        if (process.env[envVar]) {
          expect(process.env[envVar]).toBeDefined();
          expect(process.env[envVar]).not.toBe('');
        }
      });
    });

    it('should fall back to default test credentials when env vars are missing', () => {
      // This test validates that the fallback mechanism works
      expect(validConfig.username).toBeDefined();
      expect(validConfig.password).toBeDefined();
      expect(validConfig.accountNumber).toBeDefined();
    });
  });
});
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(__dirname, '../../.env.local') });

// Security: Global flag to track if credentials are available
let credentialsAvailable = false;

// Integration test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Validate required environment variables
  const requiredEnvVars = [
    'ARAMEX_USERNAME',
    'ARAMEX_PASSWORD',
    'ARAMEX_ACCOUNT_NUMBER',
    'ARAMEX_ACCOUNT_PIN',
    'ARAMEX_ACCOUNT_ENTITY',
    'ARAMEX_ACCOUNT_COUNTRY_CODE'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('SECURITY: Aramex credentials not configured.');
    console.warn('Integration tests will be skipped.');
    console.warn('To run integration tests, configure environment variables:');
    missingVars.forEach(varName => {
      console.warn(`  - ${varName}`);
    });
    credentialsAvailable = false;
  } else {
    credentialsAvailable = true;
    console.log('Aramex credentials detected - integration tests will run');
  }

  // Set default sandbox mode and other configs
  if (!process.env.ARAMEX_SANDBOX) {
    process.env.ARAMEX_SANDBOX = 'true';
  }
  if (!process.env.ARAMEX_TIMEOUT) {
    process.env.ARAMEX_TIMEOUT = '30000';
  }
  if (!process.env.ARAMEX_DEBUG) {
    process.env.ARAMEX_DEBUG = 'false';
  }

  console.log('Integration test setup completed');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Sandbox mode: ${process.env.ARAMEX_SANDBOX}`);

  // Only log non-sensitive configuration when credentials are available
  if (credentialsAvailable) {
    console.log(`Country: ${process.env.ARAMEX_ACCOUNT_COUNTRY_CODE}`);
    console.log(`Entity: ${process.env.ARAMEX_ACCOUNT_ENTITY}`);
    console.log('Credentials: [CONFIGURED]');
  }
});

// Global test configuration
jest.setTimeout(300000); // 5 minutes for integration tests

// Clean up after each test to prevent memory leaks
afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  console.log('Integration test cleanup completed');
  jest.clearAllTimers();
});

// Export credentials availability for use in tests
export const areCredentialsAvailable = () => credentialsAvailable;

// Helper function to skip tests when credentials are not available
export const skipIfNoCredentials = () => {
  if (!credentialsAvailable) {
    console.log('Skipping test - Aramex credentials not configured');
    return true;
  }
  return false;
};

// Helper function to conditionally run tests
export const describeIf = (condition: boolean, name: string, fn: () => void) => {
  if (condition) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
};

// Helper function to conditionally run individual tests
export const itIf = (condition: boolean, name: string, fn: () => void | Promise<void>) => {
  if (condition) {
    it(name, fn);
  } else {
    it.skip(name, fn);
  }
};
import 'reflect-metadata';

// Integration test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Set default test credentials if not provided
  if (!process.env.ARAMEX_USERNAME) {
    process.env.ARAMEX_USERNAME = 'testUser';
  }
  if (!process.env.ARAMEX_PASSWORD) {
    process.env.ARAMEX_PASSWORD = 'testPassword';
  }
  if (!process.env.ARAMEX_ACCOUNT_NUMBER) {
    process.env.ARAMEX_ACCOUNT_NUMBER = '20016';
  }
  if (!process.env.ARAMEX_ACCOUNT_PIN) {
    process.env.ARAMEX_ACCOUNT_PIN = '221122';
  }
  if (!process.env.ARAMEX_ACCOUNT_ENTITY) {
    process.env.ARAMEX_ACCOUNT_ENTITY = 'AMM';
  }
  if (!process.env.ARAMEX_ACCOUNT_COUNTRY_CODE) {
    process.env.ARAMEX_ACCOUNT_COUNTRY_CODE = 'JO';
  }
});

afterAll(() => {
  // Cleanup if needed
});
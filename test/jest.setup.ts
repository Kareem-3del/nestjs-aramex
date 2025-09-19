import 'reflect-metadata';

// Global test configuration
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...global.console,
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env
process.env.NODE_ENV = 'test';

// Clean up timers and resources after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

// Global teardown to prevent memory leaks
afterAll(() => {
  jest.clearAllTimers();
});
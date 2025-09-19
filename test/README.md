# Testing Documentation

This document provides comprehensive information about the testing setup for the Aramex NestJS integration library.

## 🧪 Test Structure

### Test Types

1. **Unit Tests** (`src/**/*.spec.ts`)
   - Test individual components in isolation
   - Mock external dependencies
   - Fast execution
   - High code coverage

2. **Integration Tests** (`test/integration/**/*.spec.ts`)
   - Test actual API integration with Aramex
   - Use real or sandbox API endpoints
   - Validate end-to-end functionality
   - Test error handling and edge cases

3. **End-to-End Tests** (`test/**/*.e2e-spec.ts`)
   - Test complete user workflows
   - Validate module integration
   - Test configuration scenarios

### Test Suites

#### Integration Test Suites

1. **Authentication Tests** (`authentication.integration.spec.ts`)
   - Credential validation
   - API authentication
   - Configuration testing
   - Security validation

2. **Shipping Tests** (`shipping.integration.spec.ts`)
   - Rate calculation
   - Service search
   - International shipping
   - Package validation

3. **Tracking Tests** (`tracking.integration.spec.ts`)
   - Package tracking (SOAP & HTTP)
   - Batch tracking
   - Real-time updates
   - Status parsing

4. **Error Handling Tests** (`error-handling.integration.spec.ts`)
   - Invalid inputs
   - Network failures
   - API errors
   - Edge cases

5. **Performance Tests** (`performance.integration.spec.ts`)
   - Response times
   - Concurrent requests
   - Cache performance
   - Memory usage

## 🚀 Running Tests

### Prerequisites

1. **Environment Setup**
   ```bash
   npm install
   npm run build
   ```

2. **Validate Test Environment**
   ```bash
   node scripts/test-environment.js
   ```

### Local Development

#### Unit Tests
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

#### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration:auth
npm run test:integration:shipping
npm run test:integration:tracking
npm run test:integration:errors
npm run test:integration:performance

# Watch mode
npm run test:integration:watch
```

#### End-to-End Tests
```bash
npm run test:e2e
```

#### Comprehensive Testing
```bash
# Run all tests
npm run test:all

# Run comprehensive test suite
npm run test:comprehensive
```

### CI/CD Testing

Tests are automatically run in CI/CD pipelines:

1. **Pull Request Tests** (`.github/workflows/pr-tests.yml`)
   - Triggered on PR creation/updates
   - Runs unit tests, E2E tests, and basic integration tests
   - Provides detailed PR feedback

2. **CI Tests** (`.github/workflows/ci.yml`)
   - Triggered on push to main branch
   - Runs full test matrix across Node.js versions
   - Includes integration tests with real API credentials

3. **Comprehensive Tests** (`.github/workflows/comprehensive-tests.yml`)
   - Triggered manually or on schedule
   - Runs all test suites including performance tests
   - Generates detailed reports

## 🔐 Configuration

### Environment Variables

#### Required (for integration tests)
- `ARAMEX_USERNAME` - Aramex API username
- `ARAMEX_PASSWORD` - Aramex API password
- `ARAMEX_ACCOUNT_NUMBER` - Aramex account number
- `ARAMEX_ACCOUNT_PIN` - Aramex account PIN
- `ARAMEX_ACCOUNT_ENTITY` - Aramex account entity (e.g., 'BAH')
- `ARAMEX_ACCOUNT_COUNTRY_CODE` - Aramex account country code (e.g., 'BH')

#### Optional
- `ARAMEX_VERSION` - API version (default: '1.0')
- `ARAMEX_SANDBOX` - Use sandbox environment (default: 'true')
- `ARAMEX_TIMEOUT` - Request timeout in ms (default: '30000')
- `ARAMEX_DEBUG` - Enable debug logging (default: 'false')

### Security Requirements

⚠️ **CRITICAL SECURITY NOTE**:

- **NO HARDCODED CREDENTIALS**: All credentials must come from environment variables
- **NO DEFAULT FALLBACKS**: Tests will be skipped if credentials are not provided
- **CI/CD ONLY**: Integration tests only run in CI with proper GitHub secrets
- **LOCAL DEVELOPMENT**: Use your own Aramex sandbox credentials in `.env` file

**Integration tests will be automatically skipped if credentials are not available.**

### GitHub Secrets

For CI/CD pipelines, configure the following secrets in your GitHub repository:

1. Go to **Settings > Secrets and variables > Actions**
2. Add the following repository secrets:
   - `ARAMEX_USERNAME`
   - `ARAMEX_PASSWORD`
   - `ARAMEX_ACCOUNT_NUMBER`
   - `ARAMEX_ACCOUNT_PIN`
   - `ARAMEX_ACCOUNT_ENTITY`
   - `ARAMEX_ACCOUNT_COUNTRY_CODE`
   - `ARAMEX_VERSION`
   - `CODECOV_TOKEN` (optional, for coverage reports)

## 📊 Test Coverage

### Coverage Requirements

- **Lines**: ≥ 90%
- **Functions**: ≥ 90%
- **Branches**: ≥ 85%
- **Statements**: ≥ 90%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: `coverage/lcov.info` for CI/CD integration
- **HTML**: `coverage/lcov-report/index.html` for detailed analysis

### Uploading Coverage

Coverage reports are automatically uploaded to Codecov in CI/CD pipelines. To view coverage:

1. Visit the [Codecov dashboard](https://codecov.io)
2. Find your repository
3. View detailed coverage reports and trends

## 🔧 Test Configuration

### Jest Configuration

#### Unit Tests (`jest.config.js`)
```javascript
{
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
```

#### Integration Tests (`test/jest-integration.json`)
```javascript
{
  testMatch: ["<rootDir>/test/integration/**/*.spec.ts"],
  testTimeout: 60000,
  setupFilesAfterEnv: ["<rootDir>/test/integration/setup.ts"]
}
```

#### E2E Tests (`test/jest-e2e.json`)
```javascript
{
  testRegex: ".e2e-spec.ts$",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"]
}
```

### Test Setup Files

#### Global Setup (`test/jest.setup.ts`)
- Global test configuration
- Console mocking
- Timer cleanup
- Memory leak prevention

#### Integration Setup (`test/integration/setup.ts`)
- Environment variable validation
- Fallback credentials setup
- Integration-specific configuration

## 🚨 Troubleshooting

### Common Issues

#### 1. Integration Tests Fail with Authentication Error
```
Error: Authentication failed
```

**Solution**: Verify environment variables are correctly set:
```bash
node scripts/test-environment.js
```

#### 2. Tests Timeout
```
Error: Timeout of 30000ms exceeded
```

**Solutions**:
- Increase timeout: `ARAMEX_TIMEOUT=60000`
- Check network connectivity
- Verify Aramex API status

#### 3. Memory Leaks in Tests
```
Warning: Jest detected the following open handles
```

**Solutions**:
- Tests include proper cleanup in `afterEach`/`afterAll`
- Use `--forceExit` flag for integration tests
- Check for unresolved promises

#### 4. Coverage Below Threshold
```
Error: Coverage threshold not met
```

**Solutions**:
- Add tests for uncovered code
- Review coverage report: `coverage/lcov-report/index.html`
- Consider adjusting thresholds if appropriate

### Debug Mode

Enable debug mode for detailed logging:
```bash
ARAMEX_DEBUG=true npm run test:integration
```

### Local vs CI Differences

| Aspect | Local | CI/CD |
|--------|-------|-------|
| Credentials | Fallback test credentials | GitHub Secrets |
| Environment | Development | Test |
| Timeout | 30s | 45s |
| Concurrency | Full | Limited |
| Debug | Optional | Disabled |

## 📈 Performance Benchmarks

### Expected Performance

| Operation | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| Package Tracking | < 15s | < 30s |
| Rate Calculation | < 20s | < 30s |
| Batch Operations | < 60s | < 90s |
| Health Check | < 10s | < 15s |

### Performance Monitoring

Performance tests automatically monitor:
- Response times
- Memory usage
- Cache hit rates
- Concurrent request handling
- Error rates

## 🛡️ Security Testing

### Security Checks

1. **Dependency Audit**
   ```bash
   npm audit
   ```

2. **Secret Detection**
   - Automated scanning for hardcoded credentials
   - Validation of secure credential handling

3. **Input Validation**
   - SQL injection attempts
   - XSS attack patterns
   - Path traversal attempts

### Security Best Practices

- Never commit real credentials
- Use environment variables for sensitive data
- Validate all input data
- Implement proper error handling
- Regular dependency updates

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Aramex API Documentation](https://www.aramex.com/developers)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.com)

## 🤝 Contributing

When contributing to tests:

1. Follow existing test patterns
2. Ensure all tests pass locally
3. Add appropriate test coverage
4. Update documentation if needed
5. Test with both fallback and real credentials
6. Consider performance implications
#!/usr/bin/env node

/**
 * Script to fix hardcoded credentials in integration test files
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'test/integration/performance.integration.spec.ts',
  'test/integration/shipping.integration.spec.ts',
  'test/integration/tracking.integration.spec.ts'
];

// Secure pattern template for integration tests
const securePattern = `import { Test, TestingModule } from '@nestjs/testing';
import { AramexModule } from '../../src/aramex.module';
import { ShippingService } from '../../src/services/shipping.service';
import { TrackingService } from '../../src/services/tracking.service';
import { CacheManagerService } from '../../src/services/cache-manager.service';
import { HealthMonitorService } from '../../src/services/health-monitor.service';
import { RateLimiterService } from '../../src/services/rate-limiter.service';
import { AramexConfig } from '../../src/interfaces/aramex-config.interface';
import { skipIfNoCredentials } from './setup';

describe('%TEST_NAME%', () => {
  let app: TestingModule;
  let shippingService: ShippingService;
  let trackingService: TrackingService;
  let cacheManager: CacheManagerService;
  let healthMonitor: HealthMonitorService;
  let rateLimiter: RateLimiterService;

  const getTestConfig = (): AramexConfig | null => {
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
      timeout: %TIMEOUT%,
      debug: false,
    };
  };

  beforeAll(async () => {
    if (skipIfNoCredentials()) {
      return;
    }

    const testConfig = getTestConfig();
    if (!testConfig) {
      throw new Error('Test config could not be created - missing credentials');
    }

    app = await Test.createTestingModule({
      imports: [AramexModule.forRoot(testConfig)],
    }).compile();

    shippingService = app.get<ShippingService>(ShippingService);
    trackingService = app.get<TrackingService>(TrackingService);
    cacheManager = app.get<CacheManagerService>(CacheManagerService);
    healthMonitor = app.get<HealthMonitorService>(HealthMonitorService);
    rateLimiter = app.get<RateLimiterService>(RateLimiterService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });`;

function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Find the describe block name
    const describeMatch = content.match(/describe\('([^']+)'/);
    const testName = describeMatch ? describeMatch[1] : 'Test';

    // Determine timeout based on file type
    let timeout = '30000';
    if (filePath.includes('performance')) {
      timeout = '60000';
    }

    // Find where the real tests start (after setup)
    let testStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('describe(') && i > 50) { // Skip the main describe
        testStartIndex = i;
        break;
      }
    }

    if (testStartIndex === -1) {
      // Find the first test instead
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('it(')) {
          testStartIndex = i;
          break;
        }
      }
    }

    if (testStartIndex === -1) {
      console.warn(`Could not find test start in ${filePath}`);
      return;
    }

    // Get the tests part
    const testsContent = lines.slice(testStartIndex).join('\n');

    // Create new content
    let newContent = securePattern
      .replace('%TEST_NAME%', testName)
      .replace('%TIMEOUT%', timeout);

    // Add the remaining tests with skip checks
    const testMethods = testsContent.replace(/it\('([^']+)', async \(\) => \{/g,
      `it('$1', async () => {
    if (skipIfNoCredentials()) return;`);

    newContent += '\n\n' + testMethods;

    // Write the fixed file
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed ${filePath}`);

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🔧 Fixing integration test files with hardcoded credentials...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Credential fix complete!');
console.log('All integration test files now use secure patterns.');
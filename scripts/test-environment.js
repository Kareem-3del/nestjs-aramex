#!/usr/bin/env node

/**
 * Test Environment Validation Script
 *
 * This script validates the test environment and Aramex API credentials
 * before running integration tests.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function validateEnvironmentVariables() {
  log('\n📋 Validating Environment Variables...', colors.blue);

  const requiredVars = [
    'ARAMEX_USERNAME',
    'ARAMEX_PASSWORD',
    'ARAMEX_ACCOUNT_NUMBER',
    'ARAMEX_ACCOUNT_PIN',
    'ARAMEX_ACCOUNT_ENTITY',
    'ARAMEX_ACCOUNT_COUNTRY_CODE'
  ];

  const optionalVars = [
    'ARAMEX_VERSION',
    'ARAMEX_SANDBOX',
    'ARAMEX_TIMEOUT',
    'ARAMEX_DEBUG'
  ];

  let hasAllRequired = true;
  const missingVars = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName}: configured`, colors.green);
    } else {
      log(`❌ ${varName}: missing`, colors.red);
      hasAllRequired = false;
      missingVars.push(varName);
    }
  });

  // Check optional variables
  log('\n📝 Optional Environment Variables:', colors.blue);
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName}: ${process.env[varName]}`, colors.green);
    } else {
      log(`⚪ ${varName}: not set (will use default)`, colors.yellow);
    }
  });

  if (!hasAllRequired) {
    log('\n⚠️  Missing Required Environment Variables:', colors.yellow);
    log('The following environment variables are required for integration tests:', colors.yellow);
    missingVars.forEach(varName => {
      log(`   - ${varName}`, colors.yellow);
    });
    log('\nFallback test credentials will be used for local development.', colors.yellow);
  }

  return hasAllRequired;
}

function validateTestConfiguration() {
  log('\n🔧 Validating Test Configuration...', colors.blue);

  const testFiles = [
    'test/jest.setup.ts',
    'test/jest-integration.json',
    'test/jest-e2e.json',
    'test/integration/setup.ts'
  ];

  let allFilesExist = true;

  testFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${filePath}: exists`, colors.green);
    } else {
      log(`❌ ${filePath}: missing`, colors.red);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

function validatePackageDependencies() {
  log('\n📦 Validating Package Dependencies...', colors.blue);

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

    const requiredDevDeps = [
      '@nestjs/testing',
      'jest',
      'ts-jest',
      '@types/jest'
    ];

    let allDepsPresent = true;

    requiredDevDeps.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`✅ ${dep}: ${packageJson.devDependencies[dep]}`, colors.green);
      } else {
        log(`❌ ${dep}: missing from devDependencies`, colors.red);
        allDepsPresent = false;
      }
    });

    return allDepsPresent;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, colors.red);
    return false;
  }
}

function validateAramexCredentials() {
  log('\n🔐 Validating Aramex Credentials Format...', colors.blue);

  // SECURITY: Check for required environment variables
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
    log(`❌ Missing required environment variables:`, colors.red);
    missingVars.forEach(varName => {
      log(`   - ${varName}`, colors.red);
    });
    log(`\n💡 Please configure all required Aramex credentials in your environment.`, colors.yellow);
    return false;
  }

  const credentials = {
    username: process.env.ARAMEX_USERNAME,
    password: process.env.ARAMEX_PASSWORD,
    accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
    accountPin: process.env.ARAMEX_ACCOUNT_PIN,
    accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY,
    accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE
  };

  let allCredentialsValid = true;

  // Validate username format (should be email-like)
  if (credentials.username.includes('@') && credentials.username.includes('.')) {
    log(`✅ Username format: valid email format`, colors.green);
  } else {
    log(`⚠️  Username format: may not be valid email format`, colors.yellow);
  }

  // Validate account number (should be numeric)
  if (/^\d+$/.test(credentials.accountNumber)) {
    log(`✅ Account number: valid numeric format`, colors.green);
  } else {
    log(`❌ Account number: should be numeric`, colors.red);
    allCredentialsValid = false;
  }

  // Validate account PIN (should be numeric)
  if (/^\d+$/.test(credentials.accountPin)) {
    log(`✅ Account PIN: valid numeric format`, colors.green);
  } else {
    log(`❌ Account PIN: should be numeric`, colors.red);
    allCredentialsValid = false;
  }

  // Validate country code (should be 2 letters)
  if (/^[A-Z]{2}$/.test(credentials.accountCountryCode)) {
    log(`✅ Country code: valid 2-letter format (${credentials.accountCountryCode})`, colors.green);
  } else {
    log(`❌ Country code: should be 2 uppercase letters`, colors.red);
    allCredentialsValid = false;
  }

  // Validate entity (should be 3 letters)
  if (/^[A-Z]{3}$/.test(credentials.accountEntity)) {
    log(`✅ Account entity: valid 3-letter format (${credentials.accountEntity})`, colors.green);
  } else {
    log(`❌ Account entity: should be 3 uppercase letters`, colors.red);
    allCredentialsValid = false;
  }

  return allCredentialsValid;
}

function displayTestEnvironmentSummary() {
  log('\n📊 Test Environment Summary:', colors.blue);

  const env = process.env.NODE_ENV || 'development';
  const sandbox = process.env.ARAMEX_SANDBOX !== 'false';
  const timeout = parseInt(process.env.ARAMEX_TIMEOUT) || 30000;
  const debug = process.env.ARAMEX_DEBUG === 'true';

  log(`Environment: ${env}`, env === 'test' ? colors.green : colors.yellow);
  log(`Sandbox Mode: ${sandbox}`, sandbox ? colors.green : colors.red);
  log(`Timeout: ${timeout}ms`, colors.reset);
  log(`Debug Mode: ${debug}`, debug ? colors.yellow : colors.green);

  log('\nCredentials Source:', colors.blue);
  if (process.env.ARAMEX_USERNAME) {
    log('Using environment variables', colors.green);
  } else {
    log('Using fallback test credentials', colors.yellow);
  }
}

function main() {
  log('🧪 Aramex NestJS Integration - Test Environment Validator', colors.bold);
  log('================================================================', colors.blue);

  const validations = [
    validateEnvironmentVariables(),
    validateTestConfiguration(),
    validatePackageDependencies(),
    validateAramexCredentials()
  ];

  displayTestEnvironmentSummary();

  const allValid = validations.every(valid => valid === true);

  log('\n🎯 Validation Results:', colors.blue);

  if (allValid) {
    log('✅ All validations passed! Environment is ready for testing.', colors.green);
    log('\nYou can now run:', colors.blue);
    log('  npm run test:integration', colors.reset);
    log('  npm run test:all', colors.reset);
    log('  npm run test:comprehensive', colors.reset);
    process.exit(0);
  } else {
    log('❌ Some validations failed. Please fix the issues above.', colors.red);
    log('\nFor local development, fallback credentials will be used.', colors.yellow);
    log('For CI/CD, ensure all environment variables are properly configured.', colors.yellow);
    process.exit(1);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  validateTestConfiguration,
  validatePackageDependencies,
  validateAramexCredentials,
  displayTestEnvironmentSummary
};
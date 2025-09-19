#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are set up correctly
 * for running Aramex integration tests locally.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function logSuccess(...args) {
  log(colors.green, '✅', ...args);
}

function logError(...args) {
  log(colors.red, '❌', ...args);
}

function logWarning(...args) {
  log(colors.yellow, '⚠️ ', ...args);
}

function logInfo(...args) {
  log(colors.blue, 'ℹ️ ', ...args);
}

function logHeader(...args) {
  log(colors.cyan + colors.bold, ...args);
}

// Required environment variables for Aramex API
const REQUIRED_ENV_VARS = [
  'ARAMEX_ACCOUNT_COUNTRY_CODE',
  'ARAMEX_ACCOUNT_ENTITY',
  'ARAMEX_ACCOUNT_NUMBER',
  'ARAMEX_ACCOUNT_PIN',
  'ARAMEX_USERNAME',
  'ARAMEX_PASSWORD',
  'ARAMEX_VERSION'
];

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  'ARAMEX_SANDBOX': 'true',
  'ARAMEX_TIMEOUT': '30000',
  'ARAMEX_DEBUG': 'false',
  'NODE_ENV': 'test'
};

function checkEnvironmentVariables() {
  logHeader('📋 Checking Environment Variables');

  const missingRequired = [];
  const presentRequired = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (process.env[varName]) {
      presentRequired.push(varName);
      logSuccess(`${varName} is set`);
    } else {
      missingRequired.push(varName);
      logError(`${varName} is missing`);
    }
  });

  // Check optional variables
  Object.entries(OPTIONAL_ENV_VARS).forEach(([varName, defaultValue]) => {
    if (process.env[varName]) {
      logSuccess(`${varName} is set to: ${process.env[varName]}`);
    } else {
      logWarning(`${varName} not set, will use default: ${defaultValue}`);
    }
  });

  return { missingRequired, presentRequired };
}

function checkDotEnvFile() {
  logHeader('📄 Checking .env File');

  const envFilePath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envFilePath)) {
    logSuccess('.env file found');

    try {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      logInfo(`Found ${envLines.length} environment variable(s) in .env file:`);
      envLines.forEach(line => {
        const [key] = line.split('=');
        if (key) {
          if (REQUIRED_ENV_VARS.includes(key.trim())) {
            logSuccess(`  ${key.trim()}`);
          } else {
            logInfo(`  ${key.trim()}`);
          }
        }
      });

    } catch (error) {
      logError('Failed to read .env file:', error.message);
    }
  } else {
    logWarning('.env file not found');
    logInfo('Create a .env file with your Aramex credentials for local development');
  }
}

function generateEnvTemplate() {
  logHeader('📝 Environment Template');

  console.log('\nCopy this template to create your .env file:\n');

  console.log(colors.cyan + '# Aramex API Configuration');
  console.log('ARAMEX_ACCOUNT_COUNTRY_CODE=BH');
  console.log('ARAMEX_ACCOUNT_ENTITY=BAH');
  console.log('ARAMEX_ACCOUNT_NUMBER=your_account_number');
  console.log('ARAMEX_ACCOUNT_PIN=your_pin');
  console.log('ARAMEX_USERNAME=your_username');
  console.log('ARAMEX_PASSWORD=your_password');
  console.log('ARAMEX_VERSION=1.0');
  console.log('');
  console.log('# Optional Configuration');
  console.log('ARAMEX_SANDBOX=true');
  console.log('ARAMEX_TIMEOUT=30000');
  console.log('ARAMEX_DEBUG=false');
  console.log('NODE_ENV=test' + colors.reset);
  console.log('');
}

function checkPackageJson() {
  logHeader('📦 Checking package.json');

  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    logSuccess(`Package name: ${pkg.name}`);
    logSuccess(`Version: ${pkg.version}`);

    // Check required scripts
    const requiredScripts = ['test', 'test:integration', 'build'];
    requiredScripts.forEach(script => {
      if (pkg.scripts && pkg.scripts[script]) {
        logSuccess(`Script '${script}' is available`);
      } else {
        logError(`Script '${script}' is missing`);
      }
    });

  } catch (error) {
    logError('Failed to read package.json:', error.message);
  }
}

function checkDependencies() {
  logHeader('🔧 Checking Dependencies');

  try {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');

    if (fs.existsSync(nodeModulesPath)) {
      logSuccess('node_modules directory exists');

      // Check if package-lock.json exists
      const lockFilePath = path.join(process.cwd(), 'package-lock.json');
      if (fs.existsSync(lockFilePath)) {
        logSuccess('package-lock.json exists');
      } else {
        logWarning('package-lock.json not found - run npm install');
      }

    } else {
      logError('node_modules directory not found - run npm install');
    }

  } catch (error) {
    logError('Failed to check dependencies:', error.message);
  }
}

function runValidation() {
  logHeader('🔍 Aramex Environment Validation Tool');
  console.log('This tool validates your local development environment for Aramex integration.\n');

  const { missingRequired, presentRequired } = checkEnvironmentVariables();
  console.log('');

  checkDotEnvFile();
  console.log('');

  checkPackageJson();
  console.log('');

  checkDependencies();
  console.log('');

  // Final summary
  logHeader('📊 Validation Summary');

  if (missingRequired.length === 0) {
    logSuccess('All required environment variables are set!');
  } else {
    logError(`Missing ${missingRequired.length} required environment variable(s):`);
    missingRequired.forEach(varName => {
      console.log(`  - ${varName}`);
    });
  }

  if (presentRequired.length > 0) {
    logSuccess(`${presentRequired.length} environment variable(s) are properly configured`);
  }

  console.log('');

  if (missingRequired.length > 0) {
    generateEnvTemplate();

    logInfo('Next steps:');
    console.log('1. Create a .env file with the template above');
    console.log('2. Fill in your actual Aramex credentials');
    console.log('3. Run this validation script again');
    console.log('4. Run integration tests: npm run test:integration');

    process.exit(1);
  } else {
    logSuccess('Environment validation passed! You can now run integration tests.');

    logInfo('Available commands:');
    console.log('• npm run test:integration - Run integration tests');
    console.log('• npm run test:all - Run all tests');
    console.log('• npm test - Run unit tests only');

    process.exit(0);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Aramex Environment Validation Tool');
  console.log('');
  console.log('Usage: node scripts/validate-env.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --template     Show environment template only');
  console.log('');
  process.exit(0);
}

if (process.argv.includes('--template')) {
  generateEnvTemplate();
  process.exit(0);
}

// Run the validation
runValidation();
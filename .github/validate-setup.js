#!/usr/bin/env node

/**
 * Validation script for GitHub Actions setup
 * Run with: node .github/validate-setup.js
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  '.github/workflows/ci.yml',
  '.github/workflows/publish.yml',
  '.github/workflows/security.yml',
  '.github/workflows/maintenance.yml',
  '.github/workflows/validate-lockfile.yml',
  '.github/workflows/status-check.yml',
  '.github/dependabot.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/pull_request_template.md',
  'package-lock.json'
];

const GITIGNORE_SHOULD_NOT_CONTAIN = [
  'package-lock.json',
  '.github/'
];

const GITIGNORE_SHOULD_CONTAIN = [
  '.claude'
];

console.log('🔍 Validating GitHub Actions setup...\n');

let hasErrors = false;

// Check required files exist
console.log('📁 Checking required files...');
for (const file of REQUIRED_FILES) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// Check .gitignore content
console.log('\n📝 Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');

  for (const item of GITIGNORE_SHOULD_NOT_CONTAIN) {
    if (gitignoreContent.includes(item)) {
      console.log(`❌ .gitignore should NOT contain: ${item}`);
      hasErrors = true;
    } else {
      console.log(`✅ .gitignore correctly excludes: ${item}`);
    }
  }

  for (const item of GITIGNORE_SHOULD_CONTAIN) {
    if (gitignoreContent.includes(item)) {
      console.log(`✅ .gitignore correctly contains: ${item}`);
    } else {
      console.log(`❌ .gitignore should contain: ${item}`);
      hasErrors = true;
    }
  }
} else {
  console.log('❌ .gitignore file not found');
  hasErrors = true;
}

// Check package.json
console.log('\n📦 Checking package.json...');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const requiredFields = ['name', 'version', 'description', 'main', 'types'];
  for (const field of requiredFields) {
    if (pkg[field]) {
      console.log(`✅ package.json has ${field}: ${pkg[field]}`);
    } else {
      console.log(`❌ package.json missing ${field}`);
      hasErrors = true;
    }
  }

  if (pkg.name && pkg.name.startsWith('@')) {
    console.log('✅ Package is properly scoped');
  } else {
    console.log('❌ Package should be scoped (start with @)');
    hasErrors = true;
  }

  const requiredScripts = ['build', 'test', 'prepublishOnly'];
  for (const script of requiredScripts) {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`✅ package.json has ${script} script`);
    } else {
      console.log(`❌ package.json missing ${script} script`);
      hasErrors = true;
    }
  }
} else {
  console.log('❌ package.json not found');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Setup validation FAILED');
  console.log('Please fix the errors above before proceeding.');
  process.exit(1);
} else {
  console.log('✅ Setup validation PASSED');
  console.log('GitHub Actions workflows are ready to use!');
  console.log('\nNext steps:');
  console.log('1. Add NPM_TOKEN secret to repository settings');
  console.log('2. Set up branch protection rules');
  console.log('3. Commit and push the changes');
  console.log('4. Create a test PR to verify workflows');
}
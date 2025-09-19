#!/usr/bin/env node

/**
 * Security Audit Script
 * Scans the codebase for potential credential exposures and security issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Security patterns to check for
const SECURITY_PATTERNS = {
  // Aramex credentials that should NEVER appear in code
  'aramex_test_credentials': [
    'testingapi@aramex.com',
    'R123456789\\$r',
    '20000068',
    '20016',
    '543543',
    '331421'
  ],

  // Generic credential patterns
  'credential_patterns': [
    'password\\s*[=:]\\s*["\'][^"\']{5,}["\']',
    'username\\s*[=:]\\s*["\'][^"\'@]+@[^"\']+["\']',
    'api[_-]?key\\s*[=:]\\s*["\'][^"\']{10,}["\']',
    'secret\\s*[=:]\\s*["\'][^"\']{10,}["\']',
    'token\\s*[=:]\\s*["\'][^"\']{10,}["\']'
  ],

  // Environment variable fallbacks (security anti-pattern)
  'env_fallbacks': [
    'process\\.env\\.[A-Z_]+\\s*\\|\\|\\s*["\'][^"\']+["\']'
  ]
};

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'coverage/',
  '.nyc_output/',
  '*.log',
  'test-aramex.ts', // Private test file (gitignored)
  'security-audit.js' // Exclude this script itself
];

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.scannedFiles = 0;
    this.projectRoot = process.cwd();
  }

  logHeader(message) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}`);
    console.log(`${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  }

  logSuccess(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  }

  logWarning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  }

  logError(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
  }

  logInfo(message) {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  }

  shouldExcludeFile(filePath) {
    // Exclude based on patterns
    const isExcluded = EXCLUDE_PATTERNS.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });

    // Additional exclusions for false positives
    if (filePath.includes('node_modules')) return true;
    if (filePath.includes('mappingTable.json')) return true; // Unicode mapping table
    if (filePath.includes('test-aramex.ts')) return true; // Private test file

    return isExcluded;
  }

  scanFile(filePath) {
    if (this.shouldExcludeFile(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      this.scannedFiles++;

      // Check for each security pattern category
      Object.entries(SECURITY_PATTERNS).forEach(([category, patterns]) => {
        patterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'gi');
          let match;
          let lineNumber = 1;
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (regex.test(line)) {
              this.issues.push({
                file: relativePath,
                line: index + 1,
                category,
                pattern,
                content: line.trim(),
                severity: this.getSeverity(category)
              });
            }
          });
        });
      });

    } catch (error) {
      this.logWarning(`Could not read file: ${filePath}`);
    }
  }

  getSeverity(category) {
    switch (category) {
      case 'aramex_test_credentials':
        return 'CRITICAL';
      case 'credential_patterns':
        return 'HIGH';
      case 'env_fallbacks':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);

      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          this.scanDirectory(fullPath);
        } else {
          // Only scan text files
          const ext = path.extname(item).toLowerCase();
          const textExtensions = ['.js', '.ts', '.json', '.md', '.yml', '.yaml', '.env', '.txt'];

          if (textExtensions.includes(ext) || !ext) {
            this.scanFile(fullPath);
          }
        }
      });
    } catch (error) {
      this.logWarning(`Could not scan directory: ${dirPath}`);
    }
  }

  checkGitSecrets() {
    try {
      this.logInfo('Checking git history for secrets...');

      // Check if git-secrets is installed
      try {
        execSync('git secrets --version', { stdio: 'ignore' });

        // Run git-secrets scan
        execSync('git secrets --scan', { stdio: 'pipe' });
        this.logSuccess('Git secrets scan passed');
      } catch (error) {
        this.logWarning('git-secrets not installed or found issues');
        this.logInfo('Install git-secrets: https://github.com/awslabs/git-secrets');
      }
    } catch (error) {
      this.logInfo('Git secrets check skipped');
    }
  }

  checkEnvironmentFiles() {
    this.logInfo('Checking for environment files...');

    const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
    let foundEnvFiles = 0;

    envFiles.forEach(envFile => {
      const envPath = path.join(this.projectRoot, envFile);
      if (fs.existsSync(envPath)) {
        foundEnvFiles++;
        this.logWarning(`Found environment file: ${envFile}`);
        this.logInfo('Ensure this file is in .gitignore and contains no real credentials');
      }
    });

    if (foundEnvFiles === 0) {
      this.logSuccess('No environment files found in root directory');
    }

    // Check .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignoreContent.includes('.env')) {
        this.logSuccess('.env files are properly ignored in .gitignore');
      } else {
        this.logError('.env files are NOT ignored in .gitignore');
        this.issues.push({
          file: '.gitignore',
          line: 0,
          category: 'gitignore',
          pattern: 'missing .env ignore',
          content: 'Environment files not ignored',
          severity: 'HIGH'
        });
      }
    }
  }

  generateReport() {
    this.logHeader('🔒 SECURITY AUDIT REPORT');

    console.log(`Files scanned: ${this.scannedFiles}`);
    console.log(`Security issues found: ${this.issues.length}\n`);

    if (this.issues.length === 0) {
      this.logSuccess('No security issues found! 🎉');
      return true;
    }

    // Group issues by severity
    const groupedIssues = {};
    this.issues.forEach(issue => {
      if (!groupedIssues[issue.severity]) {
        groupedIssues[issue.severity] = [];
      }
      groupedIssues[issue.severity].push(issue);
    });

    // Report issues by severity
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      if (groupedIssues[severity]) {
        console.log(`\n${colors.red}${severity} SEVERITY ISSUES (${groupedIssues[severity].length}):${colors.reset}`);

        groupedIssues[severity].forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.file}:${issue.line}`);
          console.log(`   Category: ${issue.category}`);
          console.log(`   Pattern: ${issue.pattern}`);
          console.log(`   Content: ${colors.yellow}${issue.content}${colors.reset}`);
        });
      }
    });

    return false;
  }

  run() {
    this.logHeader('🛡️  Security Audit - Aramex NestJS Package');

    this.logInfo('Scanning for credential exposures and security issues...');
    this.scanDirectory(this.projectRoot);

    this.checkGitSecrets();
    this.checkEnvironmentFiles();

    const isSecure = this.generateReport();

    console.log('\n' + '='.repeat(60));

    if (isSecure) {
      this.logSuccess('SECURITY AUDIT PASSED ✅');
      console.log(`${colors.green}Your codebase appears to be secure!${colors.reset}`);
      process.exit(0);
    } else {
      this.logError('SECURITY AUDIT FAILED ❌');
      console.log(`${colors.red}Critical security issues found that must be fixed!${colors.reset}`);
      console.log('\nRecommendations:');
      console.log('1. Remove all hardcoded credentials');
      console.log('2. Use environment variables for all sensitive data');
      console.log('3. Add credentials to .gitignore');
      console.log('4. Use GitHub secrets for CI/CD');
      console.log('5. Never commit real API credentials');
      process.exit(1);
    }
  }
}

// Run the security audit
const auditor = new SecurityAuditor();
auditor.run();
#!/usr/bin/env node

/**
 * Dependabot Automation Setup Verification Script
 *
 * This script verifies that all dependabot automation components are properly configured.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? COLORS.GREEN : COLORS.RED);
  return exists;
}

function checkFileContent(filePath, pattern, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = pattern.test ? pattern.test(content) : content.includes(pattern);
    log(`${matches ? '✅' : '❌'} ${description}`, matches ? COLORS.GREEN : COLORS.RED);
    return matches;
  } catch (error) {
    log(`❌ ${description} - File not readable: ${error.message}`, COLORS.RED);
    return false;
  }
}

function main() {
  log(`${COLORS.BOLD}${COLORS.BLUE}🤖 Dependabot Automation Setup Verification${COLORS.RESET}\n`);

  const rootDir = process.cwd();
  const githubDir = path.join(rootDir, '.github');
  const workflowsDir = path.join(githubDir, 'workflows');

  let checks = 0;
  let passed = 0;

  // Check required files
  const requiredFiles = [
    [path.join(githubDir, 'dependabot.yml'), 'Dependabot configuration'],
    [path.join(workflowsDir, 'dependabot-auto-merge.yml'), 'Auto-merge workflow'],
    [path.join(workflowsDir, 'dependabot-cleanup.yml'), 'Branch cleanup workflow'],
    [path.join(workflowsDir, 'dependabot-security.yml'), 'Security validation workflow'],
    [path.join(workflowsDir, 'dependabot-monitor.yml'), 'Monitoring workflow'],
    [path.join(workflowsDir, 'ci.yml'), 'CI workflow'],
    [path.join(workflowsDir, 'security.yml'), 'Security workflow'],
    [path.join(githubDir, 'DEPENDABOT_AUTOMATION.md'), 'Documentation']
  ];

  log(`${COLORS.BOLD}📁 Required Files:${COLORS.RESET}`);
  for (const [filePath, description] of requiredFiles) {
    checks++;
    if (checkFileExists(filePath, description)) {
      passed++;
    }
  }

  // Check dependabot configuration
  log(`\n${COLORS.BOLD}⚙️ Configuration Checks:${COLORS.RESET}`);

  const dependabotPath = path.join(githubDir, 'dependabot.yml');
  if (fs.existsSync(dependabotPath)) {
    checks += 4;
    if (checkFileContent(dependabotPath, 'package-ecosystem: "npm"', 'NPM ecosystem configured')) passed++;
    if (checkFileContent(dependabotPath, 'package-ecosystem: "github-actions"', 'GitHub Actions ecosystem configured')) passed++;
    if (checkFileContent(dependabotPath, /open-pull-requests-limit:\s*\d+/, 'PR limit configured')) passed++;
    if (checkFileContent(dependabotPath, 'groups:', 'Dependency groups configured')) passed++;
  }

  // Check auto-merge workflow
  const autoMergePath = path.join(workflowsDir, 'dependabot-auto-merge.yml');
  if (fs.existsSync(autoMergePath)) {
    checks += 3;
    if (checkFileContent(autoMergePath, 'github.actor == \'dependabot[bot]\'', 'Dependabot actor check')) passed++;
    if (checkFileContent(autoMergePath, 'version-update:semver-patch', 'Patch update auto-merge')) passed++;
    if (checkFileContent(autoMergePath, 'security-check', 'Security validation integration')) passed++;
  }

  // Check security workflow
  const securityPath = path.join(workflowsDir, 'dependabot-security.yml');
  if (fs.existsSync(securityPath)) {
    checks += 3;
    if (checkFileContent(securityPath, 'npm audit', 'NPM audit integration')) passed++;
    if (checkFileContent(securityPath, 'license-checker', 'License compliance check')) passed++;
    if (checkFileContent(securityPath, 'high_critical_vulnerabilities', 'Vulnerability threshold check')) passed++;
  }

  // Check package.json for required scripts
  const packagePath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    log(`\n${COLORS.BOLD}📦 Package Configuration:${COLORS.RESET}`);
    checks += 4;
    if (checkFileContent(packagePath, '"build":', 'Build script available')) passed++;
    if (checkFileContent(packagePath, '"test":', 'Test script available')) passed++;
    if (checkFileContent(packagePath, '"test:coverage":', 'Coverage script available')) passed++;
    if (checkFileContent(packagePath, '"@kareem-3del/nestjs-aramex"', 'Scoped package name')) passed++;
  }

  // Check CI integration
  const ciPath = path.join(workflowsDir, 'ci.yml');
  if (fs.existsSync(ciPath)) {
    log(`\n${COLORS.BOLD}🔄 CI Integration:${COLORS.RESET}`);
    checks += 2;
    if (checkFileContent(ciPath, 'pull_request:', 'PR trigger configured')) passed++;
    if (checkFileContent(ciPath, 'node-version:', 'Node.js matrix configured')) passed++;
  }

  // Summary
  log(`\n${COLORS.BOLD}📊 Summary:${COLORS.RESET}`);
  const percentage = Math.round((passed / checks) * 100);
  const status = percentage >= 90 ? 'EXCELLENT' : percentage >= 75 ? 'GOOD' : percentage >= 50 ? 'NEEDS WORK' : 'CRITICAL';
  const statusColor = percentage >= 90 ? COLORS.GREEN : percentage >= 75 ? COLORS.YELLOW : COLORS.RED;

  log(`${statusColor}${COLORS.BOLD}Status: ${status} (${passed}/${checks} checks passed - ${percentage}%)${COLORS.RESET}`);

  if (percentage >= 90) {
    log(`\n${COLORS.GREEN}🎉 Dependabot automation is properly configured!${COLORS.RESET}`);
    log(`${COLORS.GREEN}✅ Ready for automatic dependency management${COLORS.RESET}`);
  } else if (percentage >= 75) {
    log(`\n${COLORS.YELLOW}⚠️ Setup is mostly complete but needs minor fixes${COLORS.RESET}`);
  } else {
    log(`\n${COLORS.RED}❌ Setup requires attention before dependabot automation will work properly${COLORS.RESET}`);
  }

  // Next steps
  log(`\n${COLORS.BOLD}📋 Next Steps:${COLORS.RESET}`);
  log('1. Commit and push all workflow files to GitHub');
  log('2. Enable dependabot in repository settings (if not already enabled)');
  log('3. Monitor the first dependabot PRs to verify automation works');
  log('4. Check daily monitoring reports in GitHub Issues');
  log('5. Review the documentation: .github/DEPENDABOT_AUTOMATION.md');

  // Auto-merge criteria reminder
  log(`\n${COLORS.BOLD}🔄 Auto-merge Criteria:${COLORS.RESET}`);
  log(`${COLORS.GREEN}✅ Patch updates (x.x.X) - All dependencies${COLORS.RESET}`);
  log(`${COLORS.GREEN}✅ Minor devDependency updates (x.X.x)${COLORS.RESET}`);
  log(`${COLORS.GREEN}✅ GitHub Actions updates${COLORS.RESET}`);
  log(`${COLORS.RED}❌ Major updates (X.x.x) - Manual review required${COLORS.RESET}`);
  log(`${COLORS.RED}❌ Minor production dependency updates - Manual review required${COLORS.RESET}`);

  process.exit(percentage >= 50 ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };
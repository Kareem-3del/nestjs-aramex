# GitHub Actions Setup Guide

This guide will help you complete the setup for your GitHub Actions workflows.

## ✅ Completed Setup

The following has been automatically configured:

- [x] GitHub Actions workflows created
- [x] Dependabot configuration added
- [x] Issue and PR templates created
- [x] package-lock.json committed and tracked
- [x] .gitignore updated to allow workflows
- [x] Validation script created

## 🔧 Required Manual Setup

### 1. NPM Token Configuration

To enable automatic publishing, you need to add your NPM token as a repository secret:

1. **Generate NPM Token:**
   ```bash
   npm login
   npm token create --access public --readonly false
   ```

2. **Add to GitHub Secrets:**
   - Go to your repository settings
   - Navigate to "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your NPM token from step 1

### 2. Branch Protection Rules

Set up branch protection for the `main` branch:

1. Go to repository Settings > Branches
2. Click "Add rule" for `main` branch
3. Configure these settings:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Required status checks:
     - `ci (18.x)`
     - `ci (20.x)`
     - `validate-lockfile`
     - `status-check`
   - ✅ Require pull request reviews before merging
   - ✅ Dismiss stale reviews when new commits are pushed
   - ✅ Require review from code owners (optional)
   - ✅ Include administrators

### 3. Repository Settings

Ensure these repository settings are enabled:

- **General > Features:**
  - ✅ Issues
  - ✅ Projects (optional)
  - ✅ Preserve this repository (recommended)

- **Security > Code security and analysis:**
  - ✅ Dependabot alerts
  - ✅ Dependabot security updates
  - ✅ Dependabot version updates (already configured)

### 4. Codecov Integration (Optional)

For coverage reporting:

1. Visit [codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Copy the upload token (if needed)
4. Add as `CODECOV_TOKEN` secret (usually not required for public repos)

## 🚀 Testing the Setup

### 1. Push the Changes

```bash
git push origin main
```

### 2. Verify Workflows

- Check the "Actions" tab in your repository
- Ensure all workflows run successfully
- Look for any configuration issues

### 3. Create a Test PR

1. Create a new branch:
   ```bash
   git checkout -b test/ci-setup
   echo "# Test CI" >> test-ci.md
   git add test-ci.md
   git commit -m "test: verify CI workflows"
   git push origin test/ci-setup
   ```

2. Create a PR from this branch
3. Verify all status checks pass
4. Test the PR review process

### 4. Test Publishing (Optional)

To test automatic publishing:

1. Update version in `package.json`:
   ```bash
   npm version patch
   git push origin main
   ```

2. Check that the publish workflow triggers
3. Verify package is published to NPM
4. Check that a GitHub release is created

## 🔍 Troubleshooting

### Common Issues

**"Dependencies lock file is not found"**
- ✅ Fixed: package-lock.json is now committed

**NPM publish fails with "unauthorized"**
- Check NPM_TOKEN secret is correctly set
- Verify token has publish permissions
- Ensure package name is available on NPM

**Status checks don't appear in PR**
- Verify workflows have run at least once on main branch
- Check workflow syntax is valid
- Ensure branch protection rules reference correct check names

**Dependabot PRs not created**
- Check dependabot.yml syntax
- Verify repository settings allow Dependabot
- Wait up to 24 hours for first scan

### Validation

Run the validation script anytime:

```bash
node .github/validate-setup.js
```

## 📊 Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| CI | Push/PR to main | Test, build, type check |
| Publish | Version change in package.json | NPM publish + GitHub release |
| Security | Push/PR/Schedule | Vulnerability scanning |
| Maintenance | Daily schedule | Stale issue/PR cleanup |
| Validate Lock File | Push/PR to main | Ensure reproducible builds |
| Status Check | Push/PR to main | Quick project validation |

## 🎯 Next Steps

1. Complete the manual setup above
2. Push changes and test workflows
3. Configure any additional integrations
4. Update documentation as needed
5. Start developing with confidence!

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
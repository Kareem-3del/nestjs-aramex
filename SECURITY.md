# Security Guidelines - Aramex NestJS Integration

## 🛡️ Security Policy

This document outlines the security practices and requirements for the Aramex NestJS integration library.

## ⚠️ CRITICAL SECURITY RULES

### 1. **NO HARDCODED CREDENTIALS**
- **NEVER** commit real credentials to version control
- **NEVER** use hardcoded fallback values for credentials
- **NEVER** log or expose credentials in error messages
- **ALWAYS** use environment variables for sensitive data

### 2. **Environment Variables Only**
All Aramex credentials **MUST** come from environment variables:

```env
ARAMEX_USERNAME=your-username@company.com
ARAMEX_PASSWORD=your-secure-password
ARAMEX_ACCOUNT_NUMBER=your-account-number
ARAMEX_ACCOUNT_PIN=your-account-pin
ARAMEX_ACCOUNT_ENTITY=your-entity
ARAMEX_ACCOUNT_COUNTRY_CODE=your-country-code
```

### 3. **Test Environment Security**
- Integration tests **SKIP** automatically if credentials are not available
- **NO** fallback or default credentials in test files
- CI/CD uses GitHub Secrets for credentials
- Local development requires manual environment setup

## 🔧 Secure Configuration Patterns

### ✅ CORRECT - Environment Variables Only
```typescript
AramexModule.forRootAsync({
  useFactory: (configService: ConfigService) => {
    // Validate required credentials exist
    const requiredVars = [
      'ARAMEX_USERNAME', 'ARAMEX_PASSWORD',
      'ARAMEX_ACCOUNT_NUMBER', 'ARAMEX_ACCOUNT_PIN'
    ];

    const missingVars = requiredVars.filter(v => !configService.get(v));
    if (missingVars.length > 0) {
      throw new Error(`Missing required Aramex credentials: ${missingVars.join(', ')}`);
    }

    return {
      username: configService.get('ARAMEX_USERNAME')!,
      password: configService.get('ARAMEX_PASSWORD')!,
      accountNumber: configService.get('ARAMEX_ACCOUNT_NUMBER')!,
      accountPin: configService.get('ARAMEX_ACCOUNT_PIN')!,
      // ... other config
    };
  },
  inject: [ConfigService],
})
```

### ❌ INCORRECT - Hardcoded Fallbacks
```typescript
// DON'T DO THIS!
AramexModule.forRoot({
  username: process.env.ARAMEX_USERNAME || 'fallback-user', // ❌ Security risk
  password: process.env.ARAMEX_PASSWORD || 'fallback-pass', // ❌ Security risk
  // ...
})
```

## 🧪 Secure Testing Patterns

### Integration Test Security
```typescript
import { skipIfNoCredentials } from './setup';

describe('Integration Tests', () => {
  beforeAll(async () => {
    if (skipIfNoCredentials()) {
      return; // Tests will be skipped
    }
    // ... setup only if credentials available
  });

  it('should test feature', async () => {
    if (skipIfNoCredentials()) return; // Skip test
    // ... test logic
  });
});
```

## 🚀 CI/CD Security

### GitHub Secrets Configuration
Required secrets in GitHub repository settings:
- `ARAMEX_USERNAME`
- `ARAMEX_PASSWORD`
- `ARAMEX_ACCOUNT_NUMBER`
- `ARAMEX_ACCOUNT_PIN`
- `ARAMEX_ACCOUNT_ENTITY`
- `ARAMEX_ACCOUNT_COUNTRY_CODE`
- `ARAMEX_VERSION`

### Workflow Security Validation
```yaml
- name: Security - Validate Aramex configuration
  run: |
    echo "🔒 Validating Aramex API credentials..."

    MISSING_SECRETS=""
    if [ -z "${{ secrets.ARAMEX_USERNAME }}" ]; then
      MISSING_SECRETS="$MISSING_SECRETS ARAMEX_USERNAME"
    fi
    # ... check other secrets

    if [ ! -z "$MISSING_SECRETS" ]; then
      echo "❌ Missing required secrets:$MISSING_SECRETS"
      exit 1
    fi

    echo "✅ All required Aramex secrets are configured securely"
```

## 🔍 Security Audit

### Automated Security Scanning
Run the security audit script to check for credential exposures:

```bash
npm run security:audit
# or
node scripts/security-audit.js
```

This script checks for:
- Hardcoded Aramex test credentials
- Generic credential patterns
- Environment variable fallbacks
- Exposed secrets in code

### Manual Security Checklist
- [ ] No hardcoded credentials in source code
- [ ] All credentials come from environment variables
- [ ] Integration tests skip when credentials unavailable
- [ ] GitHub secrets configured for CI/CD
- [ ] `.env` files are gitignored
- [ ] No credentials in error messages or logs

## 🚨 Security Incident Response

### If Credentials Are Exposed
1. **Immediately** rotate/change the exposed credentials
2. Remove credentials from git history if committed
3. Update environment variables and GitHub secrets
4. Review access logs for unauthorized usage
5. Update documentation and notify team

### Credential Rotation
- Change credentials at Aramex portal
- Update environment variables
- Update GitHub repository secrets
- Test integration after rotation

## 📋 Development Guidelines

### Local Development
1. Create `.env` file (never commit!)
2. Configure all required environment variables
3. Use your own Aramex sandbox credentials
4. Never share credentials in team communications

### Production Deployment
1. Configure credentials in secure environment
2. Use secret management systems (AWS Secrets Manager, Azure Key Vault, etc.)
3. Rotate credentials regularly
4. Monitor for unauthorized access

### Code Review Requirements
- [ ] No hardcoded credentials
- [ ] Proper environment variable usage
- [ ] Security patterns followed
- [ ] Tests skip appropriately when credentials unavailable

## 🔗 Additional Resources

- [Aramex Developer Portal](https://www.aramex.com/developers)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_credentials)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 📧 Security Contact

For security issues or questions, please contact the maintainers through:
- GitHub Issues (for non-sensitive security questions)
- Private communication for sensitive security matters

---

**Remember: Security is everyone's responsibility. When in doubt, ask for a security review.**
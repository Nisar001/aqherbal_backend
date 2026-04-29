# Secrets Management Guide

## Overview

This document outlines how to properly manage sensitive information (secrets) in the AQ Herbal Backend application.

**⚠️ CRITICAL SECURITY REQUIREMENTS:**
- ✅ All production secrets must be strong, random, and unique
- ❌ Never commit `.env` file to version control
- ❌ Never hardcode secrets in source code
- ❌ Never share secrets in chat, email, or public repositories
- ✅ Always use environment variables for all sensitive values
- ✅ Rotate secrets regularly in production

## Secrets Inventory

### 1. **JWT Secrets** (CRITICAL)
**Purpose:** Authenticate and verify JWT tokens

| Secret | Min Length | Generated | Format |
|--------|-----------|-----------|--------|
| `JWT_SECRET` | 32 chars | Yes | Base64 random string |
| `JWT_REFRESH_SECRET` | 32 chars | Yes | Base64 random string |

**How to Generate:**
```bash
# Generate a strong random secret
openssl rand -base64 32

# Save it safely to your .env
JWT_SECRET=KJL8mP2nQ5rT8vW1yZ3aC6dF9gJ2kM5pS8tV1xY4bE7hK0nQ3rU6wZ9cF2eH5jM8p
JWT_REFRESH_SECRET=nQ5rT8vW1yZ3aC6dF9gJ2kM5pS8tV1xY4bE7hK0nQ3rU6wZ9cF2eH5jM8pKJL8mP2
```

**Rotation:** Every 90 days in production

---

### 2. **Email Credentials** (IMPORTANT for Production)
**Purpose:** Send transactional emails (registrations, password resets, etc.)

| Secret | Source | Format | Notes |
|--------|--------|--------|-------|
| `EMAIL_HOST` | Gmail, SendGrid, etc. | Hostname | SMTP server |
| `EMAIL_USER` | Email provider | Email address | Your email |
| `EMAIL_PASSWORD` | Email provider | App password | NOT your account password! |

**Gmail Setup:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an "App Password": https://myaccount.google.com/apppasswords
3. Use this 16-character password as `EMAIL_PASSWORD`

**Example:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
```

**Rotation:** Never commit to repo, update on password change

---

### 3. **Razorpay Payment Keys** (CRITICAL)
**Purpose:** Process payments and webhooks

| Secret | Environment | Source | Format |
|--------|-------------|--------|--------|
| `RAZORPAY_KEY_ID` | Dev/Test | Dashboard | `rzp_test_*` (test) or `rzp_live_*` (prod) |
| `RAZORPAY_KEY_SECRET` | Dev/Test | Dashboard | 40+ character string |
| `RAZORPAY_WEBHOOK_SECRET` | Dev/Test | Dashboard | Webhook signature secret |

**Get Your Keys:**
1. Sign up at https://razorpay.com
2. Go to Dashboard → Settings → API Keys
3. Copy Test Key ID and Test Secret (for development)
4. Copy Live Key ID and Live Secret (for production) - **KEEP PRIVATE!**

**Development Example:**
```env
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=your_test_secret_here
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
```

**Production Example:**
```env
RAZORPAY_KEY_ID=rzp_live_1a2b3c4d5e6f7g8h9i0j
RAZORPAY_KEY_SECRET=your_live_secret_here_keep_extremely_safe
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret_keep_safe
```

**IMPORTANT:** 
- Never use live keys in development
- Never commit live keys to version control
- Live keys have actual financial implications
- Rotate keys annually or if compromised

**Rotation:** Annually (for both test and live keys)

---

### 4. **Cloudinary Image Upload Keys** (IMPORTANT)
**Purpose:** Upload and manage product images

| Secret | Source | Format |
|--------|--------|--------|
| `CLOUDINARY_CLOUD_NAME` | Dashboard | Your cloud identifier |
| `CLOUDINARY_API_KEY` | Dashboard | Numeric ID |
| `CLOUDINARY_API_SECRET` | Dashboard | 40+ character string |

**Get Your Keys:**
1. Sign up at https://cloudinary.com
2. Go to Dashboard → Settings → API Keys
3. Copy your Cloud Name, API Key, and API Secret

**Example:**
```env
CLOUDINARY_CLOUD_NAME=my_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Rotation:** Every 90 days or if exposed

---

### 5. **Stripe Payment Keys** (Optional)
**Purpose:** Alternative payment gateway (if enabled)

| Secret | Format | Notes |
|--------|--------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_*` or `sk_live_*` | Use test keys for dev |
| `STRIPE_WEBHOOK_SECRET` | `whsec_*` | For webhook validation |

**Get Keys:** https://dashboard.stripe.com/apikeys

**Rotation:** Annually or if exposed

---

### 6. **Database Credentials** (CRITICAL)
**Purpose:** Connect to MongoDB

| Secret | Format | Example |
|--------|--------|---------|
| `MONGODB_URI` | Connection string | `mongodb://user:pass@host:port/db` |
| `DB_URL` | Connection string | `mongodb://localhost:27017/aqherbal` |

**Security:**
- Use strong passwords for database users
- Never use `root` or `admin` credentials
- Use separate credentials for development and production
- Enable IP whitelisting in MongoDB Atlas

---

## Environment Setup

### Development Environment

1. **Copy example file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate JWT secrets:**
   ```bash
   # Terminal 1
   openssl rand -base64 32
   # Copy output to JWT_SECRET

   # Terminal 2
   openssl rand -base64 32
   # Copy output to JWT_REFRESH_SECRET
   ```

3. **Fill in email credentials:**
   - Gmail: Get App Password from https://myaccount.google.com/apppasswords
   - Or use SendGrid, Mailgun, etc.

4. **Add test payment keys:**
   - Razorpay test keys (from Settings → API Keys)
   - Stripe test keys (optional, from https://dashboard.stripe.com/apikeys)

5. **Add Cloudinary keys:**
   - From https://cloudinary.com/console

6. **Never commit .env:**
   ```bash
   # Verify .env is in .gitignore
   cat .gitignore | grep "\.env"
   ```

### Production Environment

**Use a secure secrets manager:**

1. **AWS Secrets Manager:**
   ```bash
   aws secretsmanager create-secret --name aqherbal/prod/jwt-secret \
     --secret-string "$(openssl rand -base64 32)"
   ```

2. **HashiCorp Vault:**
   ```bash
   vault kv put secret/aqherbal/prod \
     jwt_secret="$(openssl rand -base64 32)" \
     razorpay_key="rzp_live_xxx" \
     # ... other secrets
   ```

3. **GitHub Actions Secrets:**
   - Go to repo → Settings → Secrets
   - Add secrets for CI/CD deployment

4. **Environment Variables in Deployment Platform:**
   - Heroku: Settings → Config Vars
   - AWS Lambda: Environment Variables
   - Docker: Use `.env` files mounted at runtime (never in image)

---

## Secret Rotation Plan

### Monthly
- [ ] Review secret access logs
- [ ] Check for any exposed credentials

### Quarterly (90 days)
- [ ] Rotate JWT secrets
- [ ] Rotate Cloudinary API keys
- [ ] Update and test backup keys

### Annually (365 days)
- [ ] Rotate Razorpay keys
- [ ] Rotate Stripe keys
- [ ] Rotate database credentials
- [ ] All email credentials

### Immediately
- [ ] If secret appears in logs
- [ ] If secret is committed to repo
- [ ] If team member leaves
- [ ] If security vulnerability disclosed

---

## Accessing Secrets Securely

### DO ✅
- Use environment variables only
- Load from `.env` using `dotenv` package
- Access via `process.env.SECRET_NAME`
- Validate required secrets at startup
- Use strong, random values
- Rotate secrets regularly
- Keep backups in a vault
- Log access to secrets (for audit)

### DON'T ❌
- Hardcode secrets in source code
- Commit `.env` file to git
- Share secrets in chat/email
- Use weak or predictable values
- Reuse secrets across environments
- Store secrets in comments
- Commit secrets in git history

### Code Example - Safe:
```javascript
// ✅ CORRECT
import config from './config/env.js';

const secret = config.jwtSecret;
if (!secret) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### Code Example - Unsafe:
```javascript
// ❌ WRONG - Do NOT do this
const secret = 'my-hardcoded-secret-12345';

// ❌ WRONG - Do NOT do this
const secret = process.env.JWT_SECRET || 'default-secret';

// ❌ WRONG - Do NOT do this
const secret = 'process.env.JWT_SECRET'; // This is just a string!
```

---

## Monitoring & Auditing

### Monitor for Secret Exposure

1. **GitHub Secret Scanning:**
   ```bash
   # Enable in repo settings
   Settings → Security → Secret scanning
   ```

2. **External Scanning:**
   - Use TruffleHog: `trufflehog filesystem .`
   - Use git-secrets: `git secrets --scan`

3. **Check git history:**
   ```bash
   # Search for exposed secrets
   git log -p | grep -i "password\|secret\|key" | head -20
   ```

### Audit Logs

- Track who accessed secrets and when
- Monitor all production secret rotations
- Keep records for compliance (PCI-DSS, SOC 2)

---

## Emergency Response

### If a Secret is Exposed:

1. **Immediately rotate the secret** in all environments
2. **Remove from git history:**
   ```bash
   # Using git-filter-repo
   git filter-repo --replace-text replacements.txt
   git push --force-with-lease
   ```
3. **Scan git history** for other exposed secrets
4. **Notify relevant teams** (Payment provider, hosting, etc.)
5. **Update monitoring** to prevent future exposures
6. **Document incident** for compliance records

---

## Compliance

### PCI-DSS Requirements
- ✅ Never store full credit card numbers
- ✅ Encrypt transmission of cardholder data
- ✅ Use strong authentication (API keys)
- ✅ Maintain access logs for secrets
- ✅ Rotate secrets annually

### SOC 2 Requirements
- ✅ Restrict secret access to authorized personnel
- ✅ Encrypt secrets in transit and at rest
- ✅ Monitor and log all secret access
- ✅ Maintain audit trail for compliance

---

## Quick Reference

| Secret | Environment Variable | Min Length | Auto-Generated? |
|--------|----------------------|-----------|-----------------|
| JWT Secret | `JWT_SECRET` | 32 chars | ✅ (manual command) |
| JWT Refresh | `JWT_REFRESH_SECRET` | 32 chars | ✅ (manual command) |
| Email Password | `EMAIL_PASSWORD` | 16+ chars | ❌ (from provider) |
| Razorpay Key ID | `RAZORPAY_KEY_ID` | 20+ chars | ❌ (from dashboard) |
| Razorpay Secret | `RAZORPAY_KEY_SECRET` | 40+ chars | ❌ (from dashboard) |
| Cloudinary API Key | `CLOUDINARY_API_KEY` | 15+ chars | ❌ (from dashboard) |
| Cloudinary Secret | `CLOUDINARY_API_SECRET` | 40+ chars | ❌ (from dashboard) |
| MongoDB Password | (in `DB_URL`) | 16+ chars | ✅ (manual command) |

---

## References

- [OWASP Secrets Management](https://owasp.org/www-community/Sensitive_Data_Exposure)
- [12 Factor App - Config](https://12factor.net/config)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PCI-DSS Compliance](https://www.pcisecuritystandards.org/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)

---

**Last Updated:** April 29, 2026  
**Version:** 1.0  
**Maintained By:** Security Team  

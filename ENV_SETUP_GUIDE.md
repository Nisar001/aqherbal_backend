# Environment Setup Guide

Complete guide for configuring environment variables across all AQ Herbal applications.

## 📋 Quick Start

### Backend Setup
```bash
cd aqherbal_backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### Frontend Setup
```bash
cd aqherbal_frontend
cp .env.example .env.local
# Edit .env.local with your values
npm install
npm start
```

### Admin Setup
```bash
cd aqherbal_admin
cp .env.example .env.local
# Edit .env.local with your values
npm install
npm start
```

## 🔑 Required Configuration

### 1. Database (Backend Only)
**Required for:** Backend API

```env
MONGODB_URI=mongodb://localhost:27017/aqherbal
```

**Setup:**
- Install MongoDB locally or use MongoDB Atlas
- Create database named `aqherbal`
- Get connection string from MongoDB Atlas (cloud) or use local URL

### 2. JWT Secrets (Backend Only)
**Required for:** Authentication

```env
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_REFRESH_SECRET=another-secure-random-string-min-32-chars
```

**Generate secure secrets:**
```bash
# On Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# On Linux/Mac
openssl rand -base64 32
```

### 3. Cloudinary (All Apps)
**Required for:** Image uploads and display

**Backend:**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Frontend & Admin:**
```env
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

**Setup:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard → Account Details
3. Add to all three .env files

### 4. Email Service (Backend Only)
**Required for:** User verification, password reset, order notifications

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=AQ Herbal <noreply@aqherbal.com>
```

**Gmail Setup:**
1. Enable 2-Factor Authentication in Google Account
2. Generate App Password: Account → Security → 2-Step Verification → App Passwords
3. Use generated password (not your regular password)

**Other providers:**
- **SendGrid:** `smtp.sendgrid.net:587`
- **Mailgun:** `smtp.mailgun.org:587`
- **AWS SES:** `email-smtp.region.amazonaws.com:587`

### 5. Razorpay (All Apps)
**Required for:** Payment processing

**Backend:**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

**Frontend:**
```env
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
```

**Setup:**
1. Sign up at [razorpay.com](https://razorpay.com)
2. Get Test/Live keys from Dashboard → Settings → API Keys
3. Create webhook at Dashboard → Webhooks
4. Use webhook secret in backend .env

### 6. Frontend URL (Backend Only)
**Required for:** Email links (password reset, order confirmation)

```env
FRONTEND_URL=http://localhost:3000
```

**Production:**
```env
FRONTEND_URL=https://aqherbal.com
```

## ⚙️ Optional Configuration

### Redis Cache (Backend)
Improves performance for notifications and caching.

```env
REDIS_DISABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Setup:**
- Install Redis locally or use Redis Cloud
- Set `REDIS_DISABLED=true` to skip Redis

### Rate Limiting (Backend)
Protects against abuse and DDoS attacks.

```env
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=200
RATE_LIMIT_LOGIN_MAX=10
```

Default values are production-ready. Adjust if needed.

### Business Configuration (Backend)
Customize business rules without code changes.

```env
# Tax
TAX_RATE=0.1
GST_RATE=0.18

# Shipping
FREE_SHIPPING_THRESHOLD=500
SHIPPING_COST=0
EXPRESS_SHIPPING_COST=100

# Inventory
LOW_STOCK_THRESHOLD=10
REORDER_QUANTITY=50

# Orders
ORDER_CANCELLATION_WINDOW=24
ORDER_RETURN_WINDOW=7
AUTO_CANCEL_PENDING_HOURS=48

# Reviews
VERIFIED_REVIEWS_ONLY=true
REVIEW_MODERATION=true

# Coupons
MAX_COUPON_DISCOUNT=50
MIN_COUPON_ORDER_VALUE=100
```

### Admin Configuration (Backend)
```env
ADMIN_EMAIL=admin@aqherbal.com
ADMIN_URL=http://localhost:3001
```

### Company Information (Backend & Frontend)
```env
# Backend
COMPANY_NAME=AQ Herbal
COMPANY_ADDRESS=Mumbai, Maharashtra, India
COMPANY_GSTIN=YOUR_GSTIN_NUMBER
SUPPORT_EMAIL=support@aqherbal.com
SUPPORT_PHONE=+91-1234567890

# Frontend
REACT_APP_SUPPORT_PHONE=+91-1234567890
REACT_APP_SUPPORT_EMAIL=support@aqherbal.com
REACT_APP_WHATSAPP=+91-9876543210
REACT_APP_COMPANY_ADDRESS=Mumbai, Maharashtra, India
```

## 🚀 Production Deployment

### Backend Production

1. **Copy production template:**
```bash
cp .env.docker.example .env.docker
```

2. **Update critical values:**
```env
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_64_CHAR_SECURE_RANDOM_STRING
JWT_REFRESH_SECRET=ANOTHER_64_CHAR_SECURE_RANDOM_STRING
MONGODB_URI=mongodb://mongo:27017/aqherbal
FRONTEND_URL=https://aqherbal.com
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=live-secret
REDIS_DISABLED=false
REDIS_HOST=redis
```

3. **Deploy with Docker:**
```bash
docker-compose up -d
```

### Frontend Production

1. **Copy production template:**
```bash
cp .env.production.example .env.production.local
```

2. **Update values:**
```env
NODE_ENV=production
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.aqherbal.com
REACT_APP_SITE_URL=https://aqherbal.com
REACT_APP_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
REACT_APP_CLOUDINARY_CLOUD_NAME=production-cloud
GENERATE_SOURCEMAP=false
```

3. **Build:**
```bash
npm run build
```

### Admin Production

1. **Copy production template:**
```bash
cp .env.production.example .env.production.local
```

2. **Update values:**
```env
NODE_ENV=production
REACT_APP_API_URL=https://api.aqherbal.com
REACT_APP_CLOUDINARY_CLOUD_NAME=production-cloud
GENERATE_SOURCEMAP=false
```

3. **Build:**
```bash
npm run build
```

## 🔒 Security Best Practices

### 1. Never Commit .env Files
Ensure `.gitignore` includes:
```
.env
.env.local
.env.production
.env.production.local
.env.docker
```

### 2. Use Strong Secrets in Production
❌ **Bad:**
```env
JWT_SECRET=secret
JWT_SECRET=12345
JWT_SECRET=change_me
```

✅ **Good:**
```env
JWT_SECRET=Kx9mP2nQ5rT8vW1yZ3aC6dF9gJ2kM5pS8tV1xY4bE7hK0nQ3rU6wZ9cF2eH5jM8p
```

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Different Credentials Per Environment
- Use `rzp_test_*` keys in development
- Use `rzp_live_*` keys in production
- Separate databases for dev/staging/production
- Different email accounts for testing

### 4. Environment Variable Validation
Backend automatically validates required variables on startup:
- Missing required variables → Application won't start
- Insecure values in production → Error thrown
- Missing optional variables → Warning shown

### 5. Rotate Secrets Regularly
- JWT secrets: Every 90 days
- API keys: When team members leave
- Database passwords: Quarterly
- Webhook secrets: Annually

## 🐛 Troubleshooting

### Backend won't start
**Error:** Missing required environment variables

**Solution:**
1. Copy `.env.example` to `.env`
2. Fill in all REQUIRED variables (marked in this guide)
3. Check for typos in variable names

### Email not sending
**Error:** Authentication failed

**Solution:**
1. Use App Password, not regular Gmail password
2. Enable "Less secure app access" (if not using 2FA)
3. Check EMAIL_HOST, EMAIL_PORT are correct
4. Verify EMAIL_USER format (email@domain.com)

### Images not uploading
**Error:** Cloudinary upload failed

**Solution:**
1. Verify all three Cloudinary variables are set
2. Check API key/secret are correct (copy-paste carefully)
3. Ensure cloud name matches your account
4. Check Cloudinary upload preset settings

### Payments failing
**Error:** Invalid Razorpay credentials

**Solution:**
1. Use `rzp_test_*` for development
2. Verify KEY_ID matches KEY_SECRET (both test or both live)
3. Don't mix test and live keys
4. Check webhook URL is accessible from internet

### Redis connection failed
**Error:** Redis connection timeout

**Solution:**
1. Set `REDIS_DISABLED=true` if not using Redis
2. Install Redis: `docker run -d -p 6379:6379 redis`
3. Or use Redis Cloud free tier
4. Check REDIS_HOST and REDIS_PORT

### Docker deployment issues
**Error:** Container exits immediately

**Solution:**
1. Ensure `.env.docker` file exists
2. Check MongoDB connection (use `mongo:27017` for Docker service)
3. Use Redis host `redis` (not `localhost`)
4. Check all secrets are production-ready

## 📚 Additional Resources

- [MongoDB Setup Guide](https://docs.mongodb.com/manual/installation/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Razorpay Integration Guide](https://razorpay.com/docs/payments/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Redis Installation](https://redis.io/download)
- [Docker Compose Guide](https://docs.docker.com/compose/)

## 🆘 Support

If you encounter issues:
1. Check this guide first
2. Review error messages in console
3. Verify all required variables are set
4. Check variable names for typos
5. Ensure values don't have extra spaces or quotes

For environment-specific issues, check:
- Backend: `d:\aqherbal\aqherbal_backend\src\config\validation.js`
- Business config: `d:\aqherbal\aqherbal_backend\src\config\business.config.js`
- Environment config: `d:\aqherbal\aqherbal_backend\src\config\env.js`

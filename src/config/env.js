import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Core
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  dbUrl: process.env.DB_URL || process.env.MONGODB_URI || '',
  dbName: process.env.DB_NAME || 'aqherbal',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Email (supports both EMAIL_* and SMTP_* prefixes)
  emailHost: process.env.EMAIL_HOST || process.env.SMTP_HOST || '',
  emailPort: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER || process.env.SMTP_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'AQ Herbal <noreply@aqherbal.com>',

  // Legacy SMTP variables (deprecated, use EMAIL_* instead)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',

  // Cloudinary (supports both CLOUDINARY_CLOUD_NAME and CLOUDINARY_NAME)
  cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

  // Razorpay
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Stripe (optional)
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Redis
  redisDisabled: process.env.REDIS_DISABLED === 'true',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisUrl: process.env.REDIS_URL || '',
  redisDb: parseInt(process.env.REDIS_DB || '0', 10),
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX || 'aqherbal:',

  // Admin
  adminEmail: process.env.ADMIN_EMAIL || 'admin@aqherbal.com',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',

  // Company
  companyName: process.env.COMPANY_NAME || 'AQ Herbal',
  companyAddress: process.env.COMPANY_ADDRESS || 'Mumbai, Maharashtra, India',
  companyGstin: process.env.COMPANY_GSTIN || '',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aqherbal.com',
  supportPhone: process.env.SUPPORT_PHONE || '+91-1234567890',

  // Security
  blacklistedIps: (process.env.BLACKLISTED_IPS || '').split(',').filter(Boolean),

  // Shipment Tracking
  enableShipmentTracking: process.env.ENABLE_SHIPMENT_TRACKING_JOB !== 'false',
  shipmentTrackingCron: process.env.SHIPMENT_TRACKING_CRON || '0 */4 * * *',
  timezone: process.env.TZ || 'Asia/Kolkata',
  indiaPostApiUrl: process.env.INDIA_POST_API_URL || 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  indiaPostTimeout: parseInt(process.env.INDIA_POST_TIMEOUT || '10000', 10)
};

export default config;

/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and secure
 */

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI'
];

const PRODUCTION_REQUIRED = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'FRONTEND_URL',
  'REDIS_HOST'
];

const INSECURE_VALUES = ['secret', 'changeme', 'test', 'password', 'admin', '12345'];

export const validateEnv = () => {
  const missing = [];
  const insecure = [];
  const warnings = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (INSECURE_VALUES.some(bad => value.toLowerCase().includes(bad))) {
      insecure.push(varName);
    }
  });

  // Check production-specific variables
  if (process.env.NODE_ENV === 'production') {
    PRODUCTION_REQUIRED.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
      }
    });
  }

  // Warning for missing optional but recommended variables
  const RECOMMENDED = ['ADMIN_EMAIL', 'ADMIN_URL'];
  RECOMMENDED.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Throw errors for missing required variables
  if (missing.length > 0) {
    throw new Error(
      '❌ Missing required environment variables:\n' +
      `   ${missing.join('\n   ')}\n\n` +
      'Please create a .env file based on .env.example\n' +
      'See documentation for setup instructions.'
    );
  }

  // Throw error for insecure values in production
  if (insecure.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      '❌ Insecure default values detected in production:\n' +
      `   ${insecure.join('\n   ')}\n\n` +
      'These MUST be changed to secure values before deployment!'
    );
  }

  // Validate FRONTEND_URL format in production
  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    try {
      new URL(process.env.FRONTEND_URL);
    } catch {
      throw new Error(`❌ Invalid FRONTEND_URL format: ${process.env.FRONTEND_URL}\n   Must be a valid URL (e.g., https://example.com)`);
    }
  }

  // Log warnings for missing recommended variables
  if (warnings.length > 0) {
    console.warn(
      '⚠️  Recommended environment variables not set:\n' +
      `   ${warnings.join('\n   ')}\n` +
      '   Using defaults, but should be configured for production.'
    );
  }

  // Log insecure values in development
  if (insecure.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️  Insecure default values detected (development only):\n' +
      `   ${insecure.join('\n   ')}\n` +
      '   These are OK for development but MUST be changed for production!'
    );
  }

  console.info('✅ Environment validation passed');
};

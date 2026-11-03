import * as Joi from 'joi';

/**
 * Environment validation — the app refuses to boot if a required variable is
 * missing or malformed (see AppConfigModule in app.module.ts).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required()
    .messages({
      'string.uriCustomScheme':
        'DATABASE_URL must be a postgresql:// connection string',
      'any.required': 'DATABASE_URL is required',
    }),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  ADMIN_URL: Joi.string().uri().default('http://localhost:3001'),
  APP_URL: Joi.string().uri().default('http://localhost:5000'),

  REDIS_DISABLED: Joi.boolean().default(true),
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),

  MSG91_AUTH_KEY: Joi.string().allow('').default(''),
  MSG91_SENDER_ID: Joi.string().allow('').default(''),
  MSG91_TEMPLATE_ID: Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().allow('').default(''),
  // Store owner inbox for order/contact notifications (never hard-coded).
  OWNER_EMAIL: Joi.string().email().allow('').default(''),

  // File storage (product/review images, invoices) — S3.
  // Empty values are allowed so the app boots in dev, but image upload
  // endpoints return 503 until they are configured.
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_S3_BUCKET: Joi.string().allow('').default(''),
  AWS_S3_REGION: Joi.string().allow('').default('ap-south-1'),
  AWS_S3_PUBLIC_URL: Joi.string().uri().allow('').default(''),

  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  // Dev-only simulated gateway. Refuses to boot in production.
  RAZORPAY_MOCK: Joi.boolean().default(false).when('NODE_ENV', {
    is: Joi.valid('production'),
    then: Joi.invalid(true).messages({
      'any.invalid': 'RAZORPAY_MOCK must be false in production',
    }),
  }),

  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  AUTH_THROTTLE_TTL: Joi.number().default(60000),
  AUTH_THROTTLE_LIMIT: Joi.number().default(10),
  OTP_THROTTLE_TTL: Joi.number().default(300000),
  OTP_THROTTLE_LIMIT: Joi.number().default(5),
});

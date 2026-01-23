import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),
  DB_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  RATE_LIMIT_WINDOW: Joi.string().default('15m'),
  RATE_LIMIT_MAX: Joi.number().default(200),
  SUSPICIOUS_RATE_LIMIT_MAX: Joi.number().default(20),
  SMTP_HOST: Joi.string().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow(''),
  SMTP_PASS: Joi.string().allow(''),
  CLOUDINARY_NAME: Joi.string().allow(''),
  CLOUDINARY_API_KEY: Joi.string().allow(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('')
}).unknown(true);

const { value: env, error } = schema.validate(process.env, { abortEarly: false });
if (error) {
  // Throwing at startup ensures production readiness
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  dbUrl: env.DB_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  rateLimitWindow: env.RATE_LIMIT_WINDOW,
  rateLimitMax: env.RATE_LIMIT_MAX,
  suspiciousRateLimitMax: env.SUSPICIOUS_RATE_LIMIT_MAX,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  },
  cloudinary: {
    name: env.CLOUDINARY_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET
  }
};

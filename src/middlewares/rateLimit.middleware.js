import rateLimit from 'express-rate-limit';
import { config } from '../config/config.js';

const bypassInTest = (_req, _res) => process.env.NODE_ENV === 'test';

function parseWindowMs(str) {
  if (!str) return 15 * 60 * 1000;
  if (str.endsWith('m')) return parseInt(str) * 60 * 1000;
  if (str.endsWith('h')) return parseInt(str) * 60 * 60 * 1000;
  return parseInt(str);
}

export const suspiciousRateLimiter = rateLimit({
  windowMs: parseWindowMs(config.rateLimitWindow),
  max: Number(config.suspiciousRateLimitMax),
  skip: bypassInTest,
  keyGenerator: (req) => req.userIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Suspicious activity detected. Access temporarily blocked.'
    });
  }
});

export const normalRateLimiter = rateLimit({
  windowMs: parseWindowMs(config.rateLimitWindow),
  max: Number(config.rateLimitMax),
  skip: bypassInTest,
  keyGenerator: (req) => req.userIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

const buildRateLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  skip: bypassInTest,
  keyGenerator: (req) => req.userIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  handler: (req, res) => res.status(429).json({ success: false, message })
});

const sensitiveWindow = parseWindowMs(config.sensitiveRateLimitWindow);

export const authRateLimiter = buildRateLimiter({
  windowMs: sensitiveWindow,
  max: Number(config.rateLimitLoginMax),
  message: 'Too many auth attempts. Please slow down.'
});

export const reviewRateLimiter = buildRateLimiter({
  windowMs: sensitiveWindow,
  max: Number(config.rateLimitReviewMax),
  message: 'Too many review attempts. Please try again later.'
});

export const couponRateLimiter = buildRateLimiter({
  windowMs: sensitiveWindow,
  max: Number(config.rateLimitCouponMax),
  message: 'Too many coupon requests. Please wait before retrying.'
});

export const contactRateLimiter = buildRateLimiter({
  windowMs: sensitiveWindow,
  max: Number(config.rateLimitContactMax),
  message: 'Too many contact requests. Please try again later.'
});

export const webhookRateLimiter = buildRateLimiter({
  windowMs: sensitiveWindow,
  max: Number(config.rateLimitWebhookMax),
  message: 'Too many webhook calls.'
});

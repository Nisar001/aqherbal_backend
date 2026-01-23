import rateLimit from 'express-rate-limit';
import { config } from '../config/config.js';

function parseWindowMs(str) {
  if (!str) return 15 * 60 * 1000;
  if (str.endsWith('m')) return parseInt(str) * 60 * 1000;
  if (str.endsWith('h')) return parseInt(str) * 60 * 60 * 1000;
  return parseInt(str);
}

export const suspiciousRateLimiter = rateLimit({
  windowMs: parseWindowMs(config.rateLimitWindow),
  max: Number(config.suspiciousRateLimitMax),
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
  keyGenerator: (req) => req.userIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

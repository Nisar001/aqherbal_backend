
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { appRoutes } from './app.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { applySecurityMiddlewares } from './middlewares/security.middleware.js';
import { suspiciousRateLimiter, normalRateLimiter } from './middlewares/rateLimit.middleware.js';
import { ipBlacklistMiddleware } from './middlewares/ipBlacklist.middleware.js';
import logger from './utils/logger.js';
import { connectDB } from './config/index.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
applySecurityMiddlewares(app);
app.use(ipBlacklistMiddleware);
app.use(requestLogger);

// Enhanced rate limiting per IP
app.use('/api/auth', suspiciousRateLimiter);
app.use('/api/admin', suspiciousRateLimiter);
app.use('/api', normalRateLimiter);

appRoutes(app);

// Block direct /api access and undefined endpoints
app.use('/api', (req, res, next) => {
  if (req.path === '/' || req.path === '') {
    return res.status(403).json({
      success: false,
      message: 'Direct access to /api is not allowed. Access not granted.'
    });
  }
  next();
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found or access not granted.'
  });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});

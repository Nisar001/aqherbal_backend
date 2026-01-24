
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { appRoutes } from './app.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { applySecurityMiddlewares } from './middlewares/security.middleware.js';
import { suspiciousRateLimiter, normalRateLimiter } from './middlewares/rateLimit.middleware.js';
import { ipBlacklistMiddleware } from './middlewares/ipBlacklist.middleware.js';
import { resolveIpMiddleware } from './middlewares/ip.middleware.js';
import { sanitizeRequestMiddleware } from './middlewares/sanitize.middleware.js';
import { spamDetectionMiddleware } from './middlewares/spamDetection.middleware.js';
import logger from './utils/logger.js';
import { connectDB } from './config/index.js';
import { setupSwagger } from './docs/swagger.js';
import { shipmentTrackingJob } from './jobs/shipmentTracking.job.js';
import { validateEnv } from './config/validation.js';

dotenv.config();

// Validate environment variables before starting server
validateEnv();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(resolveIpMiddleware);
app.use(sanitizeRequestMiddleware);
app.use(spamDetectionMiddleware);
applySecurityMiddlewares(app);
app.use(ipBlacklistMiddleware);
app.use(requestLogger);

// Enhanced rate limiting per IP
app.use('/api/v1/auth', suspiciousRateLimiter);
app.use('/api/v1/admin', suspiciousRateLimiter);
app.use('/api/v1', normalRateLimiter);

appRoutes(app);
setupSwagger(app);

// Centralized error handler
app.use(errorHandler);

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

export default app;

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);

      // Start background jobs
      if (process.env.ENABLE_SHIPMENT_TRACKING_JOB !== 'false') {
        shipmentTrackingJob.start();
        logger.info('Shipment tracking job initialized');
      }
    });
  });
}

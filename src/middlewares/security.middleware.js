import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import cors from 'cors';

// Export as a function for easy use in app.js
export const applySecurityMiddlewares = (app) => {
  app.use(helmet());
  app.use(cors());
  app.use(xss());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
};

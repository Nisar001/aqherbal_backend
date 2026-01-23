import helmet from 'helmet';
import xss from 'xss-clean';
import cors from 'cors';

// Export as a function for easy use in app.js
export const applySecurityMiddlewares = (app) => {
  app.use(helmet());
  app.use(cors());
  app.use(xss());
  // Rate limiting is applied via dedicated middleware with env-driven config
};

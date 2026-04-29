import { sanitizeInput } from '../helpers/sanitize.helper.js';
import { config } from '../config/config.js';

const defaultOptions = {
  maxDepth: Number(config.security.maxDepth) || 8,
  maxStringLength: Math.max(Number(config.security.maxStringLength) || 0, 50000)
};

export const sanitizeRequestMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body, defaultOptions);
  if (req.query) req.query = sanitizeInput(req.query, defaultOptions);
  if (req.params) req.params = sanitizeInput(req.params, defaultOptions);
  next();
};

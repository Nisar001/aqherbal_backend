import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || null;
  logger.info({
    method: req.method,
    url: req.url,
    body: req.body,
    user: req.user ? req.user : null,
    ip
  });
  req.userIp = ip;
  next();
};

import { spamDetectionService } from '../services/spamDetection.service.js';
import { config } from '../config/config.js';
import logger from '../utils/logger.js';

const getPayloadSnapshot = (req) => ({
  body: req.body || {},
  query: req.query || {},
  params: req.params || {}
});

const hasMeaningfulInput = (payload) => {
  const str = JSON.stringify(payload);
  return str && str !== '{}' && str !== '[]' && str !== 'null';
};

export const spamDetectionMiddleware = (req, res, next) => {
  const payload = getPayloadSnapshot(req);

  if (!hasMeaningfulInput(payload)) {
    return next();
  }

  const { isSpam, reasons, payloadBytes } = spamDetectionService.evaluate(payload, {
    route: req.originalUrl,
    ip: req.userIp || req.ip,
    userId: req.user?._id
  });

  const maxBytes = Number(config.spam.maxPayloadBytes);
  if (payloadBytes > maxBytes) {
    logger.warn('Payload exceeded limit', {
      route: req.originalUrl,
      ip: req.userIp || req.ip,
      payloadBytes
    });
    return res.status(413).json({
      success: false,
      message: 'Request payload too large'
    });
  }

  if (isSpam) {
    logger.warn('Blocked suspicious payload', {
      route: req.originalUrl,
      ip: req.userIp || req.ip,
      reasons
    });
    return res.status(400).json({
      success: false,
      message: 'Suspicious activity detected. Request blocked.'
    });
  }

  return next();
};

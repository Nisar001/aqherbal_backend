import { notifyUser } from '../services/notification.service.js';
import logger from '../utils/logger.js';

export const notificationMiddleware = async (req, res, next) => {
  try {
    if (req.notify) {
      await notifyUser(req.user.email, req.notifyMessage);
      logger.info(`Notification triggered for user: ${req.user.email}`);
    }
    next();
  } catch (error) {
    logger.error(`Notification error: ${error.message}`);
    next(error);
  }
};

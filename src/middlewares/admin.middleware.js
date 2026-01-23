import logger from '../utils/logger.js';
import { ROLES } from '../constants/roles.js';

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user?.email}`);
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};

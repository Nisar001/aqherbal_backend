import logger from '../utils/logger.js';

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user?.email}`);
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};

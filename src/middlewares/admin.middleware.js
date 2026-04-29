import logger from '../utils/logger.js';
import { ROLES } from '../constants/roles.js';
import { UserModel } from '../models/user.model.js';
import mongoose from 'mongoose';

/**
 * Middleware to authorize admin access
 * Checks if user has ADMIN role
 */
export const authorizeAdmin = async (req, res, next) => {
  const userId = req.user?._id || req.user?.id || req.user?.userId;
  const user = userId && mongoose.Types.ObjectId.isValid(userId)
    ? await UserModel.findById(userId).select('role email')
    : null;

  const effectiveRole = user?.role || req.user?.role;

  if (effectiveRole !== ROLES.ADMIN) {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user?.email}`);
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  if (user) {
    req.user = { ...req.user, role: user.role, email: user.email };
  }
  next();
};

/**
 * Middleware to check if user has one of the allowed roles
 * @param {Array<string>} allowedRoles - Array of allowed role names
 * @returns {Function} Express middleware function
 */
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('checkRole: No user found in request');
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`checkRole: User ${req.user.email} with role '${userRole}' attempted to access route requiring roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        message: 'Forbidden: Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
};

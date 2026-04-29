import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  listUsers
} from '../controllers/index.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

const isAdmin = (req) => req.user?.role === 'admin' || req.user?.role === 'super_admin';
const getRequestUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;
const requireSelfOrAdmin = (req, res, next) => {
  if (isAdmin(req) || getRequestUserId(req) === req.params.id) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden' });
};
const requireAdmin = (req, res, next) => {
  if (isAdmin(req)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden' });
};



// Get current user's profile
// GET /api/v1/users/me (Controller: getUsers)
router.get('/profile/:id', authenticate, getUserById);
router.get('/:id', authenticate, requireSelfOrAdmin, getUserById);

// Get user by ID (admin only)
// GET /api/v1/users/:id (Controller: getUserById)
router.get('/view/:id', authenticate, getUsers);

// Update user by ID (admin/user)
// PUT /api/v1/users/:id (Controller: updateUser)
router.put('/update/:id', authenticate, updateUser);
router.put('/:id', authenticate, requireSelfOrAdmin, updateUser);

// Delete user by ID (admin only)
// DELETE /api/v1/users/:id (Controller: deleteUser)
router.delete('/delete/:id', authenticate, deleteUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);

// List all users (admin only)
// GET /api/v1/users (Controller: listUsers)
router.get('/', authenticate, listUsers);

export default router;

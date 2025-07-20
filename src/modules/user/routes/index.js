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



// Get current user's profile
// GET /api/v1/users/me (Controller: getUsers)
router.get('/profile/:id', authenticate, getUserById);

// Get user by ID (admin only)
// GET /api/v1/users/:id (Controller: getUserById)
router.get('/view/:id', authenticate, getUsers);

// Update user by ID (admin/user)
// PUT /api/v1/users/:id (Controller: updateUser)
router.put('/update/:id', authenticate, updateUser);

// Delete user by ID (admin only)
// DELETE /api/v1/users/:id (Controller: deleteUser)
router.delete('/delete/:id', authenticate, deleteUser);

// List all users (admin only)
// GET /api/v1/users (Controller: listUsers)
router.get('/', authenticate, listUsers);

export default router;

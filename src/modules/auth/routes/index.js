
import express from 'express';
import * as controllers from '../controllers/index.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validateRequest } from '../../../middlewares/validation.middleware.js';

const router = express.Router();
// Register


// Register new user
// router.post('/register', validateRequest, controllers.register);


// For Testing
router.post(
  '/register',
  (req, res, next) => {
    console.info('➡️ Step 1: Route hit');
    next();
  },
  (req, res, next) => {
    console.info('➡️ Step 2: Before controller');
    next();
  },
  controllers.register
);

// Login user
// router.post('/login', validateRequest, controllers.login);
router.post(
  '/login',
  (req, res, next) => {
    console.info('➡️ Step 1: Route hit');
    next();
  },
  (req, res, next) => {
    console.info('➡️ Step 2: Before controller');
    next();
  },
  controllers.login
);

// Logout user
router.post('/logout', authenticate, controllers.logout);

// Refresh JWT token
router.post('/refresh-token', controllers.refreshToken);

// Forgot password
router.post('/forgot-password', validateRequest(), controllers.forgotPassword);

// Reset password
router.post('/reset-password', validateRequest(), controllers.resetPassword);

// Send verification email
router.post('/send-verification-email', controllers.sendVerificationEmail);

// Verify email
router.post('/verify-email', (req, _res, next) => {
  if (!req.query.token && req.body?.token) {
    req.query.token = req.body.token;
  }
  next();
}, controllers.verifyEmail);
router.get('/verify-email', controllers.verifyEmail);

// Get profile (authenticated)
router.get('/profile', controllers.getProfile);

// Update profile (authenticated)
router.put('/profile', controllers.updateProfile);

// Change password (authenticated)
router.post('/change-password', authenticate, controllers.changePassword);

// Email verification (GET for token) - removed duplicate route to avoid path-to-regexp error
// router.get('/verify-email/:token', controllers.verifyEmail);

// Resend verification email
router.post('/resend-verification-email', controllers.sendVerificationEmail);

// Get user by ID (admin only) - use user controllers, not getProfile
// router.get('/user/:id', controllers.getProfile);

// Update user by ID (admin only) - use user controllers, not updateProfile
// router.put('/user/:id', controllers.updateProfile);

// Delete user by ID (admin only) - use user controllers, not logout
// router.delete('/user/:id', controllers.logout);

// List all users (admin only) - use user controllers, not getProfile
// router.get('/users', controllers.getProfile);

export default router;




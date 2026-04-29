import express from 'express';
import {
  initiatePayment,
  verifyPayment,
  handleStripeWebhook,
  handleRazorpayWebhook,
  getPaymentHistory,
  retryPayment,
  getFailedPayments
} from '../controllers/index.js';
import { authenticate, authorizeAdmin } from '../../../middlewares/index.js';

const router = express.Router();

// User routes
router.post('/initiate', authenticate, initiatePayment);
router.post('/verify', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
router.post('/retry/:id', authenticate, retryPayment);

// Webhooks (no auth required, but should verify signature)
router.post('/webhook/stripe', handleStripeWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);

// Admin routes
router.get('/admin/failed', authenticate, authorizeAdmin, getFailedPayments);

export default router;

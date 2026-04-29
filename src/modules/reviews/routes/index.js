import express from 'express';
import {
  createReview,
  getProductReviews,
  getMyReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getProductRatingSummary,
  getPendingReviews,
  approveReview,
  rejectReview,
  markReviewHelpful
} from '../controllers/index.js';
import { authenticate, authorizeAdmin } from '../../../middlewares/index.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/summary/:productId', getProductRatingSummary);

// User routes
router.post('/', authenticate, createReview);
router.get('/my-reviews', authenticate, getMyReviews);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);
router.post('/:id/helpful', authenticate, markReviewHelpful);

// Admin routes
router.get('/admin/pending', authenticate, authorizeAdmin, getPendingReviews);
router.put('/admin/:id/approve', authenticate, authorizeAdmin, approveReview);
router.put('/admin/:id/reject', authenticate, authorizeAdmin, rejectReview);
router.put('/:id/approve', authenticate, authorizeAdmin, approveReview);
router.get('/:id', getReviewById);

export default router;

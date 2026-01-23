import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { authorizeAdmin } from '../../../middlewares/admin.middleware.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateApplyCoupon
} from '../../../validations/coupon.validation.js';
import * as couponController from '../controllers/index.js';

const router = Router();

// User routes
router.post(
  '/validate',
  authenticate,
  validate(validateApplyCoupon),
  couponController.validateCoupon
);

// Admin routes
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(validateCreateCoupon),
  couponController.createCoupon
);

router.get(
  '/',
  authenticate,
  authorizeAdmin,
  couponController.getAllCoupons
);

router.get(
  '/:id',
  authenticate,
  authorizeAdmin,
  couponController.getCouponById
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(validateUpdateCoupon),
  couponController.updateCoupon
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  couponController.deleteCoupon
);

router.get(
  '/:id/stats',
  authenticate,
  authorizeAdmin,
  couponController.getCouponUsageStats
);

export default router;

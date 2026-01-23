import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { authorizeAdmin } from '../../../middlewares/admin.middleware.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import {
  validateStockAdjustment,
  validateLowStockThreshold
} from '../../../validations/inventory.validation.js';
import * as inventoryController from '../controllers/index.js';

const router = Router();

// All inventory routes require admin authentication
router.post(
  '/adjust-stock',
  authenticate,
  authorizeAdmin,
  validate(validateStockAdjustment),
  inventoryController.adjustStock
);

router.post(
  '/set-threshold',
  authenticate,
  authorizeAdmin,
  validate(validateLowStockThreshold),
  inventoryController.setLowStockThreshold
);

router.get(
  '/low-stock',
  authenticate,
  authorizeAdmin,
  inventoryController.getLowStockProducts
);

router.get(
  '/history/:productId',
  authenticate,
  authorizeAdmin,
  inventoryController.getStockHistory
);

router.get(
  '/summary',
  authenticate,
  authorizeAdmin,
  inventoryController.getInventorySummary
);

export default router;

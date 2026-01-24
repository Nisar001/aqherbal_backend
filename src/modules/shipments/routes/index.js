import express from 'express';
import {
  createShipment,
  trackByNumber,
  getOrderTracking,
  getShipments,
  getShipmentById,
  refreshTracking,
  updateShipment,
  cancelShipment,
  bulkRefreshTracking
} from '../controllers/index.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { checkRole } from '../../../middlewares/admin.middleware.js';

const router = express.Router();

// Public routes
router.get('/track/:trackingNumber', trackByNumber);

// User routes (authenticated)
router.get('/orders/:orderId/tracking', authenticate, getOrderTracking);

// Admin routes
router.post('/admin/orders/:orderId/assign-shipment', authenticate, checkRole(['admin', 'super_admin']), createShipment);
router.get('/admin/shipments', authenticate, checkRole(['admin', 'super_admin']), getShipments);
router.get('/admin/shipments/:id', authenticate, checkRole(['admin', 'super_admin']), getShipmentById);
router.post('/admin/shipments/:id/refresh', authenticate, checkRole(['admin', 'super_admin']), refreshTracking);
router.put('/admin/shipments/:id', authenticate, checkRole(['admin', 'super_admin']), updateShipment);
router.post('/admin/shipments/:id/cancel', authenticate, checkRole(['admin', 'super_admin']), cancelShipment);
router.post('/admin/shipments/bulk-refresh', authenticate, checkRole(['admin', 'super_admin']), bulkRefreshTracking);

export default router;

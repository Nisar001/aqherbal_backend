import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrdersByStatus,
  getRecentOrders
} from '../controllers/index.js';
import { authenticate, authorizeAdmin } from '../../../middlewares/index.js';

const router = express.Router();

// User routes
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getMyOrders);
router.get('/my-orders', authenticate, getMyOrders);
router.get('/view/:id', authenticate, getOrderById);
router.delete('/:id/cancel', authenticate, cancelOrder);
router.get('/:id', authenticate, getOrderById);
router.put('/:id/cancel', authenticate, cancelOrder);

// Admin routes
router.put('/:id/status', authenticate, authorizeAdmin, updateOrderStatus);
router.get('/status/:status', authenticate, authorizeAdmin, getOrdersByStatus);
router.get('/admin/recent', authenticate, authorizeAdmin, getRecentOrders);

export default router;

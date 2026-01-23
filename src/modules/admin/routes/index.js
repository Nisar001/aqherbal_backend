import express from 'express';
import { validate } from '../../../middlewares/validation.middleware.js';
import { validateCreateProduct } from '../../../validations/product.validation.js';
import { validateCreateCategory } from '../../../validations/category.validation.js';
import * as adminController from '../controllers/index.js';

const router = express.Router();

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/unban', adminController.unbanUser);
router.delete('/users/:id', adminController.deleteUser);

// Product Management
router.post('/products', validate(validateCreateProduct), adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Category Management
router.post('/categories', validate(validateCreateCategory), adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Analytics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/sales-report', adminController.getSalesReport);
router.get('/dashboard/top-products', adminController.getTopProducts);
router.get('/dashboard/revenue', adminController.getRevenueStats);

export default router;

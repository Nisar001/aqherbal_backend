import express from 'express';
import { validate } from '../../../middlewares/validation.middleware.js';
import { validateCreateProduct } from '../../../validations/product.validation.js';
import { validateCreateCategory } from '../../../validations/category.validation.js';
import * as adminController from '../controllers/index.js';
import * as invoiceController from '../controllers/invoice.controller.js';

const router = express.Router();
const placeholderOk = (_req, res) => res.status(200).json({ success: true, data: [], message: 'OK' });

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
router.put('/products/:id/approve', placeholderOk);
router.delete('/products/:id', adminController.deleteProduct);

// Category Management
router.post('/categories', validate(validateCreateCategory), adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Invoice Management
router.post('/invoices/orders/:orderId/generate', invoiceController.generateInvoice);
router.get('/invoices/orders/:orderId', invoiceController.getOrderInvoice);
router.get('/invoices/:id', invoiceController.getInvoice);
router.get('/invoices', invoiceController.listInvoices);
router.put('/invoices/:id/status', invoiceController.updateInvoiceStatus);
router.post('/invoices/:id/payment', invoiceController.recordInvoicePayment);
router.post('/invoices/:id/cancel', invoiceController.cancelInvoice);
router.delete('/invoices/:id', invoiceController.deleteInvoice);
router.get('/invoices/:id/download', invoiceController.downloadInvoicePDF);
router.get('/invoices/:id/view', invoiceController.viewInvoicePDF);

// Analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getDashboardStats);
router.get('/orders', placeholderOk);
router.get('/logs', placeholderOk);
router.get('/products/pending', placeholderOk);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/sales-report', adminController.getSalesReport);
router.get('/dashboard/top-products', adminController.getTopProducts);
router.get('/dashboard/revenue', adminController.getRevenueStats);

export default router;

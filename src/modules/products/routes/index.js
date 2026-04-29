import express from 'express';
import { getProducts, getProductById } from '../controllers/index.js';
import { createProduct, updateProduct } from '../../admin/controllers/index.js';
import { getProductReviews } from '../../reviews/controllers/index.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { authorizeAdmin } from '../../../middlewares/admin.middleware.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import { validateCreateProduct } from '../../../validations/product.validation.js';

const router = express.Router();
router.post('/', authenticate, authorizeAdmin, validate(validateCreateProduct), createProduct);
router.put('/:id', authenticate, authorizeAdmin, updateProduct);
router.get('/:productId/reviews', getProductReviews);
router.get('/:id', getProductById);
router.get('/view/:id', getProductById);
router.get('/', getProducts);
export default router;

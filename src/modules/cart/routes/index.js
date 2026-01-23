import express from 'express';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/index.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeFromCart);
router.delete('/', clearCart);

export default router;

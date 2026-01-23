import express from 'express';
import { getProducts, getProductById } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getProductById);
router.get('/', getProducts);
export default router;

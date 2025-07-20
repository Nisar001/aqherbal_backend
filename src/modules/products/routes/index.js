import express from 'express';
import { getProducts } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getProducts);
router.put('/update/:id', getProducts);
router.delete('/delete/:id', getProducts);
router.get('/', getProducts);
export default router;

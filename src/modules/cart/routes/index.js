import express from 'express';
import { getCart } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getCart);
router.put('/update/:id', getCart);
router.delete('/delete/:id', getCart);
router.get('/', getCart);
export default router;

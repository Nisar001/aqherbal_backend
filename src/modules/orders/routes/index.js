import express from 'express';
import { getOrders } from '../controllers/index.js';

const router = express.Router();

router.get('/view/:id', getOrders);
router.put('/update/:id', getOrders);
router.delete('/delete/:id', getOrders);
router.get('/', getOrders);
// Add more order routes here

export default router;

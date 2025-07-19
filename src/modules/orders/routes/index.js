import express from 'express';
import { getOrders } from '../controllers/index.js';

const router = express.Router();

router.get('/', getOrders);
// Add more order routes here

export default router;

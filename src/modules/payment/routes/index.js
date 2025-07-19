import express from 'express';
import { getPayments } from '../controllers/index.js';

const router = express.Router();
router.get('/', getPayments);
export default router;

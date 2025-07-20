import express from 'express';
import { getPayments } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getPayments);
router.put('/update/:id', getPayments);
router.delete('/delete/:id', getPayments);
router.get('/', getPayments);
export default router;

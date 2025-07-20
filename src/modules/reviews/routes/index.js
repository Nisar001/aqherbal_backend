import express from 'express';
import { getReviews } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getReviews);
router.put('/update/:id', getReviews);
router.delete('/delete/:id', getReviews);
router.get('/', getReviews);
export default router;

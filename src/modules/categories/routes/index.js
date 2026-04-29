import express from 'express';
import { getCategories, getCategoryById } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getCategoryById);
router.get('/:id', getCategoryById);
router.get('/', getCategories);
export default router;

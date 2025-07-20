import express from 'express';
import { getCategories } from '../controllers/index.js';

const router = express.Router();
router.get('/view/:id', getCategories);
router.put('/update/:id', getCategories);
router.delete('/delete/:id', getCategories);
router.get('/', getCategories);
export default router;

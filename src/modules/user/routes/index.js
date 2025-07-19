import express from 'express';
import { getUsers } from '../controllers/index.js';

const router = express.Router();

router.get('/', getUsers);
// Add more user routes here

export default router;

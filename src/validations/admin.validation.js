import { body } from 'express-validator';

export const adminValidation = [
  body('name').isString().isLength({ min: 2 }).withMessage('Admin name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('permissions').optional().isArray()
];

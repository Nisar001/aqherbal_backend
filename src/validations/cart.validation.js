import { body } from 'express-validator';

export const cartValidation = [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('items').isArray({ min: 1 }).withMessage('Items array required'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

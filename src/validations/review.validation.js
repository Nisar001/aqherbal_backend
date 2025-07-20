import { body } from 'express-validator';

export const reviewValidation = [
  body('productId').isMongoId().withMessage('Valid product ID required'),
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString()
];

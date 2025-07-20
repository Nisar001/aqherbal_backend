import { body } from 'express-validator';

export const paymentValidation = [
  body('orderId').isMongoId().withMessage('Valid order ID required'),
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('method').isString().withMessage('Payment method required'),
  body('status').isString().withMessage('Payment status required'),
  body('transactionId').optional().isString()
];

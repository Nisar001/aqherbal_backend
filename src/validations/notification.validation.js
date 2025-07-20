import { body } from 'express-validator';

export const notificationValidation = [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('type').isString().withMessage('Notification type required'),
  body('message').isString().withMessage('Notification message required')
];

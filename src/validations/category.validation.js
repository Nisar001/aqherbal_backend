import { body } from 'express-validator';

export const categoryValidation = [
  body('name').isString().isLength({ min: 2 }).withMessage('Category name is required'),
  body('description').optional().isString(),
  body('parentId').optional().isMongoId(),
  body('image').optional().isString()
];

export const validateCreateCategory = categoryValidation;

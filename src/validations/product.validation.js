import { body } from 'express-validator';

export const productValidation = [
  body('name').isString().isLength({ min: 2 }).withMessage('Product name is required'),
  body('sku').isString().isLength({ min: 2 }).withMessage('SKU is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('categoryId').isMongoId().withMessage('Valid category ID required'),
  body('brand').optional().isString(),
  body('tags').optional().isArray(),
  body('images').optional().isArray()
];

export const validateCreateProduct = productValidation;

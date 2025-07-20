import { body } from 'express-validator';

export const orderValidation = [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('products').isArray({ min: 1 }).withMessage('Products array required'),
  body('products.*.productId').isMongoId().withMessage('Valid product ID required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress.street').isString(),
  body('shippingAddress.city').isString(),
  body('shippingAddress.state').isString(),
  body('shippingAddress.zip').isPostalCode('any'),
  body('shippingAddress.country').isString()
];

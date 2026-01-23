import Joi from 'joi';

export const validateStockAdjustment = Joi.object({
  productId: Joi.string().hex().length(24).required()
    .messages({
      'string.empty': 'Product ID is required',
      'string.hex': 'Invalid product ID format'
    }),
  quantity: Joi.number().integer().required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer'
    }),
  type: Joi.string().valid('add', 'subtract', 'set').required()
    .messages({
      'any.only': 'Type must be either add, subtract, or set'
    }),
  reason: Joi.string().min(5).max(200).required()
    .messages({
      'string.empty': 'Reason is required',
      'string.min': 'Reason must be at least 5 characters'
    })
});

export const validateLowStockThreshold = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  lowStockThreshold: Joi.number().integer().min(0).required()
    .messages({
      'number.min': 'Low stock threshold cannot be negative'
    })
});

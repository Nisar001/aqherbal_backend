import Joi from 'joi';

export const validateAddToCart = (data) => {
  const schema = Joi.object({
    productId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'Invalid product ID format'
    }),
    quantity: Joi.number().integer().min(1).max(10000).required()
  });
  return schema.validate(data);
};

export const validateUpdateCart = (data) => {
  const schema = Joi.object({
    productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    quantity: Joi.number().integer().min(1).max(10000).required()
  });
  return schema.validate(data);
};

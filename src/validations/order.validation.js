import Joi from 'joi';

const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.string().required(),
  country: Joi.string().required()
});

export const validateCreateOrder = (data) => {
  const schema = Joi.object({
    shippingAddress: addressSchema.required(),
    couponCode: Joi.string().optional()
  });
  return schema.validate(data);
};

export const validateUpdateOrderStatus = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
      .required(),
    notes: Joi.string().optional()
  });
  return schema.validate(data);
};

export const validateCancelOrder = (data) => {
  const schema = Joi.object({
    reason: Joi.string().optional()
  });
  return schema.validate(data);
};

export const validateApplyDiscount = (data) => {
  const schema = Joi.object({
    couponCode: Joi.string().required()
  });
  return schema.validate(data);
};

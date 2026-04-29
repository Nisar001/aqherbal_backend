import Joi from 'joi';

// Support both traditional (street/zip) and frontend format (line1/line2/pincode)
const addressSchema = Joi.object({
  _id: Joi.any().optional(),
  name: Joi.string().optional(),
  phone: Joi.string().optional(),
  addressType: Joi.string().optional(),
  isDefault: Joi.boolean().optional(),
  street: Joi.string().optional(),
  line1: Joi.string().optional(),
  line2: Joi.string().optional().allow(''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.string().optional(),
  pincode: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  country: Joi.string().default('India')
}).or('street', 'line1').or('zip', 'pincode', 'postalCode').unknown(true);

export const validateCreateOrder = (data) => {
  const schema = Joi.object({
    shippingAddress: addressSchema.optional(),
    shippingAddressId: Joi.string().optional(),
    paymentMethod: Joi.string().valid('card', 'netbanking', 'upi').optional(),
    couponCode: Joi.string().optional()
  }).or('shippingAddress', 'shippingAddressId');
  return schema.validate(data);
};

export const validateCreateOrderRequest = (data) => {
  const schema = Joi.object({
    shippingAddress: addressSchema.optional(),
    shippingAddressId: Joi.string().optional(),
    paymentMethod: Joi.string().valid('card', 'netbanking', 'upi').optional(),
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

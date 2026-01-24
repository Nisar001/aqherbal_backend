import Joi from 'joi';
import { BUSINESS_CONFIG } from '../config/business.config.js';

export const validateInitiatePayment = (data) => {
  const methods = BUSINESS_CONFIG.PAYMENT.SUPPORTED_METHODS;
  const schema = Joi.object({
    orderId: Joi.string().required(),
    method: Joi.string().valid(...methods).required()
      .messages({
        'any.only': `Payment method must be one of: ${methods.join(', ')}`
      })
  });
  return schema.validate(data);
};

export const validateWebhook = (data) => {
  const schema = Joi.object({
    event: Joi.string().required(),
    data: Joi.object().required()
  });
  return schema.validate(data);
};

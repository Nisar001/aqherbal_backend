import Joi from 'joi';

export const validateInitiatePayment = (data) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    method: Joi.string().valid('card', 'netbanking', 'upi', 'wallet').required()
      .messages({
        'any.only': 'Payment method must be one of: card, netbanking, upi, wallet'
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

import Joi from 'joi';

export const validateCreateReview = (data) => {
  const schema = Joi.object({
    productId: Joi.string().required(),
    orderId: Joi.string().optional(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().max(200).required(),
    content: Joi.string().max(5000).optional(),
    comment: Joi.string().max(5000).optional(),
    media: Joi.array().items(Joi.string().uri()).optional()
  });
  return schema.validate(data);
};

export const validateUpdateReview = (data) => {
  const schema = Joi.object({
    rating: Joi.number().min(1).max(5).optional(),
    title: Joi.string().max(200).optional(),
    content: Joi.string().max(5000).optional(),
    comment: Joi.string().max(5000).optional(),
    media: Joi.array().items(Joi.string().uri()).optional()
  });
  return schema.validate(data);
};

export const validateModerationAction = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    rejectionReason: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });
  return schema.validate(data);
};

export const validateMarkHelpful = (data) => {
  const schema = Joi.object({
    helpful: Joi.boolean().required()
  });
  return schema.validate(data);
};

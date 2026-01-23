import Joi from 'joi';

export const validateCreateCoupon = Joi.object({
  code: Joi.string().uppercase().trim().min(3).max(20).required()
    .messages({
      'string.empty': 'Coupon code is required',
      'string.min': 'Coupon code must be at least 3 characters',
      'string.max': 'Coupon code cannot exceed 20 characters'
    }),
  description: Joi.string().min(10).max(200).required()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters'
    }),
  discountType: Joi.string().valid('percentage', 'fixed').required()
    .messages({
      'any.only': 'Discount type must be either percentage or fixed'
    }),
  discountValue: Joi.number().positive().required()
    .messages({
      'number.base': 'Discount value must be a number',
      'number.positive': 'Discount value must be positive'
    }),
  minOrderValue: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().positive().allow(null).default(null),
  maxUses: Joi.number().integer().positive().allow(null).default(null),
  maxUsesPerUser: Joi.number().integer().positive().default(1),
  validFrom: Joi.date().iso().default(() => new Date()),
  validUntil: Joi.date().iso().greater(Joi.ref('validFrom')).required()
    .messages({
      'date.greater': 'Valid until date must be after valid from date'
    }),
  isActive: Joi.boolean().default(true),
  applicableCategories: Joi.array().items(Joi.string().hex().length(24)).default([]),
  applicableProducts: Joi.array().items(Joi.string().hex().length(24)).default([])
});

export const validateUpdateCoupon = Joi.object({
  description: Joi.string().min(10).max(200),
  discountValue: Joi.number().positive(),
  minOrderValue: Joi.number().min(0),
  maxDiscount: Joi.number().positive().allow(null),
  maxUses: Joi.number().integer().positive().allow(null),
  maxUsesPerUser: Joi.number().integer().positive(),
  validUntil: Joi.date().iso(),
  isActive: Joi.boolean(),
  applicableCategories: Joi.array().items(Joi.string().hex().length(24)),
  applicableProducts: Joi.array().items(Joi.string().hex().length(24))
}).min(1);

export const validateApplyCoupon = Joi.object({
  code: Joi.string().uppercase().trim().required()
    .messages({
      'string.empty': 'Coupon code is required'
    }),
  orderTotal: Joi.number().positive().required()
    .messages({
      'number.positive': 'Order total must be positive'
    })
});

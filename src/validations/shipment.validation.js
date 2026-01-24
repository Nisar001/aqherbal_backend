import Joi from 'joi';
import { COURIER_PROVIDERS, SHIPMENT_STATUS } from '../constants/shipmentStatus.js';

export const createShipmentSchema = Joi.object({
  courierProvider: Joi.string()
    .valid(...Object.values(COURIER_PROVIDERS))
    .required()
    .messages({
      'any.required': 'Courier provider is required',
      'any.only': 'Invalid courier provider'
    }),

  trackingNumber: Joi.string()
    .trim()
    .min(8)
    .max(30)
    .required()
    .messages({
      'string.empty': 'Tracking number is required',
      'string.min': 'Tracking number must be at least 8 characters',
      'string.max': 'Tracking number cannot exceed 30 characters'
    }),

  consignmentNumber: Joi.string()
    .trim()
    .min(8)
    .max(30)
    .optional(),

  estimatedDeliveryDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Estimated delivery date cannot be in the past'
    }),

  weight: Joi.number()
    .positive()
    .max(50000) // 50kg max
    .optional()
    .messages({
      'number.positive': 'Weight must be positive',
      'number.max': 'Weight cannot exceed 50kg'
    }),

  dimensions: Joi.object({
    length: Joi.number().positive().max(200).required(),
    width: Joi.number().positive().max(200).required(),
    height: Joi.number().positive().max(200).required()
  }).optional(),

  originLocation: Joi.string()
    .trim()
    .max(200)
    .optional(),

  metadata: Joi.object().optional()
});

export const updateShipmentSchema = Joi.object({
  estimatedDeliveryDate: Joi.date()
    .optional(),

  weight: Joi.number()
    .positive()
    .max(50000)
    .optional(),

  dimensions: Joi.object({
    length: Joi.number().positive().max(200).required(),
    width: Joi.number().positive().max(200).required(),
    height: Joi.number().positive().max(200).required()
  }).optional(),

  metadata: Joi.object().optional()
}).min(1);

export const cancelShipmentSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Cancellation reason is required',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

export const trackingQuerySchema = Joi.object({
  refresh: Joi.string()
    .valid('true', 'false')
    .optional()
});

export const shipmentsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20),

  sortBy: Joi.string()
    .valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'currentStatus', '-currentStatus')
    .optional()
    .default('-createdAt'),

  courierProvider: Joi.string()
    .valid(...Object.values(COURIER_PROVIDERS))
    .optional(),

  currentStatus: Joi.string()
    .valid(...Object.values(SHIPMENT_STATUS))
    .optional(),

  isActive: Joi.string()
    .valid('true', 'false')
    .optional(),

  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid user ID format'
    }),

  fromDate: Joi.date()
    .optional(),

  toDate: Joi.date()
    .min(Joi.ref('fromDate'))
    .optional()
    .messages({
      'date.min': 'To date must be after from date'
    })
});

// Joi or custom validation for reset password (for compatibility with resetPassword.controller.js)
export function validateResetPassword(data) {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).optional()
      .messages({ 'any.only': 'Passwords must match' })
  });
  return schema.validate(data);
}
// Joi or custom validation for forgot password (for compatibility with forgotPassword.controller.js)
export function validateForgotPassword(data) {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });
  return schema.validate(data);
}
// Joi or custom validation for login (for compatibility with login.controller.js)
export function validateLogin(data) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });
  return schema.validate(data);
}
import { body } from 'express-validator';

export const userRegisterValidation = [
  body('name').isString().isLength({ min: 2 }).withMessage('Name is required and must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone(),
  body('address.street').optional().isString(),
  body('address.city').optional().isString(),
  body('address.state').optional().isString(),
  body('address.zip').optional().isPostalCode('any'),
  body('address.country').optional().isString()
];

// Joi or custom validation for register (for compatibility with register.controller.js)
import Joi from 'joi';
export function validateRegister(data) {
  const schema = Joi.object({
    name: Joi.string().min(2).required(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional(),
    countryCode: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional()
  });
  return schema.validate(data);
}

export const userLoginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

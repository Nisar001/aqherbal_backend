import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN });
};

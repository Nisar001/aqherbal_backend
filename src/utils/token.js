import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};


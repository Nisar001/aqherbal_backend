import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

const invalidatedTokens = new Set();

export const invalidateToken = (token) => {
  if (token) {
    invalidatedTokens.add(token);
  }
};

export const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  if (invalidatedTokens.has(token)) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

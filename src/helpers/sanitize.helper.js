import { sanitizeObject } from '../utils/sanitizers.js';

// Recursive sanitizer used across middlewares to neutralize HTML/JS payloads
export const sanitizeInput = (input, options = {}) => sanitizeObject(input, options);

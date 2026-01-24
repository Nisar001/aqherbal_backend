import xss from 'xss';
import { normalizeString, normalizePayload } from './inputNormalizer.js';

const defaultOptions = {
  maxDepth: 8,
  maxStringLength: 5000
};

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  css: false
};

export const sanitizeString = (value, options = {}) => {
  if (typeof value !== 'string') return value;
  const opts = { ...defaultOptions, ...options };
  const normalized = normalizeString(value, opts);
  return xss(normalized, xssOptions);
};

export const sanitizeUrl = (value) => {
  if (typeof value !== 'string') return value;
  const normalized = normalizeString(value, { maxStringLength: 2048 });
  if (!/^https?:\/\//i.test(normalized)) return '';
  return xss(normalized, xssOptions);
};

export const sanitizeEmail = (value) => {
  if (typeof value !== 'string') return value;
  const normalized = normalizeString(value, { maxStringLength: 320 });
  return normalized.toLowerCase();
};

export const sanitizeObject = (payload, options = {}) => {
  const opts = { ...defaultOptions, ...options };

  const walk = (input, depth = 0) => {
    if (depth > opts.maxDepth) return undefined;
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') return sanitizeString(input, opts);
    if (typeof input === 'number' || typeof input === 'boolean') return input;

    if (Array.isArray(input)) {
      return input
        .map((item) => walk(item, depth + 1))
        .filter((item) => item !== undefined);
    }

    if (typeof input === 'object') {
      return Object.entries(input).reduce((acc, [key, value]) => {
        const sanitizedValue = walk(value, depth + 1);
        if (sanitizedValue !== undefined) {
          acc[key] = sanitizedValue;
        }
        return acc;
      }, {});
    }

    return input;
  };

  return walk(normalizePayload(payload, opts));
};

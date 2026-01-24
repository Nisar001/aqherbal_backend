// eslint-disable-next-line no-control-regex
const STRIP_CONTROL_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const STRIP_ZERO_WIDTH_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
const COLLAPSE_WHITESPACE_REGEX = /\s+/g;

const defaultOptions = {
  maxDepth: 8,
  maxStringLength: 5000
};

export const normalizeString = (value, options = {}) => {
  const opts = { ...defaultOptions, ...options };
  let normalized = value;

  normalized = normalized.replace(STRIP_CONTROL_REGEX, '');
  normalized = normalized.replace(STRIP_ZERO_WIDTH_REGEX, '');
  normalized = normalized.trim();
  normalized = normalized.replace(COLLAPSE_WHITESPACE_REGEX, ' ');

  if (normalized.length > opts.maxStringLength) {
    normalized = normalized.slice(0, opts.maxStringLength);
  }

  return normalized;
};

export const normalizePayload = (payload, options = {}, depth = 0) => {
  const opts = { ...defaultOptions, ...options };

  if (depth > opts.maxDepth) {
    return undefined;
  }

  if (payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') return normalizeString(payload, opts);
  if (typeof payload === 'number' || typeof payload === 'boolean') return payload;

  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizePayload(item, opts, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof payload === 'object') {
    return Object.entries(payload).reduce((acc, [key, value]) => {
      const normalizedValue = normalizePayload(value, opts, depth + 1);
      if (normalizedValue !== undefined) {
        acc[key] = normalizedValue;
      }
      return acc;
    }, {});
  }

  return payload;
};

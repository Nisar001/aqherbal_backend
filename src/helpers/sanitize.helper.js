import xss from 'xss';

export const sanitizeInput = (input) => {
  if (typeof input === 'string') return xss(input);
  if (Array.isArray(input)) return input.map(sanitizeInput);
  if (typeof input === 'object' && input !== null) {
    return Object.keys(input).reduce((acc, key) => {
      acc[key] = sanitizeInput(input[key]);
      return acc;
    }, {});
  }
  return input;
};

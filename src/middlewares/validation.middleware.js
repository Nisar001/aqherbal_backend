
import { validationResult } from 'express-validator';

// Wrap validations (express-validator chains or Joi schemas) and run them before checking results
export const validate = (validations = []) => {
  const chains = Array.isArray(validations) ? validations : [validations];

  return async (req, res, next) => {
    // Run express-validator chains
    const validatorChains = chains.filter((v) => typeof v?.run === 'function');
    await Promise.all(validatorChains.map((validation) => validation.run(req)));

    // Run Joi schemas (or any object with validate/validateAsync)
    const joiSchemas = chains.filter((v) => typeof v?.validate === 'function' || typeof v?.validateAsync === 'function');
    for (const schema of joiSchemas) {
      try {
        const result = typeof schema.validateAsync === 'function'
          ? await schema.validateAsync(req.body)
          : schema.validate(req.body);

        // If Joi returned value, use it to keep sanitized input
        if (result && result.value) {
          req.body = result.value;
        }
      } catch (error) {
        const details = error?.details || [{ message: error.message }];
        const errors = details.map((d) => ({ message: d.message }));
        return res.status(400).json({
          success: false,
          message: 'Invalid input detected',
          errors
        });
      }
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const safeErrors = errors.array().map(({ msg, param }) => ({ message: msg, field: param }));
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected',
        errors: safeErrors
      });
    }

    return next();
  };
};

export const validateRequest = validate;

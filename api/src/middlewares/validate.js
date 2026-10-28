import { ValidationError } from '../errors/app-error.js';

const PARTS = ['body', 'query', 'params'];

// Mỗi phần là Zod schema tùy chọn; phần không có schema thì không có trong req.validated.
export function validate(schemas = {}) {
  return (req, _res, next) => {
    const validated = {};
    const details = [];

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ path: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(new ValidationError('VALIDATION_ERROR', 'Invalid request data', details));
    }

    req.validated = validated;
    return next();
  };
}

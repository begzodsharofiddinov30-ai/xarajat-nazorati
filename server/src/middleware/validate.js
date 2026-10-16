import { ApiError, formatZodIssues } from '../utils/ApiError.js';

// Express 5'da req.query faqat o'qish uchun, shuning uchun tozalangan qiymatlar req.valid ichiga yoziladi.
export const validate = (schemas) => (req, _res, next) => {
  req.valid ??= {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      return next(
        ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', formatZodIssues(result.error)),
      );
    }
    req.valid[key] = result.data;
  }
  next();
};

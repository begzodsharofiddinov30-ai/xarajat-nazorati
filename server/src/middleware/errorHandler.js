import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError, formatZodIssues } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Yo'nalish topilmadi: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

// Barcha xatolar bitta formatda qaytadi: { error: { message, code, details? } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Serverda kutilmagan xatolik yuz berdi';
  let details;

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = "Ma'lumotlar noto'g'ri";
    details = formatZodIssues(err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = "Ma'lumotlar noto'g'ri";
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = "Identifikator noto'g'ri";
  } else if (err?.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'Bunday yozuv allaqachon mavjud';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = "So'rov tanasi noto'g'ri JSON";
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = "So'rov hajmi juda katta";
  }

  if (status >= 500 && env.NODE_ENV !== 'test') console.error(err);

  res.status(status).json({ error: { message, code, ...(details && { details }) } });
}

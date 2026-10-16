export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Avval tizimga kiring', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static notFound(message = 'Topilmadi', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }
}

export function formatZodIssues(error) {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

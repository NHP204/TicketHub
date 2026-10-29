export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(code = 'VALIDATION_ERROR', message = 'Validation failed', details) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'Unauthorized', details) {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'Forbidden', details) {
    super(403, code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'Resource not found', details) {
    super(404, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'Conflict', details) {
    super(409, code, message, details);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(code = 'PAYMENT_REQUIRED', message = 'Payment required', details) {
    super(402, code, message, details);
  }
}

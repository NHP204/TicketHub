import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/app-error.js';

// Mỗi lần gọi tạo một bộ đếm riêng (theo IP). enabled = false → middleware cho qua hết.
export function createRateLimiter({ enabled = true, limit, windowMs }) {
  if (!enabled) return (_req, _res, next) => next();

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Chuyển cho errorHandler để lỗi 429 có cùng định dạng với mọi lỗi khác.
    handler: (_req, _res, next) => {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu, vui lòng thử lại sau'));
    },
  });
}

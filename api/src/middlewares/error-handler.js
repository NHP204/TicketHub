import { AppError } from '../errors/app-error.js';

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}

export function errorHandler(logger) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof AppError) {
      return sendError(res, err.status, err.code, err.message, err.details);
    }

    if (err.type === 'entity.parse.failed') {
      return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
    }

    // Lỗi ngoài dự kiến: log đầy đủ, không để lộ message/stack ra response.
    logger.error(err.message, { stack: err.stack, method: req.method, path: req.originalUrl });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  };
}

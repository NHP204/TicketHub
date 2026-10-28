import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

// Dùng sau authenticate. Chưa xác thực → 401; role không nằm trong danh sách → 403.
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('UNAUTHORIZED', 'Thiếu hoặc sai access token'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'));
    }
    return next();
  };
}

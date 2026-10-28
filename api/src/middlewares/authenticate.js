import { UnauthorizedError } from '../errors/app-error.js';

const BEARER_PATTERN = /^Bearer (\S+)$/;

// Thành công → req.user = { id, role }. Không có/sai định dạng/sai chữ ký → UNAUTHORIZED;
// hết hạn → TOKEN_EXPIRED để web biết cần gọi refresh.
export function authenticate(jwtUtil, secret) {
  return (req, _res, next) => {
    const match = BEARER_PATTERN.exec(req.headers.authorization ?? '');
    if (!match) {
      return next(new UnauthorizedError('UNAUTHORIZED', 'Thiếu hoặc sai access token'));
    }

    let payload;
    try {
      payload = jwtUtil.verifyAccessToken(match[1], secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('TOKEN_EXPIRED', 'Access token đã hết hạn'));
      }
      return next(new UnauthorizedError('UNAUTHORIZED', 'Thiếu hoặc sai access token'));
    }

    req.user = { id: payload.sub, role: payload.role };
    return next();
  };
}

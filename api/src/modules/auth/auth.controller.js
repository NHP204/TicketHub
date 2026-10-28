import { ok } from '../../utils/response.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';

// production: web và API khác site nên cần sameSite 'none' (bắt buộc kèm secure).
export function refreshCookieOptions({ nodeEnv, maxAgeMs }) {
  const isProduction = nodeEnv === 'production';
  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  };
}

export function createAuthController(authService, cookieOptions) {
  function sendSession(res, { refreshToken, ...session }) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    return ok(res, session);
  }

  return {
    async register(req, res) {
      const user = await authService.register(req.validated.body);
      return ok(res, user, { status: 201 });
    },

    async login(req, res) {
      const result = await authService.login(req.validated.body);
      return sendSession(res, result);
    },

    async refresh(req, res) {
      const result = await authService.refresh(req.cookies[REFRESH_COOKIE_NAME]);
      return sendSession(res, result);
    },

    async logout(req, res) {
      await authService.logout(req.cookies[REFRESH_COOKIE_NAME]);
      // Cùng path/sameSite/secure thì trình duyệt mới xóa đúng cookie; Express 5 bỏ qua maxAge ở đây.
      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
      return res.status(204).end();
    },
  };
}

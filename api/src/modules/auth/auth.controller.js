import { ok } from '../../utils/response.js';

export function createAuthController(authService) {
  return {
    async register(req, res) {
      const user = await authService.register(req.validated.body);
      return ok(res, user, { status: 201 });
    },

    async login(req, res) {
      const result = await authService.login(req.validated.body);
      return ok(res, result);
    },
  };
}

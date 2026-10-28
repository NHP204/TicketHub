import { ok } from '../../utils/response.js';

export function createUsersController(usersService) {
  return {
    async getMe(req, res) {
      const user = await usersService.getMe(req.user.id);
      return ok(res, user);
    },

    async updateMe(req, res) {
      const user = await usersService.updateMe(req.user.id, req.validated.body);
      return ok(res, user);
    },

    async listUsers(req, res) {
      const { users, meta } = await usersService.listUsers(req.validated.query);
      return ok(res, users, { meta });
    },

    async updateUser(req, res) {
      const user = await usersService.updateUser(
        req.user.id,
        req.validated.params.id,
        req.validated.body,
      );
      return ok(res, user);
    },
  };
}

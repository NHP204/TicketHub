import { ok } from '../../utils/response.js';

export function createUsersController(usersService) {
  return {
    async getMe(req, res) {
      const user = await usersService.getMe(req.user.id);
      return ok(res, user);
    },
  };
}

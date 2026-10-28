import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import {
  adminUpdateUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
  userIdParamsSchema,
} from './users.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
export function createUsersRouter(usersController, requireAuth) {
  const router = Router();
  const requireAdmin = [requireAuth, authorize('ADMIN')];

  router.get('/users/me', requireAuth, usersController.getMe);
  router.patch(
    '/users/me',
    requireAuth,
    validate({ body: updateMeSchema }),
    usersController.updateMe,
  );

  router.get(
    '/admin/users',
    requireAdmin,
    validate({ query: listUsersQuerySchema }),
    usersController.listUsers,
  );
  router.patch(
    '/admin/users/:id',
    requireAdmin,
    validate({ params: userIdParamsSchema, body: adminUpdateUserSchema }),
    usersController.updateUser,
  );
  return router;
}

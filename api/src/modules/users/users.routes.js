import { Router } from 'express';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
export function createUsersRouter(usersController, requireAuth) {
  const router = Router();
  router.get('/users/me', requireAuth, usersController.getMe);
  return router;
}

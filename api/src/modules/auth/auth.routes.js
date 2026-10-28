import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

// limiters: { register, login } — middleware rate limit nhận từ container.
export function createAuthRouter(authController, limiters) {
  const router = Router();
  router.post(
    '/auth/register',
    limiters.register,
    validate({ body: registerSchema }),
    authController.register,
  );
  router.post('/auth/login', limiters.login, validate({ body: loginSchema }), authController.login);
  router.post('/auth/refresh', authController.refresh);
  router.post('/auth/logout', authController.logout);
  return router;
}

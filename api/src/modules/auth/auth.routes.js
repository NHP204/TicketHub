import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export function createAuthRouter(authController) {
  const router = Router();
  router.post('/auth/register', validate({ body: registerSchema }), authController.register);
  router.post('/auth/login', validate({ body: loginSchema }), authController.login);
  return router;
}

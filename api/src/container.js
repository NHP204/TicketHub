import { createLogger } from './utils/logger.js';
import * as passwordUtil from './utils/password.js';
import * as jwtUtil from './utils/jwt.js';
import * as userRepo from './repositories/user.repo.js';
import { authenticate } from './middlewares/authenticate.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createUsersController } from './modules/users/users.controller.js';
import { createUsersRouter } from './modules/users/users.routes.js';

// Nơi duy nhất khởi tạo và nối dependency.
export function buildContainer({ env, pool }) {
  const logger = createLogger(env.NODE_ENV);
  const requireAuth = authenticate(jwtUtil, env.JWT_ACCESS_SECRET);

  const authService = new AuthService({
    pool,
    userRepo,
    passwordUtil,
    jwtUtil,
    accessSecret: env.JWT_ACCESS_SECRET,
  });
  const usersService = new UsersService({ pool, userRepo });

  const routers = [
    createAuthRouter(createAuthController(authService)),
    createUsersRouter(createUsersController(usersService), requireAuth),
  ];

  return { logger, routers };
}

import { createLogger } from './utils/logger.js';
import * as passwordUtil from './utils/password.js';
import * as jwtUtil from './utils/jwt.js';
import * as userRepo from './repositories/user.repo.js';
import * as refreshTokenRepo from './repositories/refresh-token.repo.js';
import { authenticate } from './middlewares/authenticate.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthController, refreshCookieOptions } from './modules/auth/auth.controller.js';
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
    refreshTokenRepo,
    passwordUtil,
    jwtUtil,
    accessSecret: env.JWT_ACCESS_SECRET,
  });
  const usersService = new UsersService({ pool, userRepo });
  const cookieOptions = refreshCookieOptions({
    nodeEnv: env.NODE_ENV,
    maxAgeMs: jwtUtil.REFRESH_TOKEN_TTL_MS,
  });

  const routers = [
    createAuthRouter(createAuthController(authService, cookieOptions)),
    createUsersRouter(createUsersController(usersService), requireAuth),
  ];

  return { logger, routers };
}

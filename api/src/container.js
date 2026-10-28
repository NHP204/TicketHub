import { createLogger } from './utils/logger.js';
import * as passwordUtil from './utils/password.js';
import * as jwtUtil from './utils/jwt.js';
import * as userRepo from './repositories/user.repo.js';
import * as refreshTokenRepo from './repositories/refresh-token.repo.js';
import { authenticate } from './middlewares/authenticate.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthController, refreshCookieOptions } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createUsersController } from './modules/users/users.controller.js';
import { createUsersRouter } from './modules/users/users.routes.js';

const AUTH_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };

// Nơi duy nhất khởi tạo và nối dependency.
// rateLimitEnabled: mặc định tắt khi NODE_ENV=test; test riêng của rate limit truyền true.
export function buildContainer({ env, pool, rateLimitEnabled = env.NODE_ENV !== 'test' }) {
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
  const usersService = new UsersService({ pool, userRepo, refreshTokenRepo, passwordUtil });
  const cookieOptions = refreshCookieOptions({
    nodeEnv: env.NODE_ENV,
    maxAgeMs: jwtUtil.REFRESH_TOKEN_TTL_MS,
  });

  // Mỗi route một bộ đếm riêng: 5 request / phút / IP cho login, 5 cho register.
  const authLimiters = {
    login: createRateLimiter({ enabled: rateLimitEnabled, ...AUTH_RATE_LIMIT }),
    register: createRateLimiter({ enabled: rateLimitEnabled, ...AUTH_RATE_LIMIT }),
  };

  const routers = [
    createAuthRouter(createAuthController(authService, cookieOptions), authLimiters),
    createUsersRouter(createUsersController(usersService), requireAuth),
  ];

  return { logger, routers };
}

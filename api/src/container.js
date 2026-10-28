import { createLogger } from './utils/logger.js';
import * as passwordUtil from './utils/password.js';
import * as jwtUtil from './utils/jwt.js';
import * as userRepo from './repositories/user.repo.js';
import * as refreshTokenRepo from './repositories/refresh-token.repo.js';
import * as eventRepo from './repositories/event.repo.js';
import * as sectionRepo from './repositories/section.repo.js';
import * as seatRepo from './repositories/seat.repo.js';
import { FakeStorage } from './services/storage/fake-storage.js';
import { SupabaseStorage } from './services/storage/supabase-storage.js';
import { authenticate } from './middlewares/authenticate.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthController, refreshCookieOptions } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createUsersController } from './modules/users/users.controller.js';
import { createUsersRouter } from './modules/users/users.routes.js';
import { EventService } from './modules/events/events.service.js';
import { createEventsController } from './modules/events/events.controller.js';
import { createEventsRouter } from './modules/events/events.routes.js';
import { SectionService } from './modules/sections/sections.service.js';
import { createSectionsController } from './modules/sections/sections.controller.js';
import { createSectionsRouter } from './modules/sections/sections.routes.js';

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
  // Test không gọi Supabase: file giữ trong bộ nhớ.
  const storage =
    env.NODE_ENV === 'test'
      ? new FakeStorage()
      : new SupabaseStorage({
          url: env.SUPABASE_URL,
          serviceKey: env.SUPABASE_SERVICE_KEY,
          bucket: env.SUPABASE_BUCKET,
        });
  const eventService = new EventService({ pool, eventRepo, seatRepo, storage });
  const sectionService = new SectionService({ pool, eventRepo, sectionRepo, seatRepo });
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
    createEventsRouter(createEventsController(eventService), requireAuth),
    createSectionsRouter(createSectionsController(sectionService), requireAuth),
  ];

  return { logger, routers };
}

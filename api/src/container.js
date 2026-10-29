import { createLogger } from './utils/logger.js';
import * as passwordUtil from './utils/password.js';
import * as jwtUtil from './utils/jwt.js';
import * as userRepo from './repositories/user.repo.js';
import * as refreshTokenRepo from './repositories/refresh-token.repo.js';
import * as eventRepo from './repositories/event.repo.js';
import * as sectionRepo from './repositories/section.repo.js';
import * as seatRepo from './repositories/seat.repo.js';
import * as bookingRepo from './repositories/booking.repo.js';
import * as paymentRepo from './repositories/payment.repo.js';
import * as ticketRepo from './repositories/ticket.repo.js';
import * as statsRepo from './repositories/stats.repo.js';
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
import { BookingService } from './modules/bookings/bookings.service.js';
import { createBookingsController } from './modules/bookings/bookings.controller.js';
import { createBookingsRouter } from './modules/bookings/bookings.routes.js';
import { MockPaymentProvider } from './modules/payments/providers/mock.provider.js';
import { PaymentService } from './modules/payments/payment.service.js';
import { createPaymentsController } from './modules/payments/payments.controller.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
import { TicketService } from './modules/tickets/tickets.service.js';
import { createTicketsController } from './modules/tickets/tickets.controller.js';
import { createTicketsRouter } from './modules/tickets/tickets.routes.js';
import { StatsService } from './modules/stats/stats.service.js';
import { createStatsController } from './modules/stats/stats.controller.js';
import { createStatsRouter } from './modules/stats/stats.routes.js';

const AUTH_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };

// Nơi duy nhất khởi tạo và nối dependency.
// rateLimitEnabled: mặc định tắt khi NODE_ENV=test; test riêng của rate limit truyền true.
// paymentProvider: cổng thanh toán thỏa interface PaymentProvider; test truyền provider luôn thất bại.
export function buildContainer({
  env,
  pool,
  rateLimitEnabled = env.NODE_ENV !== 'test',
  paymentProvider = new MockPaymentProvider(),
}) {
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
  const bookingService = new BookingService({ pool, bookingRepo, seatRepo });
  const paymentService = new PaymentService({
    pool,
    provider: paymentProvider,
    bookingRepo,
    seatRepo,
    paymentRepo,
    ticketRepo,
  });
  const ticketService = new TicketService({ pool, ticketRepo });
  const statsService = new StatsService({ pool, eventRepo, statsRepo });
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
    createBookingsRouter(createBookingsController(bookingService), requireAuth),
    createPaymentsRouter(createPaymentsController(paymentService), requireAuth),
    createTicketsRouter(createTicketsController(ticketService), requireAuth),
    createStatsRouter(createStatsController(statsService), requireAuth),
  ];

  return { logger, routers };
}

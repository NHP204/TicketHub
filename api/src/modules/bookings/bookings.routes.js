import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import {
  bookingIdParamsSchema,
  holdSeatsSchema,
  listMyBookingsQuerySchema,
} from './bookings.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Chỉ USER đặt vé; ADMIN được xem chi tiết booking để hỗ trợ.
// Quyền sở hữu booking do BookingService kiểm tra.
export function createBookingsRouter(bookingsController, requireAuth) {
  const router = Router();
  const requireUser = [requireAuth, authorize('USER')];
  const params = validate({ params: bookingIdParamsSchema });

  router.post(
    '/bookings',
    requireUser,
    validate({ body: holdSeatsSchema }),
    bookingsController.hold,
  );
  // Đăng ký trước /bookings/:id để "me" không bị hiểu là id.
  router.get(
    '/bookings/me',
    requireUser,
    validate({ query: listMyBookingsQuerySchema }),
    bookingsController.listMine,
  );
  router.get(
    '/bookings/:id',
    requireAuth,
    authorize('USER', 'ADMIN'),
    params,
    bookingsController.getById,
  );
  router.post('/bookings/:id/cancel', requireUser, params, bookingsController.cancel);
  return router;
}

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import {
  bookingIdParamsSchema,
  holdSeatsSchema,
  listMyBookingsQuerySchema,
} from './bookings.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Mọi role đã đăng nhập đều giữ ghế được. Quyền sở hữu booking do BookingService kiểm tra.
export function createBookingsRouter(bookingsController, requireAuth) {
  const router = Router();
  const params = validate({ params: bookingIdParamsSchema });

  router.post(
    '/bookings',
    requireAuth,
    validate({ body: holdSeatsSchema }),
    bookingsController.hold,
  );
  // Đăng ký trước /bookings/:id để "me" không bị hiểu là id.
  router.get(
    '/bookings/me',
    requireAuth,
    validate({ query: listMyBookingsQuerySchema }),
    bookingsController.listMine,
  );
  router.get('/bookings/:id', requireAuth, params, bookingsController.getById);
  router.post('/bookings/:id/cancel', requireAuth, params, bookingsController.cancel);
  return router;
}

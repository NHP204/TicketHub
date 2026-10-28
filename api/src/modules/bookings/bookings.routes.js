import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { holdSeatsSchema } from './bookings.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Mọi role đã đăng nhập đều giữ ghế được.
export function createBookingsRouter(bookingsController, requireAuth) {
  const router = Router();

  router.post(
    '/bookings',
    requireAuth,
    validate({ body: holdSeatsSchema }),
    bookingsController.hold,
  );
  return router;
}

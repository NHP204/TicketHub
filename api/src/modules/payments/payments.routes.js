import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { bookingIdParamsSchema } from '../bookings/bookings.schemas.js';

// Chỉ USER thanh toán. Quyền sở hữu booking do PaymentService kiểm tra (người khác nhận 404).
export function createPaymentsRouter(paymentsController, requireAuth) {
  const router = Router();
  router.post(
    '/bookings/:id/pay',
    requireAuth,
    authorize('USER'),
    validate({ params: bookingIdParamsSchema }),
    paymentsController.pay,
  );
  return router;
}

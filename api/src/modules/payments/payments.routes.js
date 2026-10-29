import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { bookingIdParamsSchema } from '../bookings/bookings.schemas.js';

// Quyền sở hữu booking do PaymentService kiểm tra (người khác nhận 404).
export function createPaymentsRouter(paymentsController, requireAuth) {
  const router = Router();
  router.post(
    '/bookings/:id/pay',
    requireAuth,
    validate({ params: bookingIdParamsSchema }),
    paymentsController.pay,
  );
  return router;
}

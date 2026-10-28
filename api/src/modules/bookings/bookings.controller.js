import { ok } from '../../utils/response.js';

export function createBookingsController(bookingService) {
  return {
    async hold(req, res) {
      const booking = await bookingService.holdSeats(req.user, req.validated.body);
      return ok(res, booking, { status: 201 });
    },
  };
}

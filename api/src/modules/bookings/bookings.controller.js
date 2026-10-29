import { ok } from '../../utils/response.js';

export function createBookingsController(bookingService) {
  return {
    async hold(req, res) {
      const booking = await bookingService.holdSeats(req.user, req.validated.body);
      return ok(res, booking, { status: 201 });
    },

    async listMine(req, res) {
      const { bookings, meta } = await bookingService.listMine(req.user, req.validated.query);
      return ok(res, bookings, { meta });
    },

    async getById(req, res) {
      const booking = await bookingService.getById(req.user, req.validated.params.id);
      return ok(res, booking);
    },

    async cancel(req, res) {
      const booking = await bookingService.cancel(req.user, req.validated.params.id);
      return ok(res, booking);
    },
  };
}

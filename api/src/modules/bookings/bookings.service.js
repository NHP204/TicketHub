import { withTransaction } from '../../config/db.js';
import { HOLD_MINUTES } from '../../config/constants.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';

function bookingNotFound() {
  return new NotFoundError('BOOKING_NOT_FOUND', 'Không tìm thấy booking');
}

// actor = { id, role } — người thực hiện thao tác, lấy từ access token.
// Mọi so sánh thời gian chạy bằng now() của PostgreSQL trong repository, không dùng đồng hồ Node.
export class BookingService {
  constructor({ pool, bookingRepo, seatRepo }) {
    this.pool = pool;
    this.bookingRepo = bookingRepo;
    this.seatRepo = seatRepo;
  }

  // Giữ ghế HOLD_MINUTES phút. Khóa dòng ghế (FOR UPDATE) nên hai request cùng ghế chạy
  // tuần tự: request sau thấy ghế đã HELD và nhận SEAT_NOT_AVAILABLE.
  async holdSeats(actor, { eventId, seatIds }) {
    return withTransaction(this.pool, async (client) => {
      const event = await this.bookingRepo.findEventForHold(client, eventId);
      if (!event || event.status !== 'PUBLISHED') {
        throw new NotFoundError('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện');
      }
      if (event.started) {
        throw new ConflictError('EVENT_ALREADY_STARTED', 'Sự kiện đã bắt đầu');
      }

      const seats = await this.seatRepo.findForHold(client, eventId, seatIds);
      if (seats.length !== seatIds.length) {
        throw new ValidationError('INVALID_SEATS', 'Có ghế không thuộc sự kiện này');
      }

      const unavailableIds = seats.filter((s) => !s.available).map((s) => s.id);
      if (unavailableIds.length > 0) {
        throw new ConflictError('SEAT_NOT_AVAILABLE', 'Có ghế không còn trống', unavailableIds);
      }

      const lockedIds = seats.map((s) => s.id);
      const expiresAt = await this.seatRepo.hold(client, lockedIds, actor.id, HOLD_MINUTES);
      const items = seats.map((s) => ({
        seatId: s.id,
        section: s.section,
        row: s.row,
        number: s.number,
        price: s.price,
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

      const booking = await this.bookingRepo.create(client, {
        userId: actor.id,
        eventId,
        totalAmount,
        expiresAt,
      });
      await this.bookingRepo.createItems(client, booking.id, items);

      return {
        id: booking.id,
        status: booking.status,
        eventId: booking.eventId,
        totalAmount: booking.totalAmount,
        expiresAt: booking.expiresAt,
        items,
      };
    });
  }

  async listMine(actor, { status, page, limit }) {
    const { bookings, total } = await this.bookingRepo.findByUser(this.pool, actor.id, {
      status,
      limit,
      offset: (page - 1) * limit,
    });
    return { bookings, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // Chủ booking hoặc admin xem được; người khác nhận 404 để không lộ booking có tồn tại.
  async getById(actor, bookingId) {
    const booking = await this.bookingRepo.findById(this.pool, bookingId);
    if (!booking || (booking.userId !== actor.id && actor.role !== 'ADMIN')) {
      throw bookingNotFound();
    }
    const items = await this.bookingRepo.findItems(this.pool, bookingId);
    return { ...booking, items };
  }

  // Chỉ chủ booking hủy được, và chỉ khi PENDING. Khóa booking (FOR UPDATE) nên hủy không chen
  // ngang với job hết hạn: bên chạy sau thấy status đã đổi.
  async cancel(actor, bookingId) {
    return withTransaction(this.pool, async (client) => {
      const booking = await this.bookingRepo.findByIdForUpdate(client, bookingId);
      if (!booking || booking.userId !== actor.id) throw bookingNotFound();
      if (booking.status !== 'PENDING') {
        throw new ConflictError('BOOKING_NOT_PENDING', 'Chỉ hủy được booking đang chờ thanh toán');
      }

      await this.seatRepo.releaseForBooking(client, {
        bookingId,
        userId: booking.userId,
        expiresAt: booking.expiresAt,
      });
      return this.bookingRepo.updateStatus(client, bookingId, 'CANCELLED');
    });
  }
}

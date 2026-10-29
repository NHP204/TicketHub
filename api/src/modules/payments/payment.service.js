import QRCode from 'qrcode';
import { withTransaction } from '../../config/db.js';
import { ConflictError, NotFoundError, PaymentRequiredError } from '../../errors/app-error.js';
import { generateTicketCode } from '../../utils/ticket-code.js';

// provider: bất kỳ object nào thỏa interface PaymentProvider (providers/payment-provider.js).
// Service không biết cổng cụ thể là gì → thêm cổng mới không phải sửa file này.
export class PaymentService {
  constructor({ pool, provider, bookingRepo, seatRepo, paymentRepo, ticketRepo }) {
    this.pool = pool;
    this.provider = provider;
    this.bookingRepo = bookingRepo;
    this.seatRepo = seatRepo;
    this.paymentRepo = paymentRepo;
    this.ticketRepo = ticketRepo;
  }

  // Khóa booking (FOR UPDATE) đến hết transaction: hai request pay cùng lúc chạy tuần tự,
  // request sau thấy booking đã PAID. Job hết hạn và hủy booking cũng phải chờ.
  async pay(actor, bookingId) {
    return withTransaction(this.pool, async (client) => {
      const booking = await this.bookingRepo.findForPaymentForUpdate(client, bookingId);
      if (!booking || booking.userId !== actor.id) {
        throw new NotFoundError('BOOKING_NOT_FOUND', 'Không tìm thấy booking');
      }
      if (booking.status !== 'PENDING') {
        throw new ConflictError('BOOKING_NOT_PENDING', 'Booking không ở trạng thái chờ thanh toán');
      }
      if (booking.expired) {
        throw new ConflictError('BOOKING_EXPIRED', 'Booking đã hết hạn giữ ghế');
      }

      const charge = await this.provider.charge({ bookingId, amount: booking.totalAmount });
      // Không ghi dòng payments FAILED: payments.booking_id là UNIQUE, sẽ chặn lần thanh toán lại.
      // Ném lỗi → rollback, booking giữ PENDING và ghế giữ HELD.
      if (!charge.success) {
        throw new PaymentRequiredError('PAYMENT_DECLINED', 'Thanh toán bị từ chối', {
          reason: charge.reason,
        });
      }

      await this.seatRepo.bookForBooking(client, bookingId);
      const paid = await this.bookingRepo.updateStatus(client, bookingId, 'PAID');
      await this.paymentRepo.create(client, {
        bookingId,
        provider: this.provider.name,
        amount: booking.totalAmount,
        status: 'SUCCESS',
        transactionRef: charge.transactionRef,
      });

      const items = await this.bookingRepo.findItemsForTickets(client, bookingId);
      const tickets = await Promise.all(
        items.map(async (item) => {
          const code = generateTicketCode();
          return {
            bookingItemId: item.id,
            code,
            section: item.section,
            row: item.row,
            number: item.number,
            qrData: await QRCode.toDataURL(code),
          };
        }),
      );
      await this.ticketRepo.createMany(client, tickets);

      return {
        booking: paid,
        tickets: tickets.map(({ code, section, row, number, qrData }) => ({
          code,
          section,
          row,
          number,
          qrData,
        })),
      };
    });
  }
}

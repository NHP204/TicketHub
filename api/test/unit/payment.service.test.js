import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentService } from '../../src/modules/payments/payment.service.js';
import { MockPaymentProvider } from '../../src/modules/payments/providers/mock.provider.js';

const BOOKING_ID = 'booking-1';
const user = { id: 'user-1', role: 'USER' };

// Pool giả cho withTransaction: ghi lại BEGIN/COMMIT/ROLLBACK vào queries.
function createFakePool() {
  const queries = [];
  return {
    queries,
    async connect() {
      return {
        async query(sql) {
          queries.push(sql);
        },
        release() {},
      };
    },
  };
}

// Booking PENDING còn hạn, 2 ghế VIP 500000 → tổng 1000000.
function createFakeBookingRepo() {
  return {
    async findForPaymentForUpdate(_db, id) {
      if (id !== BOOKING_ID) return null;
      return {
        id,
        userId: user.id,
        status: 'PENDING',
        totalAmount: 1000000,
        expired: false,
      };
    },
    async updateStatus(_db, id, status) {
      return { id, userId: user.id, status, totalAmount: 1000000 };
    },
    async findItemsForTickets() {
      return [
        { id: 'item-1', section: 'VIP', row: 'A', number: 1 },
        { id: 'item-2', section: 'VIP', row: 'A', number: 2 },
      ];
    },
  };
}

// calls ghi lại mọi lần gọi repo ghi dữ liệu.
function createService(provider) {
  const calls = { seats: [], payments: [], tickets: [] };
  const pool = createFakePool();
  const service = new PaymentService({
    pool,
    provider,
    bookingRepo: createFakeBookingRepo(),
    seatRepo: {
      async bookForBooking(_db, bookingId) {
        calls.seats.push(bookingId);
        return 2;
      },
    },
    paymentRepo: {
      async create(_db, data) {
        calls.payments.push(data);
        return { id: 'payment-1', ...data };
      },
    },
    ticketRepo: {
      async createMany(_db, tickets) {
        calls.tickets.push(tickets);
      },
    },
  });
  return { service, pool, calls };
}

test('provider từ chối → ném PAYMENT_DECLINED, rollback và không gọi repo vé', async () => {
  const provider = new MockPaymentProvider({ shouldFail: () => true });
  const { service, pool, calls } = createService(provider);

  await assert.rejects(service.pay(user, BOOKING_ID), { status: 402, code: 'PAYMENT_DECLINED' });
  assert.equal(calls.tickets.length, 0);
  assert.equal(calls.payments.length, 0);
  assert.equal(calls.seats.length, 0);
  assert.equal(pool.queries.at(-1), 'ROLLBACK');
});

test('service chạy được với provider tự viết trong test, chỉ cần thỏa interface charge', async () => {
  const charged = [];
  const provider = {
    name: 'TEST',
    async charge({ bookingId, amount }) {
      charged.push({ bookingId, amount });
      return { success: true, transactionRef: 'TEST-REF-1' };
    },
  };
  const { service, pool, calls } = createService(provider);

  const result = await service.pay(user, BOOKING_ID);

  assert.deepEqual(charged, [{ bookingId: BOOKING_ID, amount: 1000000 }]);
  assert.deepEqual(calls.payments, [
    {
      bookingId: BOOKING_ID,
      provider: 'TEST',
      amount: 1000000,
      status: 'SUCCESS',
      transactionRef: 'TEST-REF-1',
    },
  ]);
  assert.equal(result.booking.status, 'PAID');
  assert.equal(result.tickets.length, 2);
  assert.equal(pool.queries.at(-1), 'COMMIT');
});

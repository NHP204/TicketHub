import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { MockPaymentProvider } from '../../src/modules/payments/providers/mock.provider.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createSeededEvent, createUser, tokenFor } from '../helpers/factories.js';

const env = loadEnv();

function buildApp(paymentProvider) {
  const { logger, routers } = buildContainer({ env, pool: testPool, paymentProvider });
  return createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });
}

const app = buildApp(new MockPaymentProvider());
const decliningApp = buildApp(new MockPaymentProvider({ shouldFail: () => true }));

beforeEach(resetDb);
after(closeDb);

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

// User giữ 2 ghế VIP (2 × 500000) của sự kiện PUBLISHED như seed P01.
async function setupHeldBooking() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const user = await createUser();
  const { event, vip } = await createSeededEvent(organizer.id);
  const seatIds = vip.seatIds.slice(0, 2);
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(user))
    .send({ eventId: event.id, seatIds });
  assert.equal(res.status, 201);
  return { user, seatIds, booking: res.body.data };
}

function pay(user, bookingId, target = app) {
  return request(target)
    .post(`/api/v1/bookings/${bookingId}/pay`)
    .set('Authorization', bearer(user));
}

// Trạng thái DB sau khi pay: booking, ghế, vé và các dòng payments.
async function snapshot(bookingId, seatIds) {
  const { rows } = await testPool.query(
    `SELECT (SELECT status FROM bookings WHERE id = $1) AS booking,
            (SELECT array_agg(status) FROM seats WHERE id = ANY($2)) AS seats,
            (SELECT bool_and(held_by IS NULL AND held_until IS NULL)
             FROM seats WHERE id = ANY($2)) AS hold_cleared,
            (SELECT COUNT(*)::int FROM tickets) AS tickets,
            (SELECT COALESCE(json_agg(json_build_object('amount', amount, 'status', status)),
                             '[]'::json)
             FROM payments WHERE booking_id = $1) AS payments`,
    [bookingId, seatIds],
  );
  return rows[0];
}

test('giữ 2 ghế VIP rồi pay → 200, 2 vé, ghế BOOKED, booking PAID, 1 payment 1000000', async () => {
  const { user, seatIds, booking } = await setupHeldBooking();

  const res = await pay(user, booking.id);

  assert.deepEqual(
    {
      status: res.status,
      bookingStatus: res.body.data?.booking.status,
      ticketCount: res.body.data?.tickets.length,
      db: await snapshot(booking.id, seatIds),
    },
    {
      status: 200,
      bookingStatus: 'PAID',
      ticketCount: 2,
      db: {
        booking: 'PAID',
        seats: ['BOOKED', 'BOOKED'],
        hold_cleared: true,
        tickets: 2,
        payments: [{ amount: 1000000, status: 'SUCCESS' }],
      },
    },
  );
});

test('vé trả về có mã TH-XXXXXXXX, đúng ghế và qrData là ảnh PNG', async () => {
  const { user, booking } = await setupHeldBooking();

  const res = await pay(user, booking.id);

  const tickets = res.body.data.tickets;
  assert.deepEqual(
    tickets.map(({ section, row, number }) => ({ section, row, number })),
    [
      { section: 'VIP', row: 'A', number: 1 },
      { section: 'VIP', row: 'A', number: 2 },
    ],
  );
  for (const ticket of tickets) {
    assert.match(ticket.code, /^TH-[A-HJ-NP-Z2-9]{8}$/);
    assert.ok(ticket.qrData.startsWith('data:image/png;base64,'));
  }
});

test('pay lần 2 → 409 BOOKING_NOT_PENDING, vẫn chỉ 1 dòng payments', async () => {
  const { user, booking } = await setupHeldBooking();
  await pay(user, booking.id);

  const res = await pay(user, booking.id);

  const { rows } = await testPool.query('SELECT COUNT(*)::int AS n FROM payments');
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code, payments: rows[0].n },
    { status: 409, code: 'BOOKING_NOT_PENDING', payments: 1 },
  );
});

test('2 request pay cùng lúc → đúng 1 thành công, request kia 409 BOOKING_NOT_PENDING', async () => {
  const { user, booking } = await setupHeldBooking();

  const results = await Promise.all([pay(user, booking.id), pay(user, booking.id)]);

  const { rows } = await testPool.query(
    `SELECT (SELECT COUNT(*)::int FROM payments) AS payments,
            (SELECT COUNT(*)::int FROM tickets) AS tickets`,
  );
  assert.deepEqual(
    {
      statuses: results.map((r) => r.status).sort(),
      codes: results.map((r) => r.body.error?.code).filter(Boolean),
      ...rows[0],
    },
    { statuses: [200, 409], codes: ['BOOKING_NOT_PENDING'], payments: 1, tickets: 2 },
  );
});

test('booking quá hạn → 409 BOOKING_EXPIRED', async () => {
  const { user, booking } = await setupHeldBooking();
  await testPool.query(
    `UPDATE bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`,
    [booking.id],
  );

  const res = await pay(user, booking.id);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'BOOKING_EXPIRED' },
  );
});

test('provider thất bại → 402 PAYMENT_DECLINED, booking PENDING, ghế HELD, 0 vé, 0 payment', async () => {
  const { user, seatIds, booking } = await setupHeldBooking();

  const res = await pay(user, booking.id, decliningApp);

  assert.deepEqual(
    {
      status: res.status,
      code: res.body.error?.code,
      db: await snapshot(booking.id, seatIds),
    },
    {
      status: 402,
      code: 'PAYMENT_DECLINED',
      db: {
        booking: 'PENDING',
        seats: ['HELD', 'HELD'],
        hold_cleared: false,
        tickets: 0,
        payments: [],
      },
    },
  );
});

test('sau khi provider từ chối, pay lại với provider thành công → 200', async () => {
  const { user, booking } = await setupHeldBooking();
  await pay(user, booking.id, decliningApp);

  const res = await pay(user, booking.id);
  assert.equal(res.status, 200);
});

test('user khác pay booking → 404 BOOKING_NOT_FOUND', async () => {
  const { booking } = await setupHeldBooking();
  const other = await createUser();

  const res = await pay(other, booking.id);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 404, code: 'BOOKING_NOT_FOUND' },
  );
});

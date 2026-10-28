import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookingService } from '../../src/modules/bookings/bookings.service.js';
import { holdSeatsSchema } from '../../src/modules/bookings/bookings.schemas.js';
import { validate } from '../../src/middlewares/validate.js';

const EVENT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_EVENT_ID = '00000000-0000-4000-8000-000000000002';
const EXPIRES_AT = new Date('2026-11-01T10:10:00.000Z');

const user = { id: 'user-1', role: 'USER' };

function seatId(n) {
  return `00000000-0000-4000-8000-1000000000${String(n).padStart(2, '0')}`;
}

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

function createFakeBookingRepo(created) {
  return {
    async findEventForHold(_db, eventId) {
      return eventId === EVENT_ID ? { id: EVENT_ID, status: 'PUBLISHED', started: false } : null;
    },
    async create(_db, data) {
      const booking = { id: `booking-${created.length + 1}`, status: 'PENDING', ...data };
      created.push(booking);
      return { ...booking };
    },
    async createItems() {},
  };
}

// seats = [{ id, eventId, price, available }]; findForHold lọc như SQL thật (theo id và event).
function createFakeSeatRepo(seats) {
  return {
    async findForHold(_db, eventId, seatIds) {
      return seats
        .filter((s) => seatIds.includes(s.id) && s.eventId === eventId)
        .map((s) => ({ section: 'VIP', row: 'A', number: 1, ...s }));
    },
    async hold() {
      return EXPIRES_AT;
    },
  };
}

function createService(seats) {
  const pool = createFakePool();
  const service = new BookingService({
    pool,
    bookingRepo: createFakeBookingRepo([]),
    seatRepo: createFakeSeatRepo(seats),
  });
  return { service, pool };
}

test('ghế BOOKED thì ném SEAT_NOT_AVAILABLE với details là id ghế đó và rollback', async () => {
  const { service, pool } = createService([
    { id: seatId(1), eventId: EVENT_ID, price: 500000, available: true },
    { id: seatId(2), eventId: EVENT_ID, price: 500000, available: false, status: 'BOOKED' },
  ]);
  await assert.rejects(
    service.holdSeats(user, { eventId: EVENT_ID, seatIds: [seatId(1), seatId(2)] }),
    {
      code: 'SEAT_NOT_AVAILABLE',
      details: [seatId(2)],
    },
  );
  assert.deepEqual(pool.queries, ['BEGIN', 'ROLLBACK']);
});

test('7 ghế thì validate trả lỗi VALIDATION_ERROR và service không được gọi', () => {
  let serviceCalls = 0;
  const service = {
    async holdSeats() {
      serviceCalls += 1;
    },
  };
  const req = {
    body: { eventId: EVENT_ID, seatIds: [1, 2, 3, 4, 5, 6, 7].map(seatId) },
    query: {},
    params: {},
  };
  let error;
  // Chuỗi middleware như Express: chỉ đi tiếp tới service khi next() không có lỗi.
  validate({ body: holdSeatsSchema })(req, {}, (err) => {
    if (err) error = err;
    else service.holdSeats(user, req.validated.body);
  });
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(serviceCalls, 0);
});

test('repo trả về 1 ghế khi yêu cầu 2 thì ném INVALID_SEATS', async () => {
  const { service } = createService([
    { id: seatId(1), eventId: EVENT_ID, price: 500000, available: true },
    { id: seatId(2), eventId: OTHER_EVENT_ID, price: 500000, available: true },
  ]);
  await assert.rejects(
    service.holdSeats(user, { eventId: EVENT_ID, seatIds: [seatId(1), seatId(2)] }),
    {
      code: 'INVALID_SEATS',
    },
  );
});

test('2 ghế giá 500000 và 1 ghế giá 200000 thì totalAmount là 1200000', async () => {
  const { service } = createService([
    { id: seatId(1), eventId: EVENT_ID, price: 500000, available: true },
    { id: seatId(2), eventId: EVENT_ID, price: 500000, available: true },
    { id: seatId(3), eventId: EVENT_ID, price: 200000, available: true },
  ]);
  const booking = await service.holdSeats(user, {
    eventId: EVENT_ID,
    seatIds: [seatId(1), seatId(2), seatId(3)],
  });
  assert.equal(booking.totalAmount, 1200000);
});

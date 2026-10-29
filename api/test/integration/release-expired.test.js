import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as bookingRepo from '../../src/repositories/booking.repo.js';
import * as seatRepo from '../../src/repositories/seat.repo.js';
import { BookingService } from '../../src/modules/bookings/bookings.service.js';
import { releaseExpired } from '../../src/jobs/release-expired.job.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createSeededEvent, createUser } from '../helpers/factories.js';

const bookingService = new BookingService({ pool: testPool, bookingRepo, seatRepo });

beforeEach(resetDb);
after(closeDb);

// User giữ 2 ghế VIP đầu tiên bằng service P07; trả về booking và id 2 ghế.
async function holdTwoSeats() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const user = await createUser();
  const { event, vip } = await createSeededEvent(organizer.id);
  const seatIds = vip.seatIds.slice(0, 2);
  const booking = await bookingService.holdSeats(user, { eventId: event.id, seatIds });
  return { booking, seatIds };
}

// Lùi expires_at của booking và held_until của ghế về cùng thời điểm 1 phút trước,
// như thể booking được tạo 11 phút trước.
async function moveToPast(bookingId) {
  await testPool.query(
    `WITH b AS (
       UPDATE bookings SET expires_at = now() - interval '1 minute'
       WHERE id = $1
       RETURNING id, expires_at
     )
     UPDATE seats s SET held_until = b.expires_at
     FROM b JOIN booking_items bi ON bi.booking_id = b.id
     WHERE s.id = bi.seat_id AND s.status = 'HELD'`,
    [bookingId],
  );
}

async function markPaid(bookingId, seatIds) {
  await testPool.query(`UPDATE bookings SET status = 'PAID' WHERE id = $1`, [bookingId]);
  await testPool.query(
    `UPDATE seats SET status = 'BOOKED', held_by = NULL, held_until = NULL WHERE id = ANY($1)`,
    [seatIds],
  );
}

async function snapshot(bookingId, seatIds) {
  const booking = await testPool.query('SELECT status FROM bookings WHERE id = $1', [bookingId]);
  const seats = await testPool.query(
    'SELECT status, held_by, held_until FROM seats WHERE id = ANY($1) ORDER BY id',
    [seatIds],
  );
  return { bookingStatus: booking.rows[0].status, seats: seats.rows };
}

test('booking PENDING hết hạn 1 phút trước thì thành EXPIRED và 2 ghế về AVAILABLE', async () => {
  const { booking, seatIds } = await holdTwoSeats();
  await moveToPast(booking.id);

  await releaseExpired(testPool);

  const free = { status: 'AVAILABLE', held_by: null, held_until: null };
  assert.deepEqual(await snapshot(booking.id, seatIds), {
    bookingStatus: 'EXPIRED',
    seats: [free, free],
  });
});

test('releaseExpired trả về { bookings: 1, seats: 2 } khi có một booking 2 ghế hết hạn', async () => {
  const { booking } = await holdTwoSeats();
  await moveToPast(booking.id);

  assert.deepEqual(await releaseExpired(testPool), { bookings: 1, seats: 2 });
});

test('booking PENDING còn hạn thì không đổi', async () => {
  const { booking, seatIds } = await holdTwoSeats();
  const before = await snapshot(booking.id, seatIds);

  await releaseExpired(testPool);

  assert.deepEqual(await snapshot(booking.id, seatIds), before);
});

test('booking PAID có ghế BOOKED và expires_at trong quá khứ thì không đổi', async () => {
  const { booking, seatIds } = await holdTwoSeats();
  await moveToPast(booking.id);
  await markPaid(booking.id, seatIds);
  const before = await snapshot(booking.id, seatIds);

  await releaseExpired(testPool);

  assert.deepEqual(await snapshot(booking.id, seatIds), before);
});

test('chạy releaseExpired 2 lần liên tiếp thì lần 2 trả { bookings: 0, seats: 0 }', async () => {
  const { booking } = await holdTwoSeats();
  await moveToPast(booking.id);

  await releaseExpired(testPool);

  assert.deepEqual(await releaseExpired(testPool), { bookings: 0, seats: 0 });
});

import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as bookingRepo from '../../src/repositories/booking.repo.js';
import * as seatRepo from '../../src/repositories/seat.repo.js';
import { BookingService } from '../../src/modules/bookings/bookings.service.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createSeededEvent, createUser } from '../helpers/factories.js';

// Gọi thẳng service với pool thật: các lời gọi chạy song song trên nhiều connection,
// nên chỉ khóa dòng trong PostgreSQL mới ngăn được hai người giữ cùng một ghế.
const bookingService = new BookingService({ pool: testPool, bookingRepo, seatRepo });

beforeEach(resetDb);
after(closeDb);

const USER_COUNT = 20;
const DEADLOCK_ROUNDS = 20;

async function createActors(count) {
  const actors = [];
  for (let i = 0; i < count; i += 1) {
    const user = await createUser();
    actors.push({ id: user.id, role: user.role });
  }
  return actors;
}

// 20 actor khác nhau cùng giữ một ghế VIP.
async function raceForOneSeat() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const { event, vip } = await createSeededEvent(organizer.id);
  const seatId = vip.seatIds[0];
  const actors = await createActors(USER_COUNT);
  const results = await Promise.allSettled(
    actors.map((actor) =>
      bookingService.holdSeats(actor, { eventId: event.id, seatIds: [seatId] }),
    ),
  );
  return { seatId, results };
}

test('20 user cùng giữ một ghế thì đúng 1 người thành công', async () => {
  const { results } = await raceForOneSeat();
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
});

test('20 user cùng giữ một ghế thì 19 người nhận SEAT_NOT_AVAILABLE', async () => {
  const { results } = await raceForOneSeat();
  const notAvailable = results.filter(
    (r) => r.status === 'rejected' && r.reason.code === 'SEAT_NOT_AVAILABLE',
  );
  assert.equal(notAvailable.length, USER_COUNT - 1);
});

test('20 user cùng giữ một ghế thì DB có đúng 1 booking và 1 booking_item cho ghế đó', async () => {
  const { seatId } = await raceForOneSeat();
  const { rows } = await testPool.query(
    `SELECT (SELECT COUNT(*) FROM bookings) AS bookings,
            (SELECT COUNT(*) FROM booking_items WHERE seat_id = $1) AS items`,
    [seatId],
  );
  assert.deepEqual(
    { bookings: Number(rows[0].bookings), items: Number(rows[0].items) },
    { bookings: 1, items: 1 },
  );
});

test('A giữ [1, 2] và B giữ [2, 1] cùng lúc 20 lần thì không deadlock, mỗi lần đúng 1 người thành công', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const { event, vip } = await createSeededEvent(organizer.id);
  const [userA, userB] = await createActors(2);
  const [seat1, seat2] = vip.seatIds;

  const outcomes = [];
  for (let round = 0; round < DEADLOCK_ROUNDS; round += 1) {
    await testPool.query('DELETE FROM booking_items');
    await testPool.query('DELETE FROM bookings');
    await testPool.query(
      `UPDATE seats SET status = 'AVAILABLE', held_by = NULL, held_until = NULL
       WHERE id = ANY($1)`,
      [[seat1, seat2]],
    );

    const results = await Promise.allSettled([
      bookingService.holdSeats(userA, { eventId: event.id, seatIds: [seat1, seat2] }),
      bookingService.holdSeats(userB, { eventId: event.id, seatIds: [seat2, seat1] }),
    ]);
    outcomes.push({
      fulfilled: results.filter((r) => r.status === 'fulfilled').length,
      deadlocks: results.filter((r) => r.status === 'rejected' && r.reason.code === '40P01').length,
    });
  }

  assert.deepEqual(outcomes, Array(DEADLOCK_ROUNDS).fill({ fulfilled: 1, deadlocks: 0 }));
});

import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createSeededEvent, createUser, tokenFor } from '../helpers/factories.js';

const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

// User thường và một sự kiện PUBLISHED như seed P01.
async function userWithSeededEvent() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const user = await createUser();
  const seeded = await createSeededEvent(organizer.id);
  return { organizer, user, ...seeded };
}

function postBooking(user, body) {
  return request(app).post('/api/v1/bookings').set('Authorization', bearer(user)).send(body);
}

async function countBookings() {
  const { rows } = await testPool.query('SELECT COUNT(*) AS total FROM bookings');
  return Number(rows[0].total);
}

test('giữ 2 ghế VIP thì nhận 201 và totalAmount là 1000000', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  const res = await postBooking(user, { eventId: event.id, seatIds: vip.seatIds.slice(0, 2) });
  assert.deepEqual(
    { status: res.status, totalAmount: res.body.data?.totalAmount },
    { status: 201, totalAmount: 1000000 },
  );
});

test('giữ 2 ghế VIP thì 2 ghế đó trong DB là HELD', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  const seatIds = vip.seatIds.slice(0, 2);
  await postBooking(user, { eventId: event.id, seatIds });

  const { rows } = await testPool.query('SELECT status FROM seats WHERE id = ANY($1)', [seatIds]);
  assert.deepEqual(
    rows.map((r) => r.status),
    ['HELD', 'HELD'],
  );
});

test('expiresAt cách thời điểm tạo booking từ 9 phút 50 giây đến 10 phút 10 giây', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  const res = await postBooking(user, { eventId: event.id, seatIds: [vip.seatIds[0]] });

  const { rows } = await testPool.query('SELECT created_at FROM bookings WHERE id = $1', [
    res.body.data.id,
  ]);
  const diffMs = new Date(res.body.data.expiresAt).getTime() - rows[0].created_at.getTime();
  assert.ok(
    diffMs >= 9 * MINUTE_MS + 50 * SECOND_MS && diffMs <= 10 * MINUTE_MS + 10 * SECOND_MS,
    `diffMs = ${diffMs}`,
  );
});

test('giữ ghế đã BOOKED thì nhận 409 SEAT_NOT_AVAILABLE', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  await testPool.query(`UPDATE seats SET status = 'BOOKED' WHERE id = $1`, [vip.seatIds[0]]);

  const res = await postBooking(user, { eventId: event.id, seatIds: [vip.seatIds[0]] });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'SEAT_NOT_AVAILABLE' },
  );
});

test('giữ ghế đã BOOKED thì DB không có booking mới', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  await testPool.query(`UPDATE seats SET status = 'BOOKED' WHERE id = $1`, [vip.seatIds[0]]);

  await postBooking(user, { eventId: event.id, seatIds: [vip.seatIds[0]] });
  assert.equal(await countBookings(), 0);
});

test('ghế HELD có held_until trong quá khứ thì giữ được (201)', async () => {
  const { organizer, user, event, vip } = await userWithSeededEvent();
  await testPool.query(
    `UPDATE seats SET status = 'HELD', held_by = $2, held_until = now() - interval '1 minute'
     WHERE id = $1`,
    [vip.seatIds[0], organizer.id],
  );

  const res = await postBooking(user, { eventId: event.id, seatIds: [vip.seatIds[0]] });
  assert.equal(res.status, 201);
});

test('seatIds có một ghế của event khác thì nhận 400 INVALID_SEATS', async () => {
  const { organizer, user, event, vip } = await userWithSeededEvent();
  const other = await createSeededEvent(organizer.id);

  const res = await postBooking(user, {
    eventId: event.id,
    seatIds: [vip.seatIds[0], other.vip.seatIds[0]],
  });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 400, code: 'INVALID_SEATS' },
  );
});

test('event đã bắt đầu thì nhận 409 EVENT_ALREADY_STARTED', async () => {
  const { user, event, vip } = await userWithSeededEvent();
  await testPool.query(`UPDATE events SET start_time = now() - interval '1 hour' WHERE id = $1`, [
    event.id,
  ]);

  const res = await postBooking(user, { eventId: event.id, seatIds: [vip.seatIds[0]] });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'EVENT_ALREADY_STARTED' },
  );
});

test('chưa đăng nhập thì nhận 401', async () => {
  const { event, vip } = await userWithSeededEvent();
  const res = await request(app)
    .post('/api/v1/bookings')
    .send({ eventId: event.id, seatIds: [vip.seatIds[0]] });
  assert.equal(res.status, 401);
});

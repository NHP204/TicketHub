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

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

// Hai user thường và một sự kiện PUBLISHED như seed P01.
async function setup() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const userA = await createUser();
  const userB = await createUser();
  const seeded = await createSeededEvent(organizer.id);
  return { userA, userB, ...seeded };
}

async function hold(user, eventId, seatIds) {
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(user))
    .send({ eventId, seatIds });
  assert.equal(res.status, 201);
  return res.body.data;
}

function cancel(user, bookingId) {
  return request(app)
    .post(`/api/v1/bookings/${bookingId}/cancel`)
    .set('Authorization', bearer(user));
}

test('hủy booking PENDING của mình thì nhận 200, status CANCELLED và ghế về AVAILABLE', async () => {
  const { userA, event, vip } = await setup();
  const seatIds = vip.seatIds.slice(0, 2);
  const booking = await hold(userA, event.id, seatIds);

  const res = await cancel(userA, booking.id);

  const { rows } = await testPool.query('SELECT status FROM seats WHERE id = ANY($1)', [seatIds]);
  assert.deepEqual(
    {
      status: res.status,
      bookingStatus: res.body.data?.status,
      seats: rows.map((r) => r.status),
    },
    { status: 200, bookingStatus: 'CANCELLED', seats: ['AVAILABLE', 'AVAILABLE'] },
  );
});

test('sau khi A hủy, user B giữ được chính các ghế đó (201)', async () => {
  const { userA, userB, event, vip } = await setup();
  const seatIds = vip.seatIds.slice(0, 2);
  const booking = await hold(userA, event.id, seatIds);
  await cancel(userA, booking.id);

  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(userB))
    .send({ eventId: event.id, seatIds });
  assert.equal(res.status, 201);
});

test('user B hủy booking của user A thì nhận 404 BOOKING_NOT_FOUND', async () => {
  const { userA, userB, event, vip } = await setup();
  const booking = await hold(userA, event.id, [vip.seatIds[0]]);

  const res = await cancel(userB, booking.id);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 404, code: 'BOOKING_NOT_FOUND' },
  );
});

test('hủy booking đã CANCELLED thì nhận 409 BOOKING_NOT_PENDING', async () => {
  const { userA, event, vip } = await setup();
  const booking = await hold(userA, event.id, [vip.seatIds[0]]);
  await cancel(userA, booking.id);

  const res = await cancel(userA, booking.id);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'BOOKING_NOT_PENDING' },
  );
});

test('GET /bookings/me với 3 booking trả 3 item, item đầu là booking tạo sau cùng', async () => {
  const { userA, event, vip } = await setup();
  await hold(userA, event.id, [vip.seatIds[0]]);
  await hold(userA, event.id, [vip.seatIds[1]]);
  const last = await hold(userA, event.id, [vip.seatIds[2]]);

  const res = await request(app).get('/api/v1/bookings/me').set('Authorization', bearer(userA));
  assert.deepEqual(
    { count: res.body.data?.length, firstId: res.body.data?.[0]?.id },
    { count: 3, firstId: last.id },
  );
});

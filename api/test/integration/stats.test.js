import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createEvent, createSeededEvent, createUser, tokenFor } from '../helpers/factories.js';

const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

async function hold(user, eventId, seatIds) {
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(user))
    .send({ eventId, seatIds });
  assert.equal(res.status, 201);
  return res.body.data;
}

// Sự kiện như seed (VIP 2×5 giá 500000, Thường 5×10 giá 200000, sức chứa 60).
// User1 mua 2 VIP + 3 Thường (PAID); User2 giữ 1 Thường (PENDING).
async function setup() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const user1 = await createUser();
  const user2 = await createUser();
  const { event, vip, regular } = await createSeededEvent(organizer.id);

  const booking = await hold(user1, event.id, [
    vip.seatIds[0],
    vip.seatIds[1],
    regular.seatIds[0],
    regular.seatIds[1],
    regular.seatIds[2],
  ]);
  const paid = await request(app)
    .post(`/api/v1/bookings/${booking.id}/pay`)
    .set('Authorization', bearer(user1));
  assert.equal(paid.status, 200);
  await hold(user2, event.id, [regular.seatIds[3]]);

  return { organizer, event };
}

function getOrganizerStats(user) {
  return request(app).get('/api/v1/organizer/stats').set('Authorization', bearer(user));
}

function getEventStats(user, eventId) {
  return request(app)
    .get(`/api/v1/organizer/events/${eventId}/stats`)
    .set('Authorization', bearer(user));
}

test('GET /organizer/stats: revenue 1600000, ticketsSold 5, capacity 60, fillRate 8.3', async () => {
  const { organizer, event } = await setup();

  const res = await getOrganizerStats(organizer);

  const stats = res.body.data.find((s) => s.eventId === event.id);
  assert.deepEqual(
    {
      status: res.status,
      revenue: stats.revenue,
      ticketsSold: stats.ticketsSold,
      capacity: stats.capacity,
      fillRate: stats.fillRate,
    },
    { status: 200, revenue: 1600000, ticketsSold: 5, capacity: 60, fillRate: 8.3 },
  );
});

test('GET /organizer/events/:id/stats: VIP sold 2, revenue 1000000, fillRate 20', async () => {
  const { organizer, event } = await setup();

  const res = await getEventStats(organizer, event.id);

  const vip = res.body.data.sections.find((s) => s.name === 'VIP');
  assert.deepEqual(
    { status: res.status, sold: vip.sold, revenue: vip.revenue, fillRate: vip.fillRate },
    { status: 200, sold: 2, revenue: 1000000, fillRate: 20 },
  );
});

test('GET /organizer/events/:id/stats: Thường sold 3, held 1, revenue 600000, fillRate 6', async () => {
  const { organizer, event } = await setup();

  const res = await getEventStats(organizer, event.id);

  const regular = res.body.data.sections.find((s) => s.name === 'Thường');
  assert.deepEqual(
    {
      status: res.status,
      sold: regular.sold,
      held: regular.held,
      revenue: regular.revenue,
      fillRate: regular.fillRate,
    },
    { status: 200, sold: 3, held: 1, revenue: 600000, fillRate: 6 },
  );
});

test('GET /organizer/stats: event chưa bán vé vẫn có mặt với revenue 0', async () => {
  const { organizer } = await setup();
  const unsold = await createEvent(organizer.id);

  const res = await getOrganizerStats(organizer);

  const stats = res.body.data.find((s) => s.eventId === unsold.id);
  assert.deepEqual({ status: res.status, revenue: stats?.revenue }, { status: 200, revenue: 0 });
});

test('GET /organizer/events/:id/stats của organizer khác → 403 NOT_EVENT_OWNER', async () => {
  const { event } = await setup();
  const otherOrganizer = await createUser({ role: 'ORGANIZER' });

  const res = await getEventStats(otherOrganizer, event.id);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 403, code: 'NOT_EVENT_OWNER' },
  );
});

test('GET /admin/stats: usersByRole.USER bằng 2', async () => {
  await setup();
  const admin = await createUser({ role: 'ADMIN' });

  const res = await request(app).get('/api/v1/admin/stats').set('Authorization', bearer(admin));
  assert.deepEqual(
    { status: res.status, users: res.body.data.usersByRole.USER },
    { status: 200, users: 2 },
  );
});

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

function holdSeats(user, eventId, seatIds) {
  return request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(user))
    .send({ eventId, seatIds });
}

const newEvent = {
  title: 'Hòa nhạc mùa thu',
  description: 'Đêm nhạc ngoài trời',
  venue: 'Nhà hát Lớn',
  startTime: '2030-01-10T12:00:00.000Z',
  endTime: '2030-01-10T15:00:00.000Z',
};

test('ORGANIZER giữ ghế (POST /bookings) bị từ chối 403 FORBIDDEN', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const { event, vip } = await createSeededEvent(organizer.id);

  const res = await holdSeats(organizer, event.id, [vip.seatIds[0]]);

  assert.deepEqual([res.status, res.body.error.code], [403, 'FORBIDDEN']);
});

test('ADMIN giữ ghế (POST /bookings) bị từ chối 403 FORBIDDEN', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const admin = await createUser({ role: 'ADMIN' });
  const { event, vip } = await createSeededEvent(organizer.id);

  const res = await holdSeats(admin, event.id, [vip.seatIds[0]]);

  assert.deepEqual([res.status, res.body.error.code], [403, 'FORBIDDEN']);
});

test('ORGANIZER xem vé của tôi (GET /tickets/me) bị từ chối 403', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });

  const res = await request(app).get('/api/v1/tickets/me').set('Authorization', bearer(organizer));

  assert.equal(res.status, 403);
});

test('USER tạo sự kiện (POST /events) bị từ chối 403', async () => {
  const user = await createUser();

  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', bearer(user))
    .send(newEvent);

  assert.equal(res.status, 403);
});

test('ADMIN tạo sự kiện (POST /events) bị từ chối 403', async () => {
  const admin = await createUser({ role: 'ADMIN' });

  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', bearer(admin))
    .send(newEvent);

  assert.equal(res.status, 403);
});

test('ORGANIZER xem danh sách user (GET /admin/users) bị từ chối 403', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });

  const res = await request(app).get('/api/v1/admin/users').set('Authorization', bearer(organizer));

  assert.equal(res.status, 403);
});

test('USER xem thống kê organizer (GET /organizer/stats) bị từ chối 403', async () => {
  const user = await createUser();

  const res = await request(app).get('/api/v1/organizer/stats').set('Authorization', bearer(user));

  assert.equal(res.status, 403);
});

test('ADMIN xem chi tiết booking của một USER (GET /bookings/:id) được 200', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const user = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const { event, vip } = await createSeededEvent(organizer.id);
  const held = await holdSeats(user, event.id, [vip.seatIds[0]]);
  assert.equal(held.status, 201);

  const res = await request(app)
    .get(`/api/v1/bookings/${held.body.data.id}`)
    .set('Authorization', bearer(admin));

  assert.deepEqual([res.status, res.body.data.id], [200, held.body.data.id]);
});

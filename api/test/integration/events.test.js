import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createEvent, createUser, tokenFor } from '../helpers/factories.js';

const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

const validEvent = {
  title: 'Đêm nhạc Jazz',
  description: 'Mô tả',
  venue: 'Nhà hát lớn',
  startTime: '2099-01-01T12:00:00.000Z',
  endTime: '2099-01-01T15:00:00.000Z',
};

test('user role USER tạo sự kiện thì nhận 403', async () => {
  const user = await createUser({ role: 'USER' });
  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', bearer(user))
    .send(validEvent);
  assert.equal(res.status, 403);
});

test('12 PUBLISHED + 3 DRAFT, limit=5 page=3 trả 2 item, total 12, totalPages 3', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  for (let i = 0; i < 12; i += 1) await createEvent(organizer.id, { status: 'PUBLISHED' });
  for (let i = 0; i < 3; i += 1) await createEvent(organizer.id, { status: 'DRAFT' });

  const res = await request(app).get('/api/v1/events?limit=5&page=3');
  assert.deepEqual(
    { count: res.body.data.length, total: res.body.meta.total, pages: res.body.meta.totalPages },
    { count: 2, total: 12, pages: 3 },
  );
});

test('q=jazz chỉ trả sự kiện có "Jazz" trong title hoặc venue, không phân biệt hoa thường', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  await createEvent(organizer.id, { status: 'PUBLISHED', title: 'Đêm JAZZ mùa thu' });
  await createEvent(organizer.id, {
    status: 'PUBLISHED',
    title: 'Acoustic cuối tuần',
    venue: 'Jazz Club Sài Gòn',
  });
  await createEvent(organizer.id, { status: 'PUBLISHED', title: 'Hòa nhạc Rock' });

  const res = await request(app).get('/api/v1/events?q=jazz');
  assert.deepEqual(res.body.data.map((e) => e.title).sort(), [
    'Acoustic cuối tuần',
    'Đêm JAZZ mùa thu',
  ]);
});

test('q=% không trả về tất cả sự kiện vì % được escape', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  await createEvent(organizer.id, { status: 'PUBLISHED', title: 'Giảm 50% vé' });
  await createEvent(organizer.id, { status: 'PUBLISHED', title: 'Hòa nhạc' });
  await createEvent(organizer.id, { status: 'PUBLISHED', title: 'Kịch nói' });

  const res = await request(app).get('/api/v1/events').query({ q: '%' });
  assert.deepEqual(
    res.body.data.map((e) => e.title),
    ['Giảm 50% vé'],
  );
});

test('sort=password_hash thì nhận 400', async () => {
  const res = await request(app).get('/api/v1/events?sort=password_hash');
  assert.equal(res.status, 400);
});

test('người lạ xem sự kiện DRAFT thì nhận 404', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const stranger = await createUser({ role: 'USER' });
  const event = await createEvent(organizer.id, { status: 'DRAFT' });
  const res = await request(app)
    .get(`/api/v1/events/${event.id}`)
    .set('Authorization', bearer(stranger));
  assert.equal(res.status, 404);
});

test('chủ sự kiện xem sự kiện DRAFT của mình thì nhận 200', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(organizer.id, { status: 'DRAFT' });
  const res = await request(app)
    .get(`/api/v1/events/${event.id}`)
    .set('Authorization', bearer(organizer));
  assert.equal(res.status, 200);
});

test('khách chưa đăng nhập xem sự kiện DRAFT thì nhận 404 EVENT_NOT_FOUND', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(organizer.id, { status: 'DRAFT' });
  const res = await request(app).get(`/api/v1/events/${event.id}`);
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 404, code: 'EVENT_NOT_FOUND' },
  );
});

test('organizer tạo sự kiện thì nhận 201 và sự kiện ở trạng thái DRAFT', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', bearer(organizer))
    .send(validEvent);
  assert.deepEqual(
    { status: res.status, state: res.body.data.status },
    { status: 201, state: 'DRAFT' },
  );
});

test('tạo sự kiện có endTime trước startTime thì nhận 400 VALIDATION_ERROR', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', bearer(organizer))
    .send({ ...validEvent, endTime: '2099-01-01T11:00:00.000Z' });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 400, code: 'VALIDATION_ERROR' },
  );
});

test('organizer khác PATCH sự kiện thì nhận 403 NOT_EVENT_OWNER', async () => {
  const owner = await createUser({ role: 'ORGANIZER' });
  const other = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(owner.id);
  const res = await request(app)
    .patch(`/api/v1/events/${event.id}`)
    .set('Authorization', bearer(other))
    .send({ title: 'Tên mới' });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 403, code: 'NOT_EVENT_OWNER' },
  );
});

test('GET /organizer/events trả mọi sự kiện của chính organizer, mọi trạng thái', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const other = await createUser({ role: 'ORGANIZER' });
  await createEvent(organizer.id, { status: 'DRAFT' });
  await createEvent(organizer.id, { status: 'PUBLISHED' });
  await createEvent(organizer.id, { status: 'CANCELLED' });
  await createEvent(other.id, { status: 'PUBLISHED' });

  const res = await request(app)
    .get('/api/v1/organizer/events')
    .set('Authorization', bearer(organizer));
  assert.deepEqual(res.body.data.map((e) => e.status).sort(), ['CANCELLED', 'DRAFT', 'PUBLISHED']);
});

test('publish sự kiện chưa có section qua API thì nhận 409 EVENT_HAS_NO_SECTIONS', async () => {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(organizer.id);
  const res = await request(app)
    .post(`/api/v1/events/${event.id}/publish`)
    .set('Authorization', bearer(organizer));
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 409, code: 'EVENT_HAS_NO_SECTIONS' },
  );
});

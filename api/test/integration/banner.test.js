import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createEvent, createUser, tokenFor } from '../helpers/factories.js';

// NODE_ENV=test nên container dùng FakeStorage.
const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

// Ảnh PNG 1×1 px.
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function organizerWithEvent() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(organizer.id);
  return { organizer, event };
}

function postBanner(organizer, eventId, buffer, { filename, contentType }) {
  return request(app)
    .post(`/api/v1/events/${eventId}/banner`)
    .set('Authorization', `Bearer ${tokenFor(organizer, env.JWT_ACCESS_SECRET)}`)
    .attach('banner', buffer, { filename, contentType });
}

test('upload PNG nhỏ thì nhận 200', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postBanner(organizer, event.id, tinyPng, {
    filename: 'banner.png',
    contentType: 'image/png',
  });
  assert.equal(res.status, 200);
});

test('upload PNG nhỏ thì bannerUrl lưu trong DB bắt đầu bằng memory://events/', async () => {
  const { organizer, event } = await organizerWithEvent();
  await postBanner(organizer, event.id, tinyPng, {
    filename: 'banner.png',
    contentType: 'image/png',
  });

  const { rows } = await testPool.query('SELECT banner_url FROM events WHERE id = $1', [event.id]);
  assert.ok(
    rows[0].banner_url.startsWith('memory://events/'),
    `banner_url = ${rows[0].banner_url}`,
  );
});

test('upload file text/plain thì nhận 400 INVALID_FILE_TYPE', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postBanner(organizer, event.id, Buffer.from('xin chào'), {
    filename: 'note.txt',
    contentType: 'text/plain',
  });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 400, code: 'INVALID_FILE_TYPE' },
  );
});

test('upload buffer 3 MB thì nhận 400 FILE_TOO_LARGE', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postBanner(organizer, event.id, Buffer.alloc(3 * 1024 * 1024), {
    filename: 'big.png',
    contentType: 'image/png',
  });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 400, code: 'FILE_TOO_LARGE' },
  );
});

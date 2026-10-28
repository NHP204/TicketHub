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

const vipSection = { name: 'VIP', price: 500000, rowCount: 10, seatsPerRow: 20 };

// Organizer và một sự kiện DRAFT của họ.
async function organizerWithEvent() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const event = await createEvent(organizer.id);
  return { organizer, event };
}

function postSection(organizer, eventId, body) {
  return request(app)
    .post(`/api/v1/events/${eventId}/sections`)
    .set('Authorization', bearer(organizer))
    .send(body);
}

test('tạo section 10 hàng × 20 ghế thì DB có đúng 200 ghế của section đó', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postSection(organizer, event.id, vipSection);

  const { rows } = await testPool.query(
    'SELECT COUNT(*) AS total FROM seats WHERE section_id = $1',
    [res.body.data.id],
  );
  assert.equal(Number(rows[0].total), 200);
});

test('tạo section 10 hàng × 20 ghế thì ghế đầu là A1, ghế cuối là J20', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postSection(organizer, event.id, vipSection);

  const { rows } = await testPool.query(
    `SELECT row_label, seat_number FROM seats
     WHERE section_id = $1
     ORDER BY row_label, seat_number`,
    [res.body.data.id],
  );
  assert.deepEqual(
    [rows[0], rows[rows.length - 1]],
    [
      { row_label: 'A', seat_number: 1 },
      { row_label: 'J', seat_number: 20 },
    ],
  );
});

test('tạo section trùng tên trong cùng sự kiện thì nhận 409 SECTION_NAME_TAKEN', async () => {
  const { organizer, event } = await organizerWithEvent();
  await postSection(organizer, event.id, vipSection);

  const res = await postSection(organizer, event.id, { ...vipSection, price: 100000 });
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'SECTION_NAME_TAKEN' },
  );
});

test('tạo section với rowCount 27 thì nhận 400', async () => {
  const { organizer, event } = await organizerWithEvent();
  const res = await postSection(organizer, event.id, { ...vipSection, rowCount: 27 });
  assert.equal(res.status, 400);
});

test('xóa section có 1 ghế BOOKED thì nhận 409 SECTION_HAS_BOOKINGS', async () => {
  const { organizer, event } = await organizerWithEvent();
  const created = await postSection(organizer, event.id, vipSection);
  const sectionId = created.body.data.id;
  await testPool.query(
    `UPDATE seats SET status = 'BOOKED'
     WHERE section_id = $1 AND row_label = 'A' AND seat_number = 1`,
    [sectionId],
  );

  const res = await request(app)
    .delete(`/api/v1/sections/${sectionId}`)
    .set('Authorization', bearer(organizer));
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 409, code: 'SECTION_HAS_BOOKINGS' },
  );
});

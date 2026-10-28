import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { testPool, resetDb, closeDb } from '../helpers/db.js';

beforeEach(resetDb);
after(closeDb);

async function insertUser() {
  const { rows } = await testPool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ('organizer@test.dev', 'hash', 'Organizer', 'ORGANIZER')
     RETURNING id`,
  );
  return rows[0].id;
}

async function insertEvent(organizerId) {
  const { rows } = await testPool.query(
    `INSERT INTO events (organizer_id, title, description, venue, start_time, end_time)
     VALUES ($1, 'Event', 'Mô tả', 'Venue', '2030-01-01T10:00:00Z', '2030-01-01T13:00:00Z')
     RETURNING id`,
    [organizerId],
  );
  return rows[0].id;
}

async function insertSection(eventId) {
  const { rows } = await testPool.query(
    `INSERT INTO sections (event_id, name, price, row_count, seats_per_row)
     VALUES ($1, 'VIP', 500000, 2, 5)
     RETURNING id`,
    [eventId],
  );
  return rows[0].id;
}

async function insertSeat(eventId, sectionId) {
  const { rows } = await testPool.query(
    `INSERT INTO seats (event_id, section_id, row_label, seat_number)
     VALUES ($1, $2, 'A', 1)
     RETURNING id`,
    [eventId, sectionId],
  );
  return rows[0].id;
}

test('insert 2 ghế trùng (section, hàng, số) thì lỗi unique 23505', async () => {
  const eventId = await insertEvent(await insertUser());
  const sectionId = await insertSection(eventId);
  await insertSeat(eventId, sectionId);
  await assert.rejects(insertSeat(eventId, sectionId), { code: '23505' });
});

test('insert section có price = -1 thì lỗi check 23514', async () => {
  const eventId = await insertEvent(await insertUser());
  await assert.rejects(
    testPool.query(
      `INSERT INTO sections (event_id, name, price, row_count, seats_per_row)
       VALUES ($1, 'Rẻ', -1, 1, 1)`,
      [eventId],
    ),
    { code: '23514' },
  );
});

test('update ghế sang HELD mà không có held_until thì lỗi check 23514', async () => {
  const eventId = await insertEvent(await insertUser());
  const seatId = await insertSeat(eventId, await insertSection(eventId));
  await assert.rejects(testPool.query(`UPDATE seats SET status = 'HELD' WHERE id = $1`, [seatId]), {
    code: '23514',
  });
});

test('insert event có end_time trước start_time thì lỗi check 23514', async () => {
  const organizerId = await insertUser();
  await assert.rejects(
    testPool.query(
      `INSERT INTO events (organizer_id, title, description, venue, start_time, end_time)
       VALUES ($1, 'Event', 'Mô tả', 'Venue', '2030-01-01T13:00:00Z', '2030-01-01T10:00:00Z')`,
      [organizerId],
    ),
    { code: '23514' },
  );
});

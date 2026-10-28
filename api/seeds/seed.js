import bcrypt from 'bcrypt';
import { createPool, withTransaction } from '../src/config/db.js';

const PASSWORD = 'Password123!';

const USERS = [
  { email: 'admin@tickethub.dev', fullName: 'Admin', role: 'ADMIN' },
  { email: 'organizer@tickethub.dev', fullName: 'Organizer', role: 'ORGANIZER' },
  { email: 'user1@tickethub.dev', fullName: 'User One', role: 'USER' },
  { email: 'user2@tickethub.dev', fullName: 'User Two', role: 'USER' },
];

const SECTIONS = [
  { name: 'VIP', price: 500000, rowCount: 2, seatsPerRow: 5 },
  { name: 'Thường', price: 200000, rowCount: 5, seatsPerRow: 10 },
];

async function seed(client) {
  await client.query(`
    TRUNCATE users, refresh_tokens, events, sections, seats,
      bookings, booking_items, tickets, payments
    RESTART IDENTITY CASCADE
  `);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userIds = {};
  for (const user of USERS) {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user.email, passwordHash, user.fullName, user.role],
    );
    userIds[user.role] = rows[0].id;
  }

  const { rows: eventRows } = await client.query(
    `INSERT INTO events (organizer_id, title, description, venue, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, now() + interval '30 days', now() + interval '30 days 3 hours',
       'PUBLISHED')
     RETURNING id`,
    [
      userIds.ORGANIZER,
      'TicketHub Live Concert',
      'Đêm nhạc mẫu dùng cho môi trường dev.',
      'Nhà hát Hòa Bình, TP.HCM',
    ],
  );
  const eventId = eventRows[0].id;

  for (const section of SECTIONS) {
    await client.query(
      `INSERT INTO sections (event_id, name, price, row_count, seats_per_row)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, section.name, section.price, section.rowCount, section.seatsPerRow],
    );
  }

  // Hàng 1 → 'A' (chr(65)), hàng 2 → 'B', ...
  const { rowCount: seatCount } = await client.query(
    `INSERT INTO seats (event_id, section_id, row_label, seat_number)
     SELECT s.event_id, s.id, chr(64 + r), n
     FROM sections s
     CROSS JOIN LATERAL generate_series(1, s.row_count) AS r
     CROSS JOIN LATERAL generate_series(1, s.seats_per_row) AS n
     WHERE s.event_id = $1`,
    [eventId],
  );

  return { users: USERS.length, seats: seatCount };
}

const pool = createPool(process.env.DATABASE_URL);
try {
  const result = await withTransaction(pool, seed);
  console.log(`Seed xong: ${result.users} user, 1 sự kiện, ${result.seats} ghế.`);
} finally {
  await pool.end();
}

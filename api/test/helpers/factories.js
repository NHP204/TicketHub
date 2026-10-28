import { signAccessToken } from '../../src/utils/jwt.js';
import { testPool } from './db.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

let sequence = 0;

function nextNumber() {
  sequence += 1;
  return sequence;
}

// Ghi thẳng vào DB; password_hash là chuỗi giả vì test sự kiện không đăng nhập bằng mật khẩu.
export async function createUser({ role = 'USER', email } = {}) {
  const n = nextNumber();
  const { rows } = await testPool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, 'not-a-real-hash', $2, $3)
     RETURNING id, email, role`,
    [email ?? `user${n}@mail.com`, `Người Dùng ${n}`, role],
  );
  return rows[0];
}

export function tokenFor(user, secret) {
  return signAccessToken({ sub: user.id, role: user.role }, secret);
}

// Mặc định: DRAFT, bắt đầu sau 30 ngày, kéo dài 3 giờ.
export async function createEvent(organizerId, overrides = {}) {
  const n = nextNumber();
  const startTime = overrides.startTime ?? new Date(Date.now() + 30 * DAY_MS).toISOString();
  const endTime =
    overrides.endTime ?? new Date(new Date(startTime).getTime() + 3 * HOUR_MS).toISOString();
  const { rows } = await testPool.query(
    `INSERT INTO events (organizer_id, title, description, venue, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      organizerId,
      overrides.title ?? `Sự kiện ${n}`,
      overrides.description ?? 'Mô tả sự kiện',
      overrides.venue ?? `Địa điểm ${n}`,
      startTime,
      endTime,
      overrides.status ?? 'DRAFT',
    ],
  );
  return rows[0];
}

// Section và ghế của nó; ghế sinh như SeatRepo: hàng A, B, ...; số 1..seatsPerRow.
// Trả về id section và id ghế theo thứ tự hàng, số.
export async function createSection(eventId, { name, price, rowCount, seatsPerRow }) {
  const { rows } = await testPool.query(
    `INSERT INTO sections (event_id, name, price, row_count, seats_per_row)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [eventId, name, price, rowCount, seatsPerRow],
  );
  const sectionId = rows[0].id;
  const seats = await testPool.query(
    `INSERT INTO seats (event_id, section_id, row_label, seat_number)
     SELECT $1, $2, chr(64 + r), s
     FROM generate_series(1, $3::int) AS r, generate_series(1, $4::int) AS s
     RETURNING id, row_label, seat_number`,
    [eventId, sectionId, rowCount, seatsPerRow],
  );
  const seatIds = seats.rows
    .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
    .map((s) => s.id);
  return { id: sectionId, seatIds };
}

// Như seed P01: sự kiện PUBLISHED, VIP 2 × 5 ghế giá 500000, Thường 5 × 10 ghế giá 200000.
export async function createSeededEvent(organizerId, overrides = {}) {
  const event = await createEvent(organizerId, { status: 'PUBLISHED', ...overrides });
  const vip = await createSection(event.id, {
    name: 'VIP',
    price: 500000,
    rowCount: 2,
    seatsPerRow: 5,
  });
  const regular = await createSection(event.id, {
    name: 'Thường',
    price: 200000,
    rowCount: 5,
    seatsPerRow: 10,
  });
  return { event, vip, regular };
}

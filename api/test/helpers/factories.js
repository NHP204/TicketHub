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

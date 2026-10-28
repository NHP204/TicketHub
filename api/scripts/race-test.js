// Race test trên API thật: 50 user ảo cùng POST /bookings một ghế.
// Cần DB dev đã seed (`npm run seed`) và API đang chạy (`npm run dev`).
// Kết quả đúng: 1 × 201, 49 × 409, 0 lỗi khác.
// Script tạo user tạm trong DB dev và dọn sạch (user, booking, trạng thái ghế) khi kết thúc.
import { loadEnv } from '../src/config/env.js';
import { createPool } from '../src/config/db.js';
import { signAccessToken } from '../src/utils/jwt.js';

const USER_COUNT = 50;

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const baseUrl = `http://localhost:${env.PORT}/api/v1`;
const runId = Date.now();

// Sự kiện PUBLISHED chưa bắt đầu và một ghế đang trống của nó.
async function findTarget() {
  const { rows } = await pool.query(
    `SELECT s.event_id, s.id AS seat_id
     FROM seats s
     JOIN events e ON e.id = s.event_id
     WHERE e.status = 'PUBLISHED' AND e.start_time > now()
       AND (s.status = 'AVAILABLE' OR (s.status = 'HELD' AND s.held_until < now()))
     ORDER BY e.created_at, s.id
     LIMIT 1`,
  );
  if (!rows[0]) throw new Error('Không có ghế trống nào. Chạy `npm run seed` trước.');
  return { eventId: rows[0].event_id, seatId: rows[0].seat_id };
}

// User tạm không đăng nhập bằng mật khẩu: token ký trực tiếp, nên password_hash là chuỗi giả.
async function createUsers() {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name)
     SELECT 'race-' || $1 || '-' || i || '@tickethub.dev', 'not-a-real-hash', 'Race User ' || i
     FROM generate_series(1, $2::int) AS i
     RETURNING id, role`,
    [String(runId), USER_COUNT],
  );
  return rows;
}

// booking_items bị xóa theo bookings (ON DELETE CASCADE).
async function cleanup(userIds, seatId) {
  await pool.query(`DELETE FROM bookings WHERE user_id = ANY($1)`, [userIds]);
  await pool.query(
    `UPDATE seats SET status = 'AVAILABLE', held_by = NULL, held_until = NULL, updated_at = now()
     WHERE id = $1 AND held_by = ANY($2)`,
    [seatId, userIds],
  );
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
}

async function postBooking(user, body) {
  const token = signAccessToken({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET);
  try {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.status;
  } catch {
    return 'NETWORK_ERROR';
  }
}

let users = [];
let target;
try {
  target = await findTarget();
  users = await createUsers();

  const statuses = await Promise.all(
    users.map((user) => postBooking(user, { eventId: target.eventId, seatIds: [target.seatId] })),
  );

  const created = statuses.filter((s) => s === 201).length;
  const conflicts = statuses.filter((s) => s === 409).length;
  const others = statuses.length - created - conflicts;

  console.log(`${USER_COUNT} user cùng giữ ghế ${target.seatId}:`);
  console.table([{ '201 Created': created, '409 Conflict': conflicts, 'Lỗi khác': others }]);
  if (others > 0) {
    console.log(
      'Mã lỗi khác:',
      statuses.filter((s) => s !== 201 && s !== 409),
    );
  }

  const passed = created === 1 && conflicts === USER_COUNT - 1 && others === 0;
  console.log(passed ? 'ĐÚNG: 1 / 49 / 0' : 'SAI: kết quả mong đợi là 1 / 49 / 0');
  process.exitCode = passed ? 0 : 1;
} finally {
  if (users.length > 0) {
    await cleanup(
      users.map((u) => u.id),
      target.seatId,
    );
  }
  await pool.end();
}

const COLUMNS = `id, user_id, event_id, status, total_amount, expires_at, created_at, updated_at`;

function toBooking(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    totalAmount: row.total_amount,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Event cần cho việc giữ ghế. started so bằng now() của PostgreSQL, cùng đồng hồ với held_until.
// FOR SHARE: nhiều booking đọc song song được, nhưng cancel event (FOR UPDATE) phải chờ.
export async function findEventForHold(db, eventId) {
  const { rows } = await db.query(
    `SELECT id, status, start_time <= now() AS started
     FROM events WHERE id = $1
     FOR SHARE`,
    [eventId],
  );
  return rows[0] ?? null;
}

// Booking mới luôn ở trạng thái PENDING (mặc định của cột status).
export async function create(db, { userId, eventId, totalAmount, expiresAt }) {
  const { rows } = await db.query(
    `INSERT INTO bookings (user_id, event_id, total_amount, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [userId, eventId, totalAmount, expiresAt],
  );
  return toBooking(rows[0]);
}

// items = [{ seatId, price }]; chèn tất cả bằng một câu lệnh.
export async function createItems(db, bookingId, items) {
  await db.query(
    `INSERT INTO booking_items (booking_id, seat_id, price)
     SELECT $1, seat_id, price
     FROM unnest($2::uuid[], $3::int[]) AS t (seat_id, price)`,
    [bookingId, items.map((i) => i.seatId), items.map((i) => i.price)],
  );
}

// Một câu lệnh: booking PENDING quá expires_at → EXPIRED, rồi trả các ghế HELD của chúng về
// AVAILABLE. Chỉ trả ghế còn đang giữ cho chính booking đó (held_by là chủ booking và
// held_until không sau expires_at), để không cướp ghế người khác đã giữ lại sau khi hết hạn.
// Ghế BOOKED và booking PAID không khớp điều kiện nên không bị đụng.
export async function expireAndReleaseSeats(db) {
  const { rows } = await db.query(
    `WITH expired AS (
       UPDATE bookings
       SET status = 'EXPIRED', updated_at = now()
       WHERE status = 'PENDING' AND expires_at < now()
       RETURNING id, user_id, expires_at
     ), released AS (
       UPDATE seats s
       SET status = 'AVAILABLE', held_by = NULL, held_until = NULL, updated_at = now()
       FROM expired e
       JOIN booking_items bi ON bi.booking_id = e.id
       WHERE s.id = bi.seat_id
         AND s.status = 'HELD'
         AND s.held_by = e.user_id
         AND s.held_until <= e.expires_at
       RETURNING s.id
     )
     SELECT (SELECT COUNT(*) FROM expired) AS bookings,
            (SELECT COUNT(*) FROM released) AS seats`,
  );
  return { bookings: Number(rows[0].bookings), seats: Number(rows[0].seats) };
}

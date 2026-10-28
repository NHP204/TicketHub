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

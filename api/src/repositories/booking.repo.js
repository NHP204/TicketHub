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
// held_until lưu tới micro giây, còn expires_at được ghi lại từ Date của JS (mili giây),
// nên phải cắt held_until về mili giây trước khi so.
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
         AND date_trunc('milliseconds', s.held_until) <= e.expires_at
       RETURNING s.id
     )
     SELECT (SELECT COUNT(*) FROM expired) AS bookings,
            (SELECT COUNT(*) FROM released) AS seats`,
  );
  return { bookings: Number(rows[0].bookings), seats: Number(rows[0].seats) };
}

export async function findById(db, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM bookings WHERE id = $1`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

// Khóa dòng đến hết transaction: hủy không chen ngang với job hết hạn hay thanh toán.
export async function findByIdForUpdate(db, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

// Booking của user, mới tạo trước; status null = mọi trạng thái.
// Thêm id vào ORDER BY để thứ tự ổn định giữa các trang.
export async function findByUser(db, userId, { status, limit, offset }) {
  const filterValues = [userId, status ?? null];
  const where = `user_id = $1 AND ($2::text IS NULL OR status = $2)`;

  const { rows } = await db.query(
    `SELECT ${COLUMNS}, COUNT(*) OVER () AS total_count
     FROM bookings
     WHERE ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [...filterValues, limit, offset],
  );
  // Trang vượt quá dữ liệu → không có dòng nào mang total_count, phải đếm riêng.
  const total = rows[0]
    ? Number(rows[0].total_count)
    : Number(
        (await db.query(`SELECT COUNT(*) AS total FROM bookings WHERE ${where}`, filterValues))
          .rows[0].total,
      );
  return { bookings: rows.map(toBooking), total };
}

// Ghế của booking, cùng dạng items lúc giữ ghế. price là giá tại thời điểm giữ.
export async function findItems(db, bookingId) {
  const { rows } = await db.query(
    `SELECT bi.seat_id, sec.name, s.row_label, s.seat_number, bi.price
     FROM booking_items bi
     JOIN seats s ON s.id = bi.seat_id
     JOIN sections sec ON sec.id = s.section_id
     WHERE bi.booking_id = $1
     ORDER BY sec.price DESC, sec.name, s.row_label, s.seat_number`,
    [bookingId],
  );
  return rows.map((row) => ({
    seatId: row.seat_id,
    section: row.name,
    row: row.row_label,
    number: row.seat_number,
    price: row.price,
  }));
}

export async function updateStatus(db, id, status) {
  const { rows } = await db.query(
    `UPDATE bookings SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, status],
  );
  return toBooking(rows[0]);
}

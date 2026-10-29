// Sinh toàn bộ ghế của section bằng một câu lệnh: hàng 1..rowCount → nhãn A, B, ...;
// số ghế 1..seatsPerRow. Trả về số ghế đã tạo.
export async function generateForSection(db, { eventId, sectionId, rowCount, seatsPerRow }) {
  const result = await db.query(
    `INSERT INTO seats (event_id, section_id, row_label, seat_number)
     SELECT $1, $2, chr(64 + r), s
     FROM generate_series(1, $3::int) AS r, generate_series(1, $4::int) AS s`,
    [eventId, sectionId, rowCount, seatsPerRow],
  );
  return result.rowCount;
}

// Sơ đồ ghế của event: section theo giá giảm dần, hàng theo nhãn, ghế theo số.
// Ghế HELD đã quá held_until trả về AVAILABLE. Không lấy held_by.
export async function findSeatMap(db, eventId) {
  const { rows } = await db.query(
    `SELECT sec.id AS section_id, sec.name, sec.price,
            s.id, s.row_label, s.seat_number,
            CASE WHEN s.status = 'HELD' AND s.held_until < now() THEN 'AVAILABLE'
                 ELSE s.status END AS status
     FROM sections sec
     JOIN seats s ON s.section_id = sec.id
     WHERE sec.event_id = $1
     ORDER BY sec.price DESC, sec.name, sec.id, s.row_label, s.seat_number`,
    [eventId],
  );

  // Gom dòng phẳng thành section → rows → seats; dòng đã đúng thứ tự nên chỉ cần so với phần tử cuối.
  const sections = [];
  for (const row of rows) {
    let section = sections.at(-1);
    if (section?.id !== row.section_id) {
      section = { id: row.section_id, name: row.name, price: row.price, rows: [] };
      sections.push(section);
    }
    let seatRow = section.rows.at(-1);
    if (seatRow?.label !== row.row_label) {
      seatRow = { label: row.row_label, seats: [] };
      section.rows.push(seatRow);
    }
    seatRow.seats.push({ id: row.id, number: row.seat_number, status: row.status });
  }
  return sections;
}

// Ghế HELD hoặc BOOKED của section (HELD tính cả khi đã quá held_until).
export async function countHeldOrBooked(db, sectionId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total FROM seats
     WHERE section_id = $1 AND status IN ('HELD', 'BOOKED')`,
    [sectionId],
  );
  return Number(rows[0].total);
}

function toHoldSeat(row) {
  return {
    id: row.id,
    sectionId: row.section_id,
    section: row.name,
    row: row.row_label,
    number: row.seat_number,
    price: row.price,
    status: row.status,
    available: row.available,
  };
}

// Khóa các ghế của event đến hết transaction. ORDER BY s.id bắt buộc: mọi transaction khóa
// theo cùng một thứ tự nên không deadlock. Id sai hoặc ghế của event khác không có trong kết quả.
// available tính bằng now() của PostgreSQL: AVAILABLE, hoặc HELD đã quá held_until.
export async function findForHold(db, eventId, seatIds) {
  const { rows } = await db.query(
    `SELECT s.*, sec.name, sec.price,
            (s.status = 'AVAILABLE' OR (s.status = 'HELD' AND s.held_until < now())) AS available
     FROM seats s
     JOIN sections sec ON sec.id = s.section_id
     WHERE s.id = ANY($1) AND s.event_id = $2
     ORDER BY s.id
     FOR UPDATE OF s`,
    [seatIds, eventId],
  );
  return rows.map(toHoldSeat);
}

// Chuyển ghế sang HELD đến now() + holdMinutes. now() cố định trong transaction nên mọi ghế
// có cùng held_until; trả về giá trị đó.
export async function hold(db, seatIds, userId, holdMinutes) {
  const { rows } = await db.query(
    `UPDATE seats
     SET status = 'HELD', held_by = $2, held_until = now() + make_interval(mins => $3),
         updated_at = now()
     WHERE id = ANY($1)
     RETURNING held_until`,
    [seatIds, userId, holdMinutes],
  );
  return rows[0].held_until;
}

// Trả các ghế HELD của booking về AVAILABLE. Như job hết hạn: chỉ ghế còn giữ cho chính booking
// này (held_by là chủ booking, held_until không sau expires_at). held_until cắt về mili giây
// vì expires_at chỉ có độ chính xác của Date trong JS. Trả về số ghế đã trả.
export async function releaseForBooking(db, { bookingId, userId, expiresAt }) {
  const result = await db.query(
    `UPDATE seats s
     SET status = 'AVAILABLE', held_by = NULL, held_until = NULL, updated_at = now()
     FROM booking_items bi
     WHERE bi.booking_id = $1
       AND s.id = bi.seat_id
       AND s.status = 'HELD'
       AND s.held_by = $2
       AND date_trunc('milliseconds', s.held_until) <= $3`,
    [bookingId, userId, expiresAt],
  );
  return result.rowCount;
}

// Ghế của booking đã thanh toán → BOOKED, bỏ thông tin giữ ghế. Trả về số ghế đã đổi.
export async function bookForBooking(db, bookingId) {
  const result = await db.query(
    `UPDATE seats s
     SET status = 'BOOKED', held_by = NULL, held_until = NULL, updated_at = now()
     FROM booking_items bi
     WHERE bi.booking_id = $1 AND s.id = bi.seat_id`,
    [bookingId],
  );
  return result.rowCount;
}

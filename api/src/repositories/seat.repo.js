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

// Ghế HELD hoặc BOOKED của section (HELD tính cả khi đã quá held_until).
export async function countHeldOrBooked(db, sectionId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total FROM seats
     WHERE section_id = $1 AND status IN ('HELD', 'BOOKED')`,
    [sectionId],
  );
  return Number(rows[0].total);
}

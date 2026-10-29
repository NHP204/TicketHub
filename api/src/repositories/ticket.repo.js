// tickets = [{ bookingItemId, code, qrData }]; chèn tất cả bằng một câu lệnh.
export async function createMany(db, tickets) {
  await db.query(
    `INSERT INTO tickets (booking_item_id, code, qr_data)
     SELECT booking_item_id, code, qr_data
     FROM unnest($1::uuid[], $2::text[], $3::text[]) AS t (booking_item_id, code, qr_data)`,
    [tickets.map((t) => t.bookingItemId), tickets.map((t) => t.code), tickets.map((t) => t.qrData)],
  );
}

// Vé kèm sự kiện và ghế; chủ vé là chủ booking.
const SELECT_TICKET = `
  SELECT t.code, t.status, t.created_at,
         e.id AS event_id, e.title, e.venue, e.start_time, e.end_time,
         sec.name AS section, s.row_label, s.seat_number`;

const FROM_TICKET = `
  FROM tickets t
  JOIN booking_items bi ON bi.id = t.booking_item_id
  JOIN bookings b ON b.id = bi.booking_id
  JOIN events e ON e.id = b.event_id
  JOIN seats s ON s.id = bi.seat_id
  JOIN sections sec ON sec.id = s.section_id`;

function toTicket(row) {
  return {
    code: row.code,
    status: row.status,
    event: {
      id: row.event_id,
      title: row.title,
      venue: row.venue,
      startTime: row.start_time,
      endTime: row.end_time,
    },
    section: row.section,
    row: row.row_label,
    number: row.seat_number,
    createdAt: row.created_at,
  };
}

// Vé của user, sự kiện sắp diễn ra trước; không lấy qr_data.
export async function findByUser(db, userId) {
  const { rows } = await db.query(
    `${SELECT_TICKET}
     ${FROM_TICKET}
     WHERE b.user_id = $1
     ORDER BY e.start_time, e.id, sec.name, s.row_label, s.seat_number`,
    [userId],
  );
  return rows.map(toTicket);
}

// Trả { userId, ticket }: userId để service kiểm tra chủ vé, ticket kèm qrData.
export async function findByCode(db, code) {
  const { rows } = await db.query(
    `${SELECT_TICKET}, b.user_id, t.qr_data
     ${FROM_TICKET}
     WHERE t.code = $1`,
    [code],
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, ticket: { ...toTicket(rows[0]), qrData: rows[0].qr_data } };
}

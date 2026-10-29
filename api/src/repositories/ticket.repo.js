// tickets = [{ bookingItemId, code, qrData }]; chèn tất cả bằng một câu lệnh.
export async function createMany(db, tickets) {
  await db.query(
    `INSERT INTO tickets (booking_item_id, code, qr_data)
     SELECT booking_item_id, code, qr_data
     FROM unnest($1::uuid[], $2::text[], $3::text[]) AS t (booking_item_id, code, qr_data)`,
    [tickets.map((t) => t.bookingItemId), tickets.map((t) => t.code), tickets.map((t) => t.qrData)],
  );
}

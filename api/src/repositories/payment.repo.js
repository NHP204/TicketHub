function toPayment(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    provider: row.provider,
    amount: row.amount,
    status: row.status,
    transactionRef: row.transaction_ref,
    createdAt: row.created_at,
  };
}

export async function create(db, { bookingId, provider, amount, status, transactionRef }) {
  const { rows } = await db.query(
    `INSERT INTO payments (booking_id, provider, amount, status, transaction_ref)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, provider, amount, status, transaction_ref, created_at`,
    [bookingId, provider, amount, status, transactionRef],
  );
  return toPayment(rows[0]);
}

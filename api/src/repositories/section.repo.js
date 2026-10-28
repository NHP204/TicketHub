const COLUMNS = `id, event_id, name, price, row_count, seats_per_row, created_at, updated_at`;

function toSection(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    price: row.price,
    rowCount: row.row_count,
    seatsPerRow: row.seats_per_row,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(db, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM sections WHERE id = $1`, [id]);
  return rows[0] ? toSection(rows[0]) : null;
}

// Trùng tên trong cùng event → null (ràng buộc sections_event_id_name_key).
export async function create(db, { eventId, name, price, rowCount, seatsPerRow }) {
  const { rows } = await db.query(
    `INSERT INTO sections (event_id, name, price, row_count, seats_per_row)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id, name) DO NOTHING
     RETURNING ${COLUMNS}`,
    [eventId, name, price, rowCount, seatsPerRow],
  );
  return rows[0] ? toSection(rows[0]) : null;
}

// excludeId: bỏ qua chính section đang sửa.
export async function existsByName(db, eventId, name, excludeId = null) {
  const { rows } = await db.query(
    `SELECT 1 FROM sections
     WHERE event_id = $1 AND name = $2 AND ($3::uuid IS NULL OR id <> $3)`,
    [eventId, name, excludeId],
  );
  return rows.length > 0;
}

// Whitelist: tên thuộc tính JS → cột DB. Thuộc tính undefined thì không cập nhật.
const UPDATABLE_COLUMNS = { name: 'name', price: 'price' };

// Section không tồn tại → null.
export async function update(db, id, fields) {
  const sets = [];
  const values = [id];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[key] === undefined) continue;
    values.push(fields[key]);
    sets.push(`${column} = $${values.length}`);
  }
  if (sets.length === 0) return findById(db, id);

  const { rows } = await db.query(
    `UPDATE sections SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    values,
  );
  return rows[0] ? toSection(rows[0]) : null;
}

// Ghế của section bị xóa theo ON DELETE CASCADE.
export async function remove(db, id) {
  await db.query(`DELETE FROM sections WHERE id = $1`, [id]);
}

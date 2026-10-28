const COLUMNS = `id, organizer_id, title, description, venue, start_time, end_time, banner_url,
  status, created_at, updated_at`;

function toEvent(row) {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    title: row.title,
    description: row.description,
    venue: row.venue,
    startTime: row.start_time,
    endTime: row.end_time,
    bannerUrl: row.banner_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(db, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM events WHERE id = $1`, [id]);
  return rows[0] ? toEvent(rows[0]) : null;
}

// Khóa dòng đến hết transaction: tránh sửa/publish chen ngang với cancel.
export async function findByIdForUpdate(db, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM events WHERE id = $1 FOR UPDATE`, [id]);
  return rows[0] ? toEvent(rows[0]) : null;
}

// Sự kiện mới luôn ở trạng thái DRAFT (mặc định của cột status).
export async function create(db, { organizerId, title, description, venue, startTime, endTime }) {
  const { rows } = await db.query(
    `INSERT INTO events (organizer_id, title, description, venue, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [organizerId, title, description, venue, startTime, endTime],
  );
  return toEvent(rows[0]);
}

// Whitelist: tên thuộc tính JS → cột DB. Thuộc tính undefined thì không cập nhật.
const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  venue: 'venue',
  startTime: 'start_time',
  endTime: 'end_time',
};

// Sự kiện không tồn tại → null.
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
    `UPDATE events SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    values,
  );
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function updateStatus(db, id, status) {
  const { rows } = await db.query(
    `UPDATE events SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, status],
  );
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function countSections(db, eventId) {
  const { rows } = await db.query(`SELECT COUNT(*) AS total FROM sections WHERE event_id = $1`, [
    eventId,
  ]);
  return Number(rows[0].total);
}

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

// Whitelist: giá trị sort từ query → cột DB. Không bao giờ đưa input thẳng vào ORDER BY.
const SORT_COLUMNS = { startTime: 'start_time', createdAt: 'created_at', title: 'title' };
const ORDER_DIRECTIONS = { asc: 'ASC', desc: 'DESC' };

// Thoát ký tự đặc biệt của LIKE để input như "%" chỉ khớp chính nó.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Chỉ sự kiện PUBLISHED. q tìm không phân biệt hoa thường trong title và venue;
// from/to lọc theo start_time. Thêm id vào ORDER BY để thứ tự ổn định giữa các trang.
export async function findPublished(db, { q, from, to, sort, order, limit, offset }) {
  const column = SORT_COLUMNS[sort];
  const direction = ORDER_DIRECTIONS[order];
  if (!column || !direction) throw new Error(`Invalid sort: ${sort} ${order}`);

  const pattern = q ? `%${escapeLike(q)}%` : null;
  const filterValues = [pattern, from ?? null, to ?? null];
  const where = `status = 'PUBLISHED'
       AND ($1::text IS NULL OR title ILIKE $1 ESCAPE '\\' OR venue ILIKE $1 ESCAPE '\\')
       AND ($2::timestamptz IS NULL OR start_time >= $2)
       AND ($3::timestamptz IS NULL OR start_time <= $3)`;

  const { rows } = await db.query(
    `SELECT ${COLUMNS}, COUNT(*) OVER () AS total_count
     FROM events
     WHERE ${where}
     ORDER BY ${column} ${direction}, id
     LIMIT $4 OFFSET $5`,
    [...filterValues, limit, offset],
  );
  // Trang vượt quá dữ liệu → không có dòng nào mang total_count, phải đếm riêng.
  const total = rows[0]
    ? Number(rows[0].total_count)
    : Number(
        (await db.query(`SELECT COUNT(*) AS total FROM events WHERE ${where}`, filterValues))
          .rows[0].total,
      );
  return { events: rows.map(toEvent), total };
}

// Mọi trạng thái, sự kiện mới tạo trước.
export async function findByOrganizer(db, organizerId) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM events WHERE organizer_id = $1 ORDER BY created_at DESC, id`,
    [organizerId],
  );
  return rows.map(toEvent);
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

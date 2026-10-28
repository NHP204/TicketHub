const PUBLIC_COLUMNS = 'id, email, full_name, role, is_active, created_at, updated_at';

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(db, id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findByEmail(db, email) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE email = $1`, [email]);
  return rows[0] ? toUser(rows[0]) : null;
}

// Chỉ hai hàm *WithPassword trả về passwordHash — dùng để kiểm tra mật khẩu (đăng nhập, đổi mật khẩu).
export async function findByEmailWithPassword(db, email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  if (!rows[0]) return null;
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function findByIdWithPassword(db, id) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
}

// filter.role không có → lấy mọi role. Sắp xếp mới nhất trước, id để thứ tự ổn định giữa các trang.
export async function findMany(db, { role, limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, COUNT(*) OVER () AS total_count
     FROM users
     WHERE ($1::varchar IS NULL OR role = $1)
     ORDER BY created_at DESC, id
     LIMIT $2 OFFSET $3`,
    [role ?? null, limit, offset],
  );
  const total = rows[0] ? Number(rows[0].total_count) : await countByRole(db, role);
  return { users: rows.map(toUser), total };
}

async function countByRole(db, role) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE ($1::varchar IS NULL OR role = $1)`,
    [role ?? null],
  );
  return Number(rows[0].total);
}

// Whitelist: tên thuộc tính JS → cột DB. Thuộc tính undefined thì không cập nhật.
const UPDATABLE_COLUMNS = { fullName: 'full_name', role: 'role', isActive: 'is_active' };

// User không tồn tại → null.
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
    `UPDATE users SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    values,
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function updatePassword(db, id, passwordHash) {
  await db.query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    id,
    passwordHash,
  ]);
}

// Email đã tồn tại (kể cả khi hai request đăng ký chạy đồng thời) → trả về null.
export async function create(db, { email, passwordHash, fullName, role }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, passwordHash, fullName, role],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

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

// Hàm duy nhất trả về passwordHash — chỉ dùng để kiểm tra mật khẩu khi đăng nhập.
export async function findByEmailWithPassword(db, email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  if (!rows[0]) return null;
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
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

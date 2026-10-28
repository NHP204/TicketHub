const COLUMNS = 'id, user_id, expires_at, revoked_at, replaced_by, created_at';

function toRefreshToken(row) {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedBy: row.replaced_by,
    createdAt: row.created_at,
  };
}

export async function create(db, { userId, tokenHash, expiresAt }) {
  const { rows } = await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [userId, tokenHash, expiresAt],
  );
  return toRefreshToken(rows[0]);
}

// Khóa dòng đến hết transaction để hai request refresh cùng token không cùng thành công.
export async function findByHashForUpdate(db, tokenHash) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
    [tokenHash],
  );
  return rows[0] ? toRefreshToken(rows[0]) : null;
}

export async function revoke(db, id, replacedBy = null) {
  await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = now(), replaced_by = $2, updated_at = now()
     WHERE id = $1`,
    [id, replacedBy],
  );
}

export async function revokeByHash(db, tokenHash) {
  await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = now(), updated_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function revokeAllForUser(db, userId) {
  await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = now(), updated_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_BYTES = 48;

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// payload: { sub: userId, role }
export function signAccessToken(payload, secret) {
  return jwt.sign(payload, secret, { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL });
}

// Ném TokenExpiredError / JsonWebTokenError của jsonwebtoken; middleware authenticate quyết định mã lỗi.
export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
}

// Refresh token là chuỗi ngẫu nhiên, không phải JWT; chỉ gửi cho client, không lưu dạng gốc.
export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

// SHA-256 hex — dạng duy nhất của refresh token được lưu trong DB.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

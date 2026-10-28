import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL = '15m';

// payload: { sub: userId, role }
export function signAccessToken(payload, secret) {
  return jwt.sign(payload, secret, { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL });
}

// Ném TokenExpiredError / JsonWebTokenError của jsonwebtoken; middleware authenticate quyết định mã lỗi.
export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
}

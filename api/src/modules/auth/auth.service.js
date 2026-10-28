import { withTransaction } from '../../config/db.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../errors/app-error.js';

const DEFAULT_ROLE = 'USER';

// Hash bcrypt (cost 10) của một chuỗi ngẫu nhiên không ai biết. Khi email không tồn tại vẫn so
// mật khẩu với hash này để thời gian phản hồi giống trường hợp sai mật khẩu.
const DUMMY_PASSWORD_HASH = '$2b$10$c9Lq4OfcNWPzYKouLtLTi.YwbJCqhIBupMNk4sHMedNqKLvX1S6B.';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function omitPasswordHash({ passwordHash: _passwordHash, ...user }) {
  return user;
}

function invalidCredentials() {
  return new UnauthorizedError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
}

function emailTaken() {
  return new ConflictError('EMAIL_TAKEN', 'Email đã được sử dụng');
}

function accountDisabled() {
  return new ForbiddenError('ACCOUNT_DISABLED', 'Tài khoản đã bị khóa');
}

function invalidRefreshToken() {
  return new UnauthorizedError(
    'INVALID_REFRESH_TOKEN',
    'Refresh token không hợp lệ hoặc đã hết hạn',
  );
}

export class AuthService {
  constructor({ pool, userRepo, refreshTokenRepo, passwordUtil, jwtUtil, accessSecret }) {
    this.pool = pool;
    this.userRepo = userRepo;
    this.refreshTokenRepo = refreshTokenRepo;
    this.passwordUtil = passwordUtil;
    this.jwtUtil = jwtUtil;
    this.accessSecret = accessSecret;
  }

  async register({ email, password, fullName }) {
    const normalizedEmail = normalizeEmail(email);

    const existing = await this.userRepo.findByEmail(this.pool, normalizedEmail);
    if (existing) throw emailTaken();

    const passwordHash = await this.passwordUtil.hashPassword(password);
    const user = await this.userRepo.create(this.pool, {
      email: normalizedEmail,
      passwordHash,
      fullName,
      role: DEFAULT_ROLE,
    });
    // null khi một request khác đăng ký cùng email giữa lúc kiểm tra và lúc insert.
    if (!user) throw emailTaken();
    return user;
  }

  async login({ email, password }) {
    const found = await this.userRepo.findByEmailWithPassword(this.pool, normalizeEmail(email));
    const passwordMatches = await this.passwordUtil.verifyPassword(
      password,
      found ? found.passwordHash : DUMMY_PASSWORD_HASH,
    );
    if (!found || !passwordMatches) throw invalidCredentials();

    // Chỉ báo tài khoản bị khóa sau khi mật khẩu đúng, để không lộ trạng thái cho người đoán mò.
    const user = omitPasswordHash(found);
    if (!user.isActive) throw accountDisabled();

    const refreshToken = await this.issueRefreshToken(this.pool, user.id);
    return { user, accessToken: this.signAccessToken(user), refreshToken: refreshToken.token };
  }

  // Xoay vòng: token cũ bị thu hồi và trỏ replaced_by sang token mới, tất cả trong một transaction.
  async refresh(token) {
    if (!token) throw invalidRefreshToken();
    const tokenHash = this.jwtUtil.hashToken(token);

    const result = await withTransaction(this.pool, async (client) => {
      const current = await this.refreshTokenRepo.findByHashForUpdate(client, tokenHash);
      if (!current) throw invalidRefreshToken();

      // Token đã thu hồi mà vẫn được gửi lên → coi như bị đánh cắp, thu hồi cả phiên của user.
      // Trả về thay vì ném lỗi để transaction COMMIT việc thu hồi rồi mới báo lỗi.
      if (current.revokedAt) {
        await this.refreshTokenRepo.revokeAllForUser(client, current.userId);
        return { reused: true };
      }
      if (current.expiresAt <= new Date()) throw invalidRefreshToken();

      const user = await this.userRepo.findById(client, current.userId);
      if (!user) throw invalidRefreshToken();
      if (!user.isActive) throw accountDisabled();

      const next = await this.issueRefreshToken(client, user.id);
      await this.refreshTokenRepo.revoke(client, current.id, next.id);
      return { user, accessToken: this.signAccessToken(user), refreshToken: next.token };
    });

    if (result.reused) {
      throw new UnauthorizedError('TOKEN_REUSED', 'Refresh token đã được sử dụng');
    }
    return result;
  }

  // Không có token hoặc token đã thu hồi vẫn coi là đăng xuất thành công.
  async logout(token) {
    if (!token) return;
    await this.refreshTokenRepo.revokeByHash(this.pool, this.jwtUtil.hashToken(token));
  }

  signAccessToken(user) {
    return this.jwtUtil.signAccessToken({ sub: user.id, role: user.role }, this.accessSecret);
  }

  async issueRefreshToken(db, userId) {
    const token = this.jwtUtil.generateRefreshToken();
    const saved = await this.refreshTokenRepo.create(db, {
      userId,
      tokenHash: this.jwtUtil.hashToken(token),
      expiresAt: new Date(Date.now() + this.jwtUtil.REFRESH_TOKEN_TTL_MS),
    });
    return { id: saved.id, token };
  }
}

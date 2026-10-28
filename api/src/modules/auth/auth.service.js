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

export class AuthService {
  constructor({ pool, userRepo, passwordUtil, jwtUtil, accessSecret }) {
    this.pool = pool;
    this.userRepo = userRepo;
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
    if (!user.isActive) throw new ForbiddenError('ACCOUNT_DISABLED', 'Tài khoản đã bị khóa');

    const accessToken = this.jwtUtil.signAccessToken(
      { sub: user.id, role: user.role },
      this.accessSecret,
    );
    return { user, accessToken };
  }
}

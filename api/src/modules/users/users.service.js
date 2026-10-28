import { withTransaction } from '../../config/db.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../errors/app-error.js';

export class UsersService {
  constructor({ pool, userRepo, refreshTokenRepo, passwordUtil }) {
    this.pool = pool;
    this.userRepo = userRepo;
    this.refreshTokenRepo = refreshTokenRepo;
    this.passwordUtil = passwordUtil;
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(this.pool, userId);
    if (!user) throw new NotFoundError();
    return user;
  }

  // Đổi mật khẩu thành công → thu hồi mọi refresh token, các thiết bị khác phải đăng nhập lại.
  async updateMe(userId, { fullName, currentPassword, newPassword }) {
    const found = await this.userRepo.findByIdWithPassword(this.pool, userId);
    if (!found) throw new NotFoundError();

    let newPasswordHash;
    if (newPassword !== undefined) {
      const matches = await this.passwordUtil.verifyPassword(currentPassword, found.passwordHash);
      if (!matches) {
        throw new UnauthorizedError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng');
      }
      newPasswordHash = await this.passwordUtil.hashPassword(newPassword);
    }

    return withTransaction(this.pool, async (client) => {
      const user = await this.userRepo.update(client, userId, { fullName });
      if (newPasswordHash) {
        await this.userRepo.updatePassword(client, userId, newPasswordHash);
        await this.refreshTokenRepo.revokeAllForUser(client, userId);
      }
      return user;
    });
  }

  async listUsers({ page, limit, role }) {
    const { users, total } = await this.userRepo.findMany(this.pool, {
      role,
      limit,
      offset: (page - 1) * limit,
    });
    return { users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // Khóa tài khoản → thu hồi luôn refresh token để user không giữ được phiên.
  async updateUser(actorId, userId, { role, isActive }) {
    if (actorId === userId) {
      throw new ConflictError(
        'CANNOT_MODIFY_SELF',
        'Admin không được tự sửa role hoặc khóa chính mình',
      );
    }

    return withTransaction(this.pool, async (client) => {
      const user = await this.userRepo.update(client, userId, { role, isActive });
      if (!user) throw new NotFoundError();
      if (isActive === false) await this.refreshTokenRepo.revokeAllForUser(client, userId);
      return user;
    });
  }
}

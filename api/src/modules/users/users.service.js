import { NotFoundError } from '../../errors/app-error.js';

export class UsersService {
  constructor({ pool, userRepo }) {
    this.pool = pool;
    this.userRepo = userRepo;
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(this.pool, userId);
    if (!user) throw new NotFoundError();
    return user;
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../src/modules/auth/auth.service.js';

// Repo giả lưu user trong mảng, ghi lại tham số của mỗi lần create().
function createFakeUserRepo(initialUsers = []) {
  const users = [...initialUsers];
  const createCalls = [];
  const withoutHash = ({ passwordHash: _passwordHash, ...user }) => user;
  return {
    createCalls,
    async findById(_db, id) {
      const user = users.find((u) => u.id === id);
      return user ? withoutHash(user) : null;
    },
    async findByEmail(_db, email) {
      const user = users.find((u) => u.email === email);
      return user ? withoutHash(user) : null;
    },
    async findByEmailWithPassword(_db, email) {
      const user = users.find((u) => u.email === email);
      return user ? { ...user } : null;
    },
    async create(_db, data) {
      createCalls.push(data);
      const user = { id: `user-${users.length + 1}`, isActive: true, ...data };
      users.push(user);
      return withoutHash(user);
    },
  };
}

// passwordUtil giả: "hash" là chuỗi có tiền tố, so khớp bằng so sánh chuỗi.
const fakePasswordUtil = {
  async hashPassword(plain) {
    return `hashed:${plain}`;
  },
  async verifyPassword(plain, hash) {
    return hash === `hashed:${plain}`;
  },
};

const fakeJwtUtil = {
  signAccessToken(payload) {
    return `token-for-${payload.sub}`;
  },
};

function existingUser(overrides = {}) {
  return {
    id: 'user-existing',
    email: 'an@mail.com',
    passwordHash: 'hashed:Secret123',
    fullName: 'Nguyễn An',
    role: 'USER',
    isActive: true,
    ...overrides,
  };
}

function createService(userRepo) {
  return new AuthService({
    pool: {},
    userRepo,
    passwordUtil: fakePasswordUtil,
    jwtUtil: fakeJwtUtil,
    accessSecret: 'test-secret',
  });
}

const validRegistration = { email: 'an@mail.com', password: 'Secret123', fullName: 'Nguyễn An' };

test('register trim và chuyển email về chữ thường trước khi gửi xuống repo', async () => {
  const repo = createFakeUserRepo();
  await createService(repo).register({ ...validRegistration, email: '  An@Mail.com ' });
  assert.equal(repo.createCalls[0].email, 'an@mail.com');
});

test('register email đã tồn tại thì ném lỗi EMAIL_TAKEN', async () => {
  const repo = createFakeUserRepo([existingUser()]);
  await assert.rejects(createService(repo).register(validRegistration), { code: 'EMAIL_TAKEN' });
});

test('register truyền role ADMIN thì user tạo ra vẫn có role USER', async () => {
  const repo = createFakeUserRepo();
  const user = await createService(repo).register({ ...validRegistration, role: 'ADMIN' });
  assert.equal(user.role, 'USER');
});

test('login email không tồn tại và login sai mật khẩu ném lỗi cùng code và message', async () => {
  const service = createService(createFakeUserRepo([existingUser()]));
  const unknownEmailError = await service
    .login({ email: 'khong-co@mail.com', password: 'Secret123' })
    .catch((err) => err);
  const wrongPasswordError = await service
    .login({ email: 'an@mail.com', password: 'WrongPass1' })
    .catch((err) => err);
  assert.deepEqual(
    { code: wrongPasswordError.code, message: wrongPasswordError.message },
    { code: unknownEmailError.code, message: unknownEmailError.message },
  );
});

test('login user bị khóa thì ném lỗi ACCOUNT_DISABLED', async () => {
  const service = createService(createFakeUserRepo([existingUser({ isActive: false })]));
  await assert.rejects(service.login({ email: 'an@mail.com', password: 'Secret123' }), {
    code: 'ACCOUNT_DISABLED',
  });
});

test('kết quả register không có thuộc tính passwordHash', async () => {
  const user = await createService(createFakeUserRepo()).register(validRegistration);
  assert.equal(Object.hasOwn(user, 'passwordHash'), false);
});

import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';

const env = loadEnv();

function buildApp(options = {}) {
  const { logger, routers } = buildContainer({ env, pool: testPool, ...options });
  return createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });
}

const app = buildApp();

beforeEach(resetDb);
after(closeDb);

const PASSWORD = 'Secret123';

async function createUser(email, role = 'USER') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: PASSWORD, fullName: 'Người Dùng' });
  if (role !== 'USER') {
    await testPool.query('UPDATE users SET role = $2 WHERE id = $1', [res.body.data.id, role]);
  }
  return res.body.data;
}

function login(email, password = PASSWORD) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

async function tokenFor(email) {
  const res = await login(email);
  return res.body.data.accessToken;
}

test('user thường gọi GET /admin/users trả 403', async () => {
  await createUser('an@mail.com');
  const res = await request(app)
    .get('/api/v1/admin/users')
    .set('Authorization', `Bearer ${await tokenFor('an@mail.com')}`);
  assert.equal(res.status, 403);
});

test('admin khóa user thì user đó login nhận 403 ACCOUNT_DISABLED', async () => {
  await createUser('admin@mail.com', 'ADMIN');
  const user = await createUser('an@mail.com');
  await request(app)
    .patch(`/api/v1/admin/users/${user.id}`)
    .set('Authorization', `Bearer ${await tokenFor('admin@mail.com')}`)
    .send({ isActive: false });
  const res = await login('an@mail.com');
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 403, code: 'ACCOUNT_DISABLED' },
  );
});

test('admin tự PATCH chính mình isActive false trả 409 CANNOT_MODIFY_SELF', async () => {
  const admin = await createUser('admin@mail.com', 'ADMIN');
  const res = await request(app)
    .patch(`/api/v1/admin/users/${admin.id}`)
    .set('Authorization', `Bearer ${await tokenFor('admin@mail.com')}`)
    .send({ isActive: false });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 409, code: 'CANNOT_MODIFY_SELF' },
  );
});

test('đổi mật khẩu với currentPassword sai trả 401 INVALID_CREDENTIALS', async () => {
  await createUser('an@mail.com');
  const res = await request(app)
    .patch('/api/v1/users/me')
    .set('Authorization', `Bearer ${await tokenFor('an@mail.com')}`)
    .send({ currentPassword: 'WrongPass1', newPassword: 'NewSecret456' });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 401, code: 'INVALID_CREDENTIALS' },
  );
});

test('login sai 6 lần liên tiếp từ cùng IP thì lần thứ 6 nhận 429 TOO_MANY_REQUESTS', async () => {
  const limitedApp = buildApp({ rateLimitEnabled: true });
  const attempt = () =>
    request(limitedApp)
      .post('/api/v1/auth/login')
      .send({ email: 'an@mail.com', password: 'WrongPass1' });
  for (let i = 0; i < 5; i += 1) await attempt();
  const res = await attempt();
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 429, code: 'TOO_MANY_REQUESTS' },
  );
});

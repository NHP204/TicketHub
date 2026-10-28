import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';

const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

const validUser = { email: 'an@mail.com', password: 'Secret123', fullName: 'Nguyễn An' };

function register(body = validUser) {
  return request(app).post('/api/v1/auth/register').send(body);
}

function login(body) {
  return request(app).post('/api/v1/auth/login').send(body);
}

test('register hợp lệ trả 201', async () => {
  const res = await register();
  assert.equal(res.status, 201);
});

test('register hợp lệ thì response không chứa passwordHash ở bất kỳ đâu', async () => {
  const res = await register();
  assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
});

test('register mật khẩu 12345678 (không có chữ) trả 400 VALIDATION_ERROR', async () => {
  const res = await register({ ...validUser, password: '12345678' });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 400, code: 'VALIDATION_ERROR' },
  );
});

test('register trùng email trả 409 EMAIL_TAKEN', async () => {
  await register();
  const res = await register();
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 409, code: 'EMAIL_TAKEN' },
  );
});

test('login đúng trả 200 và có accessToken', async () => {
  await register();
  const res = await login({ email: validUser.email, password: validUser.password });
  assert.deepEqual(
    { status: res.status, hasToken: typeof res.body.data.accessToken },
    { status: 200, hasToken: 'string' },
  );
});

test('dùng accessToken từ login gọi /users/me trả 200 và đúng email', async () => {
  await register();
  const loginRes = await login({ email: validUser.email, password: validUser.password });
  const res = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
  assert.deepEqual(
    { status: res.status, email: res.body.data.email },
    { status: 200, email: 'an@mail.com' },
  );
});

test('login sai mật khẩu trả 401 INVALID_CREDENTIALS', async () => {
  await register();
  const res = await login({ email: validUser.email, password: 'WrongPass1' });
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 401, code: 'INVALID_CREDENTIALS' },
  );
});

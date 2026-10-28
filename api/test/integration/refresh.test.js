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

function findRefreshCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refresh_token='));
}

// "refresh_token=<giá trị>; Path=...; HttpOnly" → "refresh_token=<giá trị>"
function cookiePair(res) {
  return findRefreshCookie(res).split(';')[0];
}

async function registerAndLogin() {
  await request(app).post('/api/v1/auth/register').send(validUser);
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email: validUser.email, password: validUser.password });
}

function refresh(cookie) {
  return request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
}

test('login đặt cookie refresh_token có HttpOnly', async () => {
  const res = await registerAndLogin();
  assert.match(findRefreshCookie(res), /;\s*HttpOnly/i);
});

test('refresh bằng cookie từ login trả 200 và cookie mới khác cookie cũ', async () => {
  const oldCookie = cookiePair(await registerAndLogin());
  const res = await refresh(oldCookie);
  assert.deepEqual(
    { status: res.status, changed: cookiePair(res) !== oldCookie },
    { status: 200, changed: true },
  );
});

test('refresh lại bằng cookie đã xoay vòng trả 401 TOKEN_REUSED', async () => {
  const oldCookie = cookiePair(await registerAndLogin());
  await refresh(oldCookie);
  const res = await refresh(oldCookie);
  assert.deepEqual(
    { status: res.status, code: res.body.error.code },
    { status: 401, code: 'TOKEN_REUSED' },
  );
});

test('sau khi phát hiện dùng lại token, cookie mới cũng bị từ chối 401', async () => {
  const oldCookie = cookiePair(await registerAndLogin());
  const newCookie = cookiePair(await refresh(oldCookie));
  await refresh(oldCookie);
  const res = await refresh(newCookie);
  assert.equal(res.status, 401);
});

test('logout trả 204', async () => {
  const cookie = cookiePair(await registerAndLogin());
  const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
  assert.equal(res.status, 204);
});

test('refresh bằng cookie đã logout trả 401', async () => {
  const cookie = cookiePair(await registerAndLogin());
  await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
  const res = await refresh(cookie);
  assert.equal(res.status, 401);
});

test('DB không lưu refresh token gốc ở bất kỳ cột nào', async () => {
  const rawToken = cookiePair(await registerAndLogin()).slice('refresh_token='.length);
  const { rows } = await testPool.query(
    'SELECT row_to_json(t)::text AS json FROM refresh_tokens t',
  );
  assert.deepEqual(
    { rowCount: rows.length, containsRaw: rows.some((r) => r.json.includes(rawToken)) },
    { rowCount: 1, containsRaw: false },
  );
});

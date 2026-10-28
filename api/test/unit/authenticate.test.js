import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middlewares/authenticate.js';
import * as jwtUtil from '../../src/utils/jwt.js';

const SECRET = 'unit-test-access-secret-at-least-32-chars';
const OTHER_SECRET = 'another-secret-that-is-also-32-chars-long';

// Chạy middleware với header Authorization cho trước, trả về req và lỗi next nhận được.
function run(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  let error;
  authenticate(jwtUtil, SECRET)(req, {}, (err) => {
    error = err;
  });
  return { req, error };
}

test('thiếu header Authorization thì trả 401 UNAUTHORIZED', () => {
  const { error } = run(undefined);
  assert.deepEqual(
    { status: error.status, code: error.code },
    { status: 401, code: 'UNAUTHORIZED' },
  );
});

test('token ký bằng secret khác thì trả 401 UNAUTHORIZED', () => {
  const token = jwtUtil.signAccessToken({ sub: 'user-1', role: 'USER' }, OTHER_SECRET);
  const { error } = run(`Bearer ${token}`);
  assert.deepEqual(
    { status: error.status, code: error.code },
    { status: 401, code: 'UNAUTHORIZED' },
  );
});

test('token hết hạn thì trả 401 TOKEN_EXPIRED', () => {
  const token = jwt.sign({ sub: 'user-1', role: 'USER' }, SECRET, { expiresIn: -1 });
  const { error } = run(`Bearer ${token}`);
  assert.deepEqual(
    { status: error.status, code: error.code },
    { status: 401, code: 'TOKEN_EXPIRED' },
  );
});

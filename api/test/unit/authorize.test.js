import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../../src/middlewares/authorize.js';

// Chạy middleware với req giả, trả về đối số mà next() nhận được.
function run(middleware, req) {
  let nextArg = 'next-not-called';
  middleware(req, {}, (arg) => {
    nextArg = arg;
  });
  return nextArg;
}

test("authorize('ADMIN') với role USER thì next nhận lỗi 403 FORBIDDEN", () => {
  const err = run(authorize('ADMIN'), { user: { id: 'u1', role: 'USER' } });
  assert.deepEqual({ status: err.status, code: err.code }, { status: 403, code: 'FORBIDDEN' });
});

test("authorize('ORGANIZER', 'ADMIN') với role ADMIN thì next được gọi không có lỗi", () => {
  const arg = run(authorize('ORGANIZER', 'ADMIN'), { user: { id: 'u1', role: 'ADMIN' } });
  assert.equal(arg, undefined);
});

test('authorize khi chưa có req.user thì next nhận lỗi 401', () => {
  const err = run(authorize('ADMIN'), {});
  assert.equal(err.status, 401);
});

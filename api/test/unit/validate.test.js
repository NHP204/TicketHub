import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from '../../src/middlewares/validate.js';
import { ValidationError } from '../../src/errors/app-error.js';

const bodySchema = z.object({
  email: z.string(),
  quantity: z.coerce.number().int(),
});

// next giả: ghi lại danh sách tham số của từng lần gọi.
function createNext() {
  const calls = [];
  const next = (...args) => {
    calls.push(args);
  };
  return { calls, next };
}

function run(body) {
  const req = { body, query: {}, params: {} };
  const { calls, next } = createNext();
  validate({ body: bodySchema })(req, {}, next);
  return { req, calls };
}

test('body hợp lệ thì gọi next() không có tham số', () => {
  const { calls } = run({ email: 'a@example.com', quantity: '2' });
  assert.deepEqual(calls, [[]]);
});

test('body hợp lệ thì req.validated.body là dữ liệu đã parse', () => {
  const { req } = run({ email: 'a@example.com', quantity: '2' });
  assert.deepEqual(req.validated.body, { email: 'a@example.com', quantity: 2 });
});

test('body thiếu trường bắt buộc thì next nhận ValidationError status 400', () => {
  const { calls } = run({ quantity: 2 });
  const err = calls[0][0];
  assert.ok(err instanceof ValidationError);
  assert.equal(err.status, 400);
});

test('body thiếu trường bắt buộc thì details[0].path là tên trường bị thiếu', () => {
  const { calls } = run({ quantity: 2 });
  assert.equal(calls[0][0].details[0].path, 'email');
});

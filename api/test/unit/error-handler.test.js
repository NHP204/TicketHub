import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { ConflictError } from '../../src/errors/app-error.js';

// res giả: ghi lại status và body; logger giả: ghi lại các lần gọi error().
function createRes() {
  return {
    headersSent: false,
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function run(err) {
  const logged = [];
  const logger = { error: (...args) => logged.push(args) };
  const req = { method: 'GET', originalUrl: '/x' };
  const res = createRes();
  errorHandler(logger)(err, req, res, () => {});
  return { res, logged };
}

test('ConflictError có code riêng thì trả status 409', () => {
  const { res } = run(new ConflictError('SEAT_NOT_AVAILABLE', 'x', ['a']));
  assert.equal(res.statusCode, 409);
});

test('ConflictError có code riêng thì body chứa code, message, details', () => {
  const { res } = run(new ConflictError('SEAT_NOT_AVAILABLE', 'x', ['a']));
  assert.deepEqual(res.body, {
    success: false,
    error: { code: 'SEAT_NOT_AVAILABLE', message: 'x', details: ['a'] },
  });
});

test('Error thường thì trả status 500', () => {
  const { res } = run(new Error('boom'));
  assert.equal(res.statusCode, 500);
});

test('Error thường thì code là INTERNAL_ERROR', () => {
  const { res } = run(new Error('boom'));
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});

test('Error thường thì message không lộ nội dung lỗi gốc', () => {
  const { res } = run(new Error('boom'));
  assert.ok(!res.body.error.message.includes('boom'));
});

test('Error thường thì được ghi log bằng logger.error', () => {
  const { logged } = run(new Error('boom'));
  assert.equal(logged.length, 1);
});

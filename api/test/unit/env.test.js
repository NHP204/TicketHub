import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../../src/config/env.js';

const validEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/tickethub',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

test('loadEnv với đủ biến hợp lệ và không truyền PORT thì PORT là number 4000', () => {
  const env = loadEnv(validEnv);
  assert.equal(env.PORT, 4000);
});

test('loadEnv thiếu DATABASE_URL thì ném lỗi có nhắc DATABASE_URL', () => {
  const withoutDb = { ...validEnv };
  delete withoutDb.DATABASE_URL;
  assert.throws(() => loadEnv(withoutDb), /DATABASE_URL/);
});

test('loadEnv với JWT_ACCESS_SECRET dài 10 ký tự thì ném lỗi', () => {
  assert.throws(() => loadEnv({ ...validEnv, JWT_ACCESS_SECRET: 'x'.repeat(10) }));
});

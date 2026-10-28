import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTransaction } from '../../src/config/db.js';

// Pool giả: client ghi lại từng câu query và số lần release().
function createFakePool() {
  const client = {
    queries: [],
    releaseCount: 0,
    async query(sql) {
      this.queries.push(sql);
    },
    release() {
      this.releaseCount += 1;
    },
  };
  return { client, pool: { connect: async () => client } };
}

test('fn thành công thì các query theo thứ tự là BEGIN, COMMIT', async () => {
  const { client, pool } = createFakePool();
  await withTransaction(pool, async () => 'ok');
  assert.deepEqual(client.queries, ['BEGIN', 'COMMIT']);
});

test('fn thành công thì trả về giá trị của fn', async () => {
  const { pool } = createFakePool();
  const value = { id: 1 };
  const result = await withTransaction(pool, async () => value);
  assert.equal(result, value);
});

test('fn ném lỗi thì các query là BEGIN, ROLLBACK', async () => {
  const { client, pool } = createFakePool();
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('boom');
    }),
  );
  assert.deepEqual(client.queries, ['BEGIN', 'ROLLBACK']);
});

test('fn ném lỗi thì ném lại chính lỗi gốc', async () => {
  const { pool } = createFakePool();
  const originalError = new Error('boom');
  await assert.rejects(
    withTransaction(pool, async () => {
      throw originalError;
    }),
    (err) => err === originalError,
  );
});

test('fn thành công thì gọi release đúng 1 lần', async () => {
  const { client, pool } = createFakePool();
  await withTransaction(pool, async () => 'ok');
  assert.equal(client.releaseCount, 1);
});

test('fn ném lỗi thì gọi release đúng 1 lần', async () => {
  const { client, pool } = createFakePool();
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('boom');
    }),
  );
  assert.equal(client.releaseCount, 1);
});

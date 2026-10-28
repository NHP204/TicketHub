import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp({ corsOrigin: 'http://localhost:5173' });

test('GET /api/v1/health trả status 200', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.status, 200);
});

test('GET /api/v1/health trả body { success: true, data: { status: "ok" } }', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.deepEqual(res.body, { success: true, data: { status: 'ok' } });
});

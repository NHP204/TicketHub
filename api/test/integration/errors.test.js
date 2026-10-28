import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/utils/logger.js';

const app = createApp({ corsOrigin: 'http://localhost:5173', logger: createLogger('test') });

test('GET route không tồn tại trả status 404', async () => {
  const res = await request(app).get('/api/v1/khong-ton-tai');
  assert.equal(res.status, 404);
});

test('GET route không tồn tại trả code ROUTE_NOT_FOUND', async () => {
  const res = await request(app).get('/api/v1/khong-ton-tai');
  assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
});

test('POST body JSON hỏng trả status 400', async () => {
  const res = await request(app)
    .post('/api/v1/health')
    .set('Content-Type', 'application/json')
    .send('{bad json');
  assert.equal(res.status, 400);
});

test('POST body JSON hỏng trả code INVALID_JSON', async () => {
  const res = await request(app)
    .post('/api/v1/health')
    .set('Content-Type', 'application/json')
    .send('{bad json');
  assert.equal(res.body.error.code, 'INVALID_JSON');
});

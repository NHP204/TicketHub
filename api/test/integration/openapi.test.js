import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { parse } from 'yaml';
import { createApp } from '../../src/app.js';

const spec = parse(readFileSync(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8'));

// Mọi route đã đăng ký (path tương đối với /api/v1, tham số viết kiểu OpenAPI).
// Thêm route mới vào router thì phải thêm vào đây và vào openapi.yaml.
const ROUTES = [
  ['get', '/health'],
  ['post', '/auth/register'],
  ['post', '/auth/login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['get', '/users/me'],
  ['patch', '/users/me'],
  ['get', '/admin/users'],
  ['patch', '/admin/users/{id}'],
  ['get', '/events'],
  ['post', '/events'],
  ['get', '/events/{id}'],
  ['patch', '/events/{id}'],
  ['get', '/events/{id}/seats'],
  ['post', '/events/{id}/publish'],
  ['post', '/events/{id}/cancel'],
  ['post', '/events/{id}/banner'],
  ['get', '/organizer/events'],
  ['post', '/events/{id}/sections'],
  ['patch', '/sections/{id}'],
  ['delete', '/sections/{id}'],
  ['post', '/bookings'],
  ['get', '/bookings/me'],
  ['get', '/bookings/{id}'],
  ['post', '/bookings/{id}/cancel'],
  ['post', '/bookings/{id}/pay'],
  ['get', '/tickets/me'],
  ['get', '/tickets/{code}'],
  ['get', '/organizer/stats'],
  ['get', '/organizer/events/{id}/stats'],
  ['get', '/admin/stats'],
];

test('GET /api-docs/ trả trang HTML của Swagger UI', async () => {
  const res = await request(createApp()).get('/api-docs/');

  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('openapi.yaml mô tả mọi route đã đăng ký', () => {
  const missing = ROUTES.filter(([method, path]) => !spec.paths[path]?.[method]).map(
    ([method, path]) => `${method.toUpperCase()} ${path}`,
  );

  assert.deepEqual(missing, []);
});

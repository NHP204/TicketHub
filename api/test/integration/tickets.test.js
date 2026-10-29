import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { testPool, resetDb, closeDb } from '../helpers/db.js';
import { createSeededEvent, createUser, tokenFor } from '../helpers/factories.js';

const env = loadEnv();
const { logger, routers } = buildContainer({ env, pool: testPool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

beforeEach(resetDb);
after(closeDb);

function bearer(user) {
  return `Bearer ${tokenFor(user, env.JWT_ACCESS_SECRET)}`;
}

// Chủ vé giữ 1 ghế VIP (hàng A, số 1) rồi thanh toán; trả về chủ vé, sự kiện và mã vé.
async function setupPaidTicket() {
  const organizer = await createUser({ role: 'ORGANIZER' });
  const owner = await createUser();
  const { event, vip } = await createSeededEvent(organizer.id, { title: 'Đêm nhạc Test' });
  const hold = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', bearer(owner))
    .send({ eventId: event.id, seatIds: [vip.seatIds[0]] });
  const paid = await request(app)
    .post(`/api/v1/bookings/${hold.body.data.id}/pay`)
    .set('Authorization', bearer(owner));
  assert.equal(paid.status, 200);
  return { owner, event, code: paid.body.data.tickets[0].code };
}

function getTicket(user, code) {
  return request(app).get(`/api/v1/tickets/${code}`).set('Authorization', bearer(user));
}

function getMyTickets(user) {
  return request(app).get('/api/v1/tickets/me').set('Authorization', bearer(user));
}

test('GET /tickets/:code của người khác → 404 TICKET_NOT_FOUND', async () => {
  const { code } = await setupPaidTicket();
  const other = await createUser();

  const res = await getTicket(other, code);
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 404, code: 'TICKET_NOT_FOUND' },
  );
});

test('GET /tickets/:code của mình → qrData bắt đầu bằng data:image/png;base64,', async () => {
  const { owner, code } = await setupPaidTicket();

  const res = await getTicket(owner, code);
  assert.equal(res.status, 200);
  assert.ok(res.body.data.qrData.startsWith('data:image/png;base64,'));
});

test('GET /tickets/:code với mã không tồn tại → 404 TICKET_NOT_FOUND', async () => {
  const { owner } = await setupPaidTicket();

  const res = await getTicket(owner, 'TH-ZZZZZZZZ');
  assert.deepEqual(
    { status: res.status, code: res.body.error?.code },
    { status: 404, code: 'TICKET_NOT_FOUND' },
  );
});

test('GET /tickets/me trả vé của mình kèm sự kiện và ghế, không kèm qrData', async () => {
  const { owner, event, code } = await setupPaidTicket();

  const res = await getMyTickets(owner);

  const [ticket] = res.body.data;
  assert.deepEqual(
    {
      status: res.status,
      count: res.body.data.length,
      code: ticket.code,
      eventId: ticket.event.id,
      title: ticket.event.title,
      seat: { section: ticket.section, row: ticket.row, number: ticket.number },
      hasQr: 'qrData' in ticket,
    },
    {
      status: 200,
      count: 1,
      code,
      eventId: event.id,
      title: 'Đêm nhạc Test',
      seat: { section: 'VIP', row: 'A', number: 1 },
      hasQr: false,
    },
  );
});

test('GET /tickets/me của user chưa có vé → mảng rỗng', async () => {
  await setupPaidTicket();
  const other = await createUser();

  const res = await getMyTickets(other);
  assert.deepEqual({ status: res.status, data: res.body.data }, { status: 200, data: [] });
});

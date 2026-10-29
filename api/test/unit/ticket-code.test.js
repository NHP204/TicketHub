import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTicketCode } from '../../src/utils/ticket-code.js';

// TH- + 8 ký tự từ A-Z bỏ I, O và 2-9 (bỏ 0, 1).
const TICKET_CODE = /^TH-[A-HJ-NP-Z2-9]{8}$/;

test('generateTicketCode chạy 1000 lần đều khớp định dạng TH-XXXXXXXX', () => {
  for (let i = 0; i < 1000; i++) {
    assert.match(generateTicketCode(), TICKET_CODE);
  }
});

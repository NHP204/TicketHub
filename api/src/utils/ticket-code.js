import { randomInt } from 'node:crypto';

// Bỏ I, O, 0, 1 để mã đọc/gõ tay không nhầm.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

// Mã vé dạng TH-XXXXXXXX. randomInt dùng nguồn ngẫu nhiên an toàn mật mã và không lệch phân phối.
export function generateTicketCode() {
  let code = 'TH-';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

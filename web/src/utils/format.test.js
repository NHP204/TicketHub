import { describe, expect, it } from 'vitest';
import { formatEventDateTime, formatVnd } from './format.js';

describe('formatVnd', () => {
  it('định dạng số nguyên đồng theo vi-VN kèm đơn vị đ', () => {
    expect(formatVnd(1600000)).toBe('1.600.000 đ');
  });
});

describe('formatEventDateTime', () => {
  it('đổi UTC sang giờ Việt Nam, thứ đứng đầu', () => {
    expect(formatEventDateTime('2026-11-29T07:12:00Z')).toBe('Chủ Nhật, 29/11/2026, 14:12');
  });

  it('qua nửa đêm giờ Việt Nam thì sang ngày và thứ mới', () => {
    expect(formatEventDateTime('2026-11-29T17:30:00Z')).toBe('Thứ Hai, 30/11/2026, 00:30');
  });

  it('giờ buổi tối dùng định dạng 24 giờ', () => {
    expect(formatEventDateTime('2026-11-28T13:00:00Z')).toBe('Thứ Bảy, 28/11/2026, 20:00');
  });
});

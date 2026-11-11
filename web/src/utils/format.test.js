import { describe, expect, it } from 'vitest';
import { formatEventDateTime, formatVnd, getVnDateParts } from './format.js';

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

describe('getVnDateParts', () => {
  it('tách ngày, thứ viết tắt và giờ theo giờ Việt Nam', () => {
    expect(getVnDateParts('2026-11-28T13:00:00Z')).toEqual({
      year: 2026,
      month: 11,
      day: 28,
      weekdayShort: 'T7',
      time: '20:00',
    });
  });

  it('Chủ Nhật viết tắt là CN, giờ đổi sang UTC+7', () => {
    const parts = getVnDateParts('2026-11-29T07:12:00Z');

    expect(parts.weekdayShort).toBe('CN');
    expect(parts.time).toBe('14:12');
  });

  it('qua nửa đêm giờ Việt Nam ngày cuối tháng thì sang tháng mới', () => {
    expect(getVnDateParts('2026-11-30T17:30:00Z')).toEqual({
      year: 2026,
      month: 12,
      day: 1,
      weekdayShort: 'T3',
      time: '00:30',
    });
  });

  it('qua nửa đêm giờ Việt Nam ngày cuối năm thì sang tháng 1 năm sau', () => {
    expect(getVnDateParts('2026-12-31T17:05:00Z')).toEqual({
      year: 2027,
      month: 1,
      day: 1,
      weekdayShort: 'T6',
      time: '00:05',
    });
  });
});

import { describe, expect, it } from 'vitest';
import { assignZones } from './seat-zones.js';

describe('assignZones', () => {
  it('gán màu theo giá giảm dần, khu vực thứ 5 quay lại màu đầu', () => {
    const zones = assignZones([
      { id: 's200', price: 200000 },
      { id: 's800', price: 800000 },
      { id: 's500', price: 500000 },
      { id: 's300', price: 300000 },
      { id: 's100', price: 100000 },
    ]);

    expect(Object.fromEntries(zones)).toEqual({ s800: 0, s500: 1, s300: 2, s200: 3, s100: 0 });
  });

  it('hai khu vực bằng giá giữ thứ tự gốc', () => {
    const zones = assignZones([
      { id: 'b', price: 300000 },
      { id: 'a', price: 300000 },
      { id: 'vip', price: 900000 },
    ]);

    expect(Object.fromEntries(zones)).toEqual({ vip: 0, b: 1, a: 2 });
  });
});

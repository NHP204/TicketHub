import { describe, expect, it } from 'vitest';
import { formatVnd } from './format.js';

describe('formatVnd', () => {
  it('định dạng số nguyên đồng theo vi-VN kèm đơn vị đ', () => {
    expect(formatVnd(1600000)).toBe('1.600.000 đ');
  });
});

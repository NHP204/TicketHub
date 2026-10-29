import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown.js';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T08:00:00.000Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('expiresAt cách 90 giây → hiển thị 01:30; tiến 30 giây → 01:00', () => {
    const { result } = renderHook(() => useCountdown('2026-10-29T08:01:30.000Z'));
    expect(result.current.display).toBe('01:30');

    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.display).toBe('01:00');
    expect(result.current.isExpired).toBe(false);
  });

  it('expiresAt trong quá khứ → 00:00 và isExpired === true', () => {
    const { result } = renderHook(() => useCountdown('2026-10-29T07:59:00.000Z'));

    expect(result.current.display).toBe('00:00');
    expect(result.current.isExpired).toBe(true);
  });
});

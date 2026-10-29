import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, getAccessToken, setAccessToken, setOnSessionExpired } from './client.js';

function reply(config, status, data) {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    return Promise.reject(
      new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response),
    );
  }
  return Promise.resolve(response);
}

function errorBody(code) {
  return { success: false, error: { code, message: code } };
}

// Adapter giả: /protected chỉ chấp nhận token "new-token"; /auth/refresh trả theo refreshOk.
function createAdapter({ refreshOk = true, protectedCode = 'TOKEN_EXPIRED' } = {}) {
  const calls = { refresh: 0, protected: 0 };
  const adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      calls.refresh += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (!refreshOk) return reply(config, 401, errorBody('TOKEN_EXPIRED'));
      return reply(config, 200, {
        success: true,
        data: { user: { id: 1 }, accessToken: 'new-token' },
      });
    }
    if (config.url === '/protected') {
      calls.protected += 1;
      if (config.headers.Authorization === 'Bearer new-token') {
        return reply(config, 200, { success: true, data: { ok: true } });
      }
      return reply(config, 401, errorBody(protectedCode));
    }
    return reply(config, 404, errorBody('NOT_FOUND'));
  };
  return { adapter, calls };
}

describe('api client — tự refresh access token', () => {
  let originalAdapter;
  let onSessionExpired;

  beforeEach(() => {
    originalAdapter = api.defaults.adapter;
    onSessionExpired = vi.fn();
    setOnSessionExpired(onSessionExpired);
    setAccessToken('old-token');
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    setOnSessionExpired(null);
    setAccessToken(null);
  });

  it('401 TOKEN_EXPIRED, refresh thành công → gửi lại request gốc và trả kết quả', async () => {
    const { adapter, calls } = createAdapter();
    api.defaults.adapter = adapter;

    const res = await api.get('/protected');

    expect(res.data.data).toEqual({ ok: true });
    expect(calls).toEqual({ refresh: 1, protected: 2 });
    expect(getAccessToken()).toBe('new-token');
  });

  it('3 request cùng nhận 401 TOKEN_EXPIRED → /auth/refresh chỉ được gọi 1 lần', async () => {
    const { adapter, calls } = createAdapter();
    api.defaults.adapter = adapter;

    const results = await Promise.all([
      api.get('/protected'),
      api.get('/protected'),
      api.get('/protected'),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(calls.refresh).toBe(1);
  });

  it('refresh thất bại → gọi onSessionExpired, xóa token, không lặp vô hạn', async () => {
    const { adapter, calls } = createAdapter({ refreshOk: false });
    api.defaults.adapter = adapter;

    await expect(api.get('/protected')).rejects.toMatchObject({ response: { status: 401 } });

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(calls).toEqual({ refresh: 1, protected: 1 });
    expect(getAccessToken()).toBeNull();
  });

  it('401 với code khác (INVALID_CREDENTIALS) → không gọi refresh', async () => {
    const { adapter, calls } = createAdapter({ protectedCode: 'INVALID_CREDENTIALS' });
    api.defaults.adapter = adapter;

    await expect(api.get('/protected')).rejects.toMatchObject({
      response: { data: { error: { code: 'INVALID_CREDENTIALS' } } },
    });

    expect(calls.refresh).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

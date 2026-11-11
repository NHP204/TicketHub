import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api.js';
import { setOnSessionExpired } from '../api/client.js';
import { AuthContext } from './use-auth.js';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  // Logout / hết phiên: bỏ dữ liệu của user cũ khỏi cache.
  const becomeGuest = useCallback(() => {
    setUser(null);
    setStatus('guest');
    queryClient.clear();
  }, [queryClient]);

  const becomeAuthenticated = useCallback((nextUser) => {
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    setOnSessionExpired(becomeGuest);
    return () => setOnSessionExpired(null);
  }, [becomeGuest]);

  // Khôi phục phiên từ refresh cookie. StrictMode chạy effect 2 lần nhưng refreshSession
  // dùng chung một promise nên /auth/refresh chỉ được gọi một lần (tránh bị coi là dùng lại token).
  // Kết quả khách KHÔNG clear cache: chưa từng có phiên nên cache không có dữ liệu riêng, còn
  // clear() sẽ hủy âm thầm query công khai đang tải (vd. danh sách sự kiện) → spinner quay mãi.
  // Mọi nhánh kết thúc ở 'authenticated' hoặc 'guest'; request treo bị axios timeout cắt.
  useEffect(() => {
    let cancelled = false;
    const startAsGuest = () => {
      if (cancelled) return;
      setUser(null);
      setStatus('guest');
    };
    authApi
      .refresh()
      .then((session) => {
        // null = API trả 204 (không có refresh cookie) → khách.
        if (!session?.user) return startAsGuest();
        if (!cancelled) becomeAuthenticated(session.user);
      })
      .catch(startAsGuest);
    return () => {
      cancelled = true;
    };
  }, [becomeAuthenticated]);

  const login = useCallback(
    async (credentials) => {
      const { user: loggedIn } = await authApi.login(credentials);
      becomeAuthenticated(loggedIn);
      return loggedIn;
    },
    [becomeAuthenticated],
  );

  // API đăng ký không trả token nên đăng nhập ngay sau đó bằng chính thông tin vừa nhập.
  const register = useCallback(
    async ({ email, password, fullName }) => {
      await authApi.register({ email, password, fullName });
      return login({ email, password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      becomeGuest();
    }
  }, [becomeGuest]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

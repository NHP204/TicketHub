import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api.js';
import { setOnSessionExpired } from '../api/client.js';
import { AuthContext } from './use-auth.js';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

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
  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh()
      .then(({ user: restored }) => {
        if (!cancelled) becomeAuthenticated(restored);
      })
      .catch(() => {
        if (!cancelled) becomeGuest();
      });
    return () => {
      cancelled = true;
    };
  }, [becomeAuthenticated, becomeGuest]);

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

import axios from 'axios';

// Access token chỉ nằm trong bộ nhớ (biến module), không localStorage/sessionStorage.
let accessToken = null;
let onSessionExpired = () => {};
// Nhiều request cùng hết hạn dùng chung một lần gọi /auth/refresh.
let refreshPromise = null;

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  withCredentials: true,
});

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnSessionExpired(callback) {
  onSessionExpired = callback ?? (() => {});
}

// Gọi /auth/refresh (cookie httpOnly), lưu access token mới, trả { user, accessToken }.
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', null, { skipAuthRefresh: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data;
      })
      .catch((err) => {
        setAccessToken(null);
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function bearer(token) {
  return `Bearer ${token}`;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = bearer(accessToken);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isTokenExpired =
      response?.status === 401 && response.data?.error?.code === 'TOKEN_EXPIRED';
    if (!isTokenExpired || !config || config.skipAuthRefresh || config.authRetried) {
      throw error;
    }

    // Token đã được làm mới bởi request khác trong lúc request này chạy → gửi lại luôn.
    const sentToken = config.headers?.Authorization;
    if (!accessToken || sentToken === bearer(accessToken)) {
      try {
        await refreshSession();
      } catch {
        onSessionExpired();
        throw error;
      }
    }

    config.authRetried = true;
    return api(config);
  },
);

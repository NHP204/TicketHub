import { api, refreshSession, setAccessToken } from './client.js';

export async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  setAccessToken(res.data.data.accessToken);
  return res.data.data;
}

export async function register({ email, password, fullName }) {
  const res = await api.post('/auth/register', { email, password, fullName });
  return res.data.data;
}

export function refresh() {
  return refreshSession();
}

export async function logout() {
  try {
    await api.post('/auth/logout', null, { skipAuthRefresh: true });
  } finally {
    setAccessToken(null);
  }
}

export async function me() {
  const res = await api.get('/users/me');
  return res.data.data;
}

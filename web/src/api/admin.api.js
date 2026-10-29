import { api } from './client.js';

export const USERS_PAGE_SIZE = 20;

// Danh sách user. Trả { users, meta: { page, limit, total, totalPages } }.
export async function listUsers({ role, page = 1, limit = USERS_PAGE_SIZE } = {}) {
  const res = await api.get('/admin/users', {
    params: { role: role || undefined, page, limit },
  });
  return { users: res.data.data, meta: res.data.meta };
}

// fields: { role?, isActive? }. Trả user đã cập nhật.
export async function updateUser(id, fields) {
  const res = await api.patch(`/admin/users/${id}`, fields);
  return res.data.data;
}

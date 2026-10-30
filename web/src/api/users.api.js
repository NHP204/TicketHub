import { api } from './client.js';

// fields: { fullName } hoặc { currentPassword, newPassword }. Trả user đã cập nhật.
// Đổi mật khẩu thành công thì API thu hồi mọi refresh token.
export async function updateMe(fields) {
  const res = await api.patch('/users/me', fields);
  return res.data.data;
}

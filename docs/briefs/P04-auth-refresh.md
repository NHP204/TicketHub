# Brief — P04 Refresh token rotation, logout, phân quyền

## Mục tiêu

Phiên đăng nhập kéo dài 7 ngày bằng refresh token trong httpOnly cookie, có xoay vòng và
phát hiện token bị dùng lại; phân quyền theo role; rate limit cho auth; admin quản lý user.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/refresh-token.repo.js`, `api/src/repositories/user.repo.js`
- `api/src/utils/jwt.js` (thêm hàm hash token)
- `api/src/modules/auth/`, `api/src/modules/users/`
- `api/src/middlewares/authorize.js`, `api/src/middlewares/rate-limit.js`
- `api/src/container.js`, `api/src/app.js`
- `api/test/unit/authorize.test.js`, `api/test/unit/refresh.service.test.js`,
  `api/test/integration/refresh.test.js`, `api/test/integration/users.test.js`

Không được: thêm package, sửa migration, sửa test có sẵn (trừ khi login đổi response — xem Prompt 1).

## Hợp đồng

Refresh token: chuỗi ngẫu nhiên 48 byte (`crypto.randomBytes`, hex), KHÔNG phải JWT.
DB chỉ lưu `sha256(token)`. Hạn 7 ngày.

Cookie `refresh_token`: `httpOnly: true`, `sameSite: 'lax'` (production: `'none'`),
`secure` khi production, `path: '/api/v1/auth'`, `maxAge` 7 ngày.

| Method | Path | Quyền | Hành vi |
| --- | --- | --- | --- |
| POST | /auth/login | Public | Như P03, thêm: tạo refresh token, đặt cookie |
| POST | /auth/refresh | Cookie | Xoay vòng: thu hồi token cũ (`revoked_at`, `replaced_by`), cấp token mới + access token mới |
| POST | /auth/logout | Cookie | Thu hồi token hiện tại, xóa cookie, 204 |
| PATCH | /users/me | User | Sửa `fullName`; đổi mật khẩu cần `currentPassword` + `newPassword` |
| GET | /admin/users | Admin | Phân trang `page`, `limit` (tối đa 50), lọc `role` |
| PATCH | /admin/users/:id | Admin | Sửa `role`, `isActive`; admin không được tự khóa chính mình → 409 `CANNOT_MODIFY_SELF` |

Lỗi refresh:

- Không có cookie hoặc token không tồn tại → 401 `INVALID_REFRESH_TOKEN`
- Token hết hạn → 401 `INVALID_REFRESH_TOKEN`
- Token ĐÃ bị thu hồi mà vẫn được gửi lên (bị đánh cắp và dùng lại) → thu hồi TẤT CẢ refresh token
  còn hiệu lực của user đó, trả 401 `TOKEN_REUSED`
- Đổi mật khẩu thành công → thu hồi tất cả refresh token của user

`authorize(...roles)`: chưa có `req.user` → 401; role không nằm trong danh sách → 403 `FORBIDDEN`.

Rate limit: `/auth/login` và `/auth/register` tối đa 5 request / phút / IP, vượt → 429 `TOO_MANY_REQUESTS`
(định dạng lỗi chuẩn). Tắt rate limit khi `NODE_ENV=test` trừ test riêng của nó.

## Prompt 1 — Refresh, rotation, logout

Thao tác refresh (đọc token cũ, kiểm tra, thu hồi, tạo token mới) chạy trong MỘT `withTransaction`
và khóa dòng token cũ bằng `FOR UPDATE`, để hai request refresh cùng lúc không cùng thành công.

Integration test:

1. Login → response có header `set-cookie` chứa `refresh_token` và `HttpOnly`
2. Refresh bằng cookie đó → 200, cookie mới khác cookie cũ
3. Refresh lại bằng cookie CŨ → 401 `TOKEN_REUSED`
4. Sau bước 3, cookie MỚI cũng không dùng được nữa → 401
5. Logout → 204; refresh bằng cookie vừa logout → 401
6. Trong DB không có cột nào chứa token gốc (so sánh chuỗi cookie với `token_hash`)

Hoàn thành khi: test xanh; test login của P03 vẫn xanh (nếu phải sửa test P03 vì response
thay đổi, nêu rõ lý do trong tóm tắt).

## Prompt 2 — authorize, users, admin, rate limit

Test cần viết:

1. (unit) `authorize('ADMIN')` với role `USER` → 403
2. (unit) `authorize('ORGANIZER', 'ADMIN')` với role `ADMIN` → `next()` không lỗi
3. (integration) User gọi `GET /admin/users` → 403
4. (integration) Admin khóa user → user đó login → 403 `ACCOUNT_DISABLED`
5. (integration) Admin tự PATCH chính mình `isActive: false` → 409 `CANNOT_MODIFY_SELF`
6. (integration) Đổi mật khẩu với `currentPassword` sai → 401 `INVALID_CREDENTIALS`
7. (integration) Login sai 6 lần liên tiếp từ cùng IP → lần thứ 6 nhận 429

Hoàn thành khi: toàn bộ test xanh.

## Hoàn thành giai đoạn

- Chạy prompt rà soát trong PLAN.md trước khi commit Prompt 1.
- Commit gợi ý: `feat(auth): add refresh token rotation and logout`, `feat(users): add authorize, profile and admin user management`

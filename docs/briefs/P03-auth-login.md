# Brief — P03 Đăng ký, đăng nhập, access token

## Mục tiêu

User đăng ký, đăng nhập nhận access token, và gọi được `GET /users/me`.
Refresh token và phân quyền làm ở P04.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/user.repo.js`
- `api/src/utils/password.js`, `api/src/utils/jwt.js`
- `api/src/modules/auth/` (routes, controller, service, schemas)
- `api/src/modules/users/` (routes, controller, service) — chỉ `GET /users/me`
- `api/src/middlewares/authenticate.js`
- `api/src/container.js`, `api/src/app.js`, `api/src/server.js`
- `api/test/unit/auth.service.test.js`, `api/test/unit/authenticate.test.js`,
  `api/test/integration/auth.test.js`

Không được: thêm package, sửa migration, sửa test có sẵn.

## Hợp đồng

`user.repo.js` (mọi hàm nhận `db` đầu tiên, trả về camelCase, KHÔNG trả `passwordHash`
trừ `findByEmailWithPassword`):
`findById(db, id)`, `findByEmail(db, email)`, `findByEmailWithPassword(db, email)`,
`create(db, { email, passwordHash, fullName, role })`.

`utils/password.js`: `hashPassword(plain)`, `verifyPassword(plain, hash)` — bcrypt cost 10.

`utils/jwt.js`: `signAccessToken(payload, secret)` hạn 15 phút; `verifyAccessToken(token, secret)`.
Payload: `{ sub: userId, role }`.

`AuthService({ pool, userRepo, passwordUtil, jwtUtil, accessSecret })`:

- `register({ email, password, fullName })`: email chuyển chữ thường và trim; email đã có →
  `ConflictError('EMAIL_TAKEN')`; role luôn là `USER`; trả về user (không có hash).
- `login({ email, password })`: sai email HOẶC sai mật khẩu → cùng một lỗi
  `UnauthorizedError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng')`;
  user `isActive = false` → `ForbiddenError('ACCOUNT_DISABLED')`; trả về `{ user, accessToken }`.

Endpoints:

| Method | Path | Body | Thành công |
| --- | --- | --- | --- |
| POST | /api/v1/auth/register | email (email hợp lệ), password (8–72 ký tự, có chữ và số), fullName (2–100) | 201, data = user |
| POST | /api/v1/auth/login | email, password | 200, data = { user, accessToken } |
| GET | /api/v1/users/me | header `Authorization: Bearer <token>` | 200, data = user |

`authenticate(jwtUtil, secret)`: không có header hoặc sai định dạng → 401 `UNAUTHORIZED`;
token hết hạn → 401 `TOKEN_EXPIRED`; token sai chữ ký → 401 `UNAUTHORIZED`.
Thành công → `req.user = { id, role }`.

## Prompt 1 — Utils, repository, AuthService

Unit test `AuthService` với `userRepo` giả và `passwordUtil` giả:

1. Register email `  An@Mail.com ` → repo nhận `an@mail.com`
2. Register email đã tồn tại → ném lỗi có `code === 'EMAIL_TAKEN'`
3. Register truyền thêm `role: 'ADMIN'` → user tạo ra vẫn có role `USER`
4. Login email không tồn tại và login sai mật khẩu → hai lỗi có cùng `code` và cùng `message`
5. Login user bị khóa → `ACCOUNT_DISABLED`
6. Kết quả register không có thuộc tính `passwordHash`

Hoàn thành khi: test unit xanh.

## Prompt 2 — Routes, middleware authenticate, nối vào app

Unit test `authenticate`:

1. Thiếu header → 401 `UNAUTHORIZED`
2. Token ký bằng secret khác → 401 `UNAUTHORIZED`
3. Token hết hạn (ký với `expiresIn: -1`) → 401 `TOKEN_EXPIRED`

Integration test (DB test):

1. Register hợp lệ → 201, response không có `passwordHash` ở bất kỳ đâu (kiểm tra chuỗi JSON)
2. Register mật khẩu `12345678` (không có chữ) → 400 `VALIDATION_ERROR`
3. Register trùng email → 409 `EMAIL_TAKEN`
4. Login đúng → 200, có `accessToken`; dùng token gọi `/users/me` → 200, email khớp
5. Login sai mật khẩu → 401 `INVALID_CREDENTIALS`

Hoàn thành khi: toàn bộ test xanh; thử tay bằng curl đủ 3 endpoint.

## Hoàn thành giai đoạn

- Commit gợi ý: `feat(auth): add auth service with register and login`, `feat(auth): add auth routes and authenticate middleware`

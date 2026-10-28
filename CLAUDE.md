# Project rules — TicketHub

Hệ thống đặt vé sự kiện: API Node.js (thư mục `api/`) và web React (thư mục `web/`).
Mỗi nhiệm vụ có một brief trong `docs/briefs/`. Brief là nguồn sự thật cho nhiệm vụ đó.

## Stack

- Node 22, JavaScript thuần, ESM (`"type": "module"`), không dùng TypeScript.
- API: Express, pg (node-postgres) với SQL thuần, Zod, jsonwebtoken, bcrypt,
  node-pg-migrate, node-cron, qrcode, multer, @supabase/supabase-js, winston.
- Database: PostgreSQL 16 (Supabase khi deploy, Docker khi dev và test).
- Test API: `node:test` + `node:assert/strict` + supertest. Không dùng Jest.
- Web: React + Vite, React Router, axios, TanStack Query, Tailwind. Test web: Vitest.

## Layout

```
api/src/config/        env.js, db.js
api/src/modules/<tên>/ <tên>.routes.js, .controller.js, .service.js, .schemas.js
api/src/repositories/  <bảng>.repo.js
api/src/middlewares/   authenticate, authorize, validate, errorHandler, ...
api/src/errors/        AppError và các lớp con
api/src/jobs/          cron job
api/src/utils/         jwt, password, response, logger, ...
api/src/container.js   nơi DUY NHẤT khởi tạo và nối dependency
api/migrations/        mỗi migration dùng pgm.sql() với SQL thuần
api/test/unit/         test không cần database (dùng repo giả)
api/test/integration/  test API với database test
web/src/               api/, components/, pages/, hooks/, context/, utils/
```

## Commands

- API (trong `api/`): `npm test` · `npm run lint` · `npm run format:check` · `npm run migrate:test`
- Web (trong `web/`): `npm test` · `npm run lint` · `npm run build`
- Database dev/test: `docker compose up -d` (ở thư mục gốc)

## Kiến trúc API (bắt buộc)

- Route → Middleware → Controller → Service → Repository → PostgreSQL. Không nhảy cóc.
- Controller: đọc `req`, gọi service, trả response bằng helper `ok()`. Không SQL, không business rule.
- Service: business logic và transaction. Không import express, không đụng `req`/`res`.
- Repository: chỉ SQL. Mọi hàm nhận `db` (pool hoặc client) làm tham số đầu tiên
  để chạy được trong transaction của service.
- Service nhận dependency qua constructor (object), không tự import repository.
- Transaction luôn dùng helper `withTransaction` trong `config/db.js`.

## Quy ước code

- 2-space indent, dấu nháy đơn, có dấu chấm phẩy; Prettier quyết định cuối cùng.
- Chỉ named export. Không default export (trừ component React và file config của tool).
- Tên file: kebab hoặc chấm như layout ở trên; tên class PascalCase; hàm camelCase.
- SQL: luôn dùng tham số `$1, $2, ...`. Không bao giờ nối chuỗi giá trị vào SQL.
  Tên cột dùng để sort phải qua whitelist.
- Tiền: số nguyên đồng (INTEGER trong DB, number trong JS). Không toFixed, không float.
- Thời gian: TIMESTAMPTZ trong DB, chuỗi ISO 8601 trong JSON.
- JSON trả về dùng camelCase; cột DB dùng snake_case; repository chịu trách nhiệm đổi.

## Response và lỗi

- Thành công: `{ success: true, data, meta? }`.
- Lỗi: `{ success: false, error: { code, message, details? } }`.
- Lỗi nghiệp vụ ném lớp con của `AppError` (`ValidationError` 400, `UnauthorizedError` 401,
  `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409). Mã lỗi viết HOA_GẠCH_DƯỚI.
- Không bắt lỗi rồi nuốt. Không try/catch trong service trừ `withTransaction`.
- Không bao giờ trả `password_hash`, token hash hay stack trace trong response.

## Bảo mật

- Mật khẩu: bcrypt cost 10. Refresh token chỉ lưu dạng SHA-256 hash.
- Web: không dùng `dangerouslySetInnerHTML`; chữ người dùng nhập chỉ hiển thị qua JSX.
- Access token ở web chỉ giữ trong bộ nhớ (state), không localStorage.

## Test

- Mỗi test kiểm tra một điều, tên test mô tả hành vi bằng tiếng Việt hoặc tiếng Anh.
- Giá trị mong đợi tính tay từ brief, không chép từ output của code.
- Integration test gọi `resetDb()` trong `beforeEach`, không phụ thuộc thứ tự chạy.
- Không sửa hoặc xóa test có sẵn, trừ khi brief yêu cầu rõ ràng.

## Cách làm việc

1. Đọc brief được chỉ định. Chỉ làm đúng Prompt được giao, không làm trước Prompt sau.
2. Trước khi sửa code: nêu kế hoạch (file sẽ tạo/sửa, hàm, test). Chờ duyệt nếu đang ở plan mode.
3. Chỉ tạo/sửa file nằm trong mục "Phạm vi" của brief. Cần file khác → dừng lại và hỏi.
4. Sau khi sửa: chạy test, lint, format:check của phần liên quan; sửa đến khi xanh.
5. Kết thúc bằng: danh sách file đã đổi, một dòng tóm tắt mỗi thay đổi, lệnh để tự kiểm tra.
6. Brief mâu thuẫn với file này → làm theo brief và nêu rõ chỗ mâu thuẫn.
7. Không chắc → hỏi. Không đoán tên biến môi trường, tên bảng, mã lỗi.

## Never

- Thêm, gỡ hoặc nâng cấp package khi brief không cho phép rõ ràng.
- Sửa `CLAUDE.md`, `docs/`, `.claude/`, `.github/`, `migrations/` đã commit, `package-lock.json` bằng tay.
- Đọc, tạo hoặc sửa file `.env` (chỉ được sửa `.env.example`).
- Chạy `git commit`, `git push`, `git reset`, `git checkout -- .` — người dùng tự commit.
- Xóa file hoặc thư mục không được brief nhắc đến.
- Ghi cứng secret, connection string, mật khẩu thật vào code.

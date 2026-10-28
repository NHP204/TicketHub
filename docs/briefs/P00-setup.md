# Brief — P00 Khung API và tooling

## Mục tiêu

Dựng khung `api/` chạy được: Express app có endpoint health, test, lint, format,
và Postgres chạy bằng Docker cho dev và test. Chưa có business logic.

## Phạm vi

Được phép tạo:

- `api/package.json`, `api/package-lock.json` (do npm sinh ra)
- `api/eslint.config.js`, `api/.prettierrc`, `api/.prettierignore`
- `api/.env.example`, `api/.env.test.example`
- `api/src/app.js`, `api/src/server.js`, `api/src/config/env.js`
- `api/test/integration/health.test.js`, `api/test/unit/env.test.js`
- `docker-compose.yml`, `.gitignore` (ở gốc repo)

Không được sửa: `CLAUDE.md`, `docs/`, `.claude/`. Không tạo file `.env`.

Ngoại lệ của brief này: được chạy `npm install` để cài ĐÚNG danh sách package dưới đây.
Từ P01 trở đi không thêm package nào nữa.

## Prompt 1 — package.json và tooling

Trong `api/`: `npm init -y`, đặt `"type": "module"`, `"engines": { "node": ">=22" }`.

Cài dependencies:
`express helmet cors cookie-parser pg zod jsonwebtoken bcrypt node-pg-migrate node-cron qrcode multer @supabase/supabase-js express-rate-limit winston swagger-ui-express yaml`

Cài devDependencies:
`eslint @eslint/js globals prettier supertest`

Scripts:

| Script | Lệnh |
| --- | --- |
| dev | `node --env-file-if-exists=.env --watch src/server.js` |
| start | `node src/server.js` |
| test | `node --env-file-if-exists=.env.test --test "test/**/*.test.js"` |
| test:unit | `node --test "test/unit/**/*.test.js"` |
| lint | `eslint .` |
| format | `prettier --write .` |
| format:check | `prettier --check .` |

ESLint flat config: `@eslint/js` recommended, globals node, `no-unused-vars` là error
(bỏ qua tham số bắt đầu bằng `_`). Prettier: `singleQuote: true`, `semi: true`,
`printWidth: 100`, `trailingComma: "all"`.

Hoàn thành khi: `npm run lint` và `npm run format:check` xanh trên project rỗng.

## Prompt 2 — env, app, server

`src/config/env.js`:

- `export function loadEnv(source = process.env)` trả về object đã validate bằng Zod:
  `NODE_ENV` (development | test | production, mặc định development), `PORT` (số, mặc định 4000),
  `DATABASE_URL` (bắt buộc), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (bắt buộc, tối thiểu 32 ký tự),
  `CORS_ORIGIN` (mặc định `http://localhost:5173`).
- Thiếu hoặc sai → ném `Error` có message liệt kê tên biến bị sai. Không in giá trị secret.

`src/app.js`:

- `export function createApp(deps = {})` trả về Express app. Không gọi `listen`, không đọc env.
- Middleware theo thứ tự: helmet, cors (`origin` lấy từ `deps.corsOrigin`, `credentials: true`),
  `express.json({ limit: '100kb' })`, cookie-parser.
- `GET /api/v1/health` → 200 `{ "success": true, "data": { "status": "ok" } }`.

`src/server.js`: gọi `loadEnv()`, `createApp({ corsOrigin })`, `listen(PORT)`, log một dòng khi chạy.

Test cần viết:

1. `GET /api/v1/health` → status 200
2. Body đúng bằng `{ success: true, data: { status: 'ok' } }` (deepEqual)
3. `loadEnv` với đủ biến hợp lệ → `PORT` là number `4000` khi không truyền
4. `loadEnv` thiếu `DATABASE_URL` → ném lỗi, message có chữ `DATABASE_URL`
5. `loadEnv` với `JWT_ACCESS_SECRET` dài 10 ký tự → ném lỗi

Hoàn thành khi: `npm test` xanh 5 test; `npm run dev` (sau khi bạn tạo `.env`) và
`curl localhost:4000/api/v1/health` trả JSON trên.

## Prompt 3 — Docker Postgres và file mẫu

`docker-compose.yml` ở gốc repo: hai service `db` (postgres:16, port 5432, database `tickethub`)
và `db_test` (postgres:16, port 5433, database `tickethub_test`, dùng `tmpfs` cho data).
User/password dev: `tickethub` / `tickethub` (chỉ dùng local).

`api/.env.example` và `api/.env.test.example`: đủ biến của `loadEnv`, giá trị giả,
`DATABASE_URL` trỏ đúng cổng 5432 / 5433.

`.gitignore`: `node_modules/`, `.env`, `.env.test`, `coverage/`, `dist/`, `.DS_Store`.

Hoàn thành khi: `docker compose up -d` chạy 2 container; `docker compose ps` thấy cả hai healthy
(thêm healthcheck `pg_isready`).

## Hoàn thành giai đoạn

- `npm test`, `npm run lint`, `npm run format:check` xanh trong `api/`
- `git status` không có file `.env` hay `.env.test`
- Commit gợi ý: `chore(api): scaffold express app and tooling`, `chore: add docker postgres for dev and test`

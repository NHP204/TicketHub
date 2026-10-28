# Brief — P14 Docker, CI, deploy, README

## Mục tiêu

Dự án chạy được bằng một lệnh, CI xanh trên GitHub, có link demo công khai và README thuyết phục.

## Phạm vi

Được phép tạo/sửa:

- `api/Dockerfile`, `api/.dockerignore`, `docker-compose.yml`
- `.github/workflows/ci.yml` (ngoại lệ so với CLAUDE.md, chỉ trong brief này)
- `README.md` (gốc repo), `docs/images/` (chỉ thêm ảnh bạn cung cấp)
- `api/src/app.js`: CHỈ thêm `app.set('trust proxy', 1)` khi production
- `api/src/modules/auth/`: CHỈ phần cấu hình cookie cho production nếu cần

Không được: đổi logic nghiệp vụ, thêm package, sửa test.

## Prompt 1 — Docker

- `api/Dockerfile`: `node:22-alpine`, multi-stage, `npm ci --omit=dev`, chạy bằng user `node`, `CMD ["node", "src/server.js"]`.
- `docker-compose.yml` thêm service `api` (build `./api`, phụ thuộc `db` healthy, env từ `api/.env`).

Hoàn thành khi: `docker compose up --build` → `curl localhost:4000/api/v1/health` trả 200.

## Prompt 2 — CI

`.github/workflows/ci.yml`, chạy khi push và pull request vào `main`:

- Job `api`: service `postgres:16`, Node 22, `npm ci`, tạo `.env.test` từ biến của workflow
  (secret giả, chỉ dùng cho CI), `npm run migrate:test`, `npm run lint`, `npm run format:check`, `npm test`.
- Job `web`: Node 22, `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- Dùng cache npm theo `package-lock.json` của từng thư mục.

Hoàn thành khi: push lên GitHub, tab Actions xanh cả 2 job.

## Prompt 3 — README

Cấu trúc (tiếng Anh hoặc tiếng Việt, chọn một và dùng thống nhất):

1. Tên, mô tả 1 câu, badge CI, link demo, ảnh GIF demo (bạn quay và đặt vào `docs/images/`)
2. Tài khoản demo cho User, Organizer, Admin
3. Điểm nổi bật: chống đặt trùng ghế bằng `SELECT ... FOR UPDATE` + kết quả `npm run race` (1 / 49 / 0);
   refresh token rotation có phát hiện token bị dùng lại; kiến trúc 3 lớp + DI
4. Tech stack
5. Sơ đồ kiến trúc và ERD (dùng khối ```mermaid trong README)
6. Chạy local: `docker compose up -d`, migrate, seed, `npm run dev` cho api và web
7. Tài liệu API: link `/api-docs`
8. Chạy test và race test
9. Cấu trúc thư mục, hướng phát triển

Hoàn thành khi: một người chưa từng thấy dự án làm theo README chạy được local trong 10 phút.

## Việc của bạn (không giao AI)

1. Supabase: chạy migration lên DB Supabase (`DATABASE_URL` của Supabase, connection pooler cổng 5432
   cho migration), chạy seed với tài khoản demo.
2. Render: tạo Web Service từ thư mục `api`, điền biến môi trường, `NODE_ENV=production`,
   `CORS_ORIGIN` = domain Vercel.
3. Vercel: import thư mục `web`, `VITE_API_URL` = URL Render, thêm rewrite SPA về `index.html`.
4. Kiểm tra cookie refresh chạy giữa 2 domain (`sameSite: 'none'`, `secure: true`), đăng nhập rồi F5.
5. Quay GIF, cập nhật README, tag `v1.0.0`, ghi link vào CV.

## Hoàn thành giai đoạn

- Checklist cuối: link demo chạy; tài khoản demo đăng nhập được; CI xanh; README không còn TODO;
  bạn tự giải thích được P04 và P07 mà không nhìn code.
- Commit gợi ý: `chore: add dockerfile and compose service`, `ci: add github actions workflow`, `docs: write readme`

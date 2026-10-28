# Brief — P01 Database: migration, seed, transaction

## Mục tiêu

Tạo đủ 9 bảng bằng migration SQL thuần, có seed dữ liệu mẫu, và helper `withTransaction`
mà mọi service sau này dùng.

## Phạm vi

Được phép tạo/sửa:

- `api/src/config/db.js`
- `api/migrations/` (3 file migration mới)
- `api/seeds/seed.js`
- `api/test/helpers/db.js`
- `api/test/unit/with-transaction.test.js`, `api/test/integration/schema.test.js`
- `api/package.json`: CHỈ thêm 4 script `migrate`, `migrate:down`, `migrate:test`, `seed`

Không được: thêm package, sửa `src/app.js`, `src/server.js`.

## Hợp đồng

`src/config/db.js`:

- `export function createPool(connectionString)` → `new pg.Pool({ connectionString, max: 10 })`
- `export async function withTransaction(pool, fn)`: lấy client, `BEGIN`, `await fn(client)`,
  `COMMIT`, trả về kết quả của `fn`. Lỗi → `ROLLBACK` rồi ném lại đúng lỗi đó. Luôn `release()`.

`test/helpers/db.js`:

- `export const testPool` tạo từ `process.env.DATABASE_URL`
- `export async function resetDb()`: `TRUNCATE` cả 9 bảng `RESTART IDENTITY CASCADE`
- `export async function closeDb()`

## Schema

Mọi bảng: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
kiểu `TIMESTAMPTZ NOT NULL DEFAULT now()`. Tiền là `INTEGER` (đồng). Trạng thái là
`VARCHAR` + `CHECK ... IN (...)`.

| Bảng | Cột (ngoài id, created_at, updated_at) | Ràng buộc và index |
| --- | --- | --- |
| users | email VARCHAR(255), password_hash TEXT, full_name VARCHAR(100), role (USER, ORGANIZER, ADMIN) mặc định USER, is_active BOOLEAN mặc định true | UNIQUE email (lưu chữ thường) |
| refresh_tokens | user_id, token_hash TEXT, expires_at, revoked_at NULL, replaced_by UUID NULL | FK user_id ON DELETE CASCADE; UNIQUE token_hash |
| events | organizer_id, title VARCHAR(200), description TEXT, venue VARCHAR(200), start_time, end_time, banner_url TEXT NULL, status (DRAFT, PUBLISHED, CANCELLED) mặc định DRAFT | CHECK end_time > start_time; index (status, start_time) |
| sections | event_id, name VARCHAR(50), price INTEGER, row_count INTEGER, seats_per_row INTEGER | FK ON DELETE CASCADE; CHECK price >= 0; CHECK row_count 1–26; CHECK seats_per_row 1–50; UNIQUE (event_id, name) |
| seats | event_id, section_id, row_label VARCHAR(2), seat_number INTEGER, status (AVAILABLE, HELD, BOOKED) mặc định AVAILABLE, held_by NULL, held_until NULL | UNIQUE (section_id, row_label, seat_number); CHECK status <> 'HELD' OR held_until IS NOT NULL; index (event_id, status); index held_until WHERE status = 'HELD' |
| bookings | user_id, event_id, status (PENDING, PAID, CANCELLED, EXPIRED) mặc định PENDING, total_amount INTEGER, expires_at | index (user_id, created_at); index expires_at WHERE status = 'PENDING' |
| booking_items | booking_id, seat_id, price INTEGER | FK booking_id ON DELETE CASCADE; UNIQUE (booking_id, seat_id) |
| tickets | booking_item_id, code VARCHAR(20), qr_data TEXT, status (VALID, USED, CANCELLED) mặc định VALID | UNIQUE code; UNIQUE booking_item_id |
| payments | booking_id, provider VARCHAR(30), amount INTEGER, status (SUCCESS, FAILED), transaction_ref VARCHAR(100) | UNIQUE booking_id; UNIQUE transaction_ref |

## Prompt 1 — db.js và withTransaction

Viết `src/config/db.js` theo hợp đồng và unit test dùng client giả (object ghi lại các câu query).

Test cần viết:

1. `fn` chạy thành công → các query theo thứ tự là `BEGIN`, `COMMIT`; trả về giá trị của `fn`
2. `fn` ném lỗi → query là `BEGIN`, `ROLLBACK`; lỗi ném ra chính là lỗi gốc (`assert.rejects` với cùng object)
3. Cả hai trường hợp đều gọi `release()` đúng 1 lần

Hoàn thành khi: `npm run test:unit` xanh.

## Prompt 2 — Migration

Ba file migration, mỗi file chỉ dùng `pgm.sql()` với SQL thuần, có cả `up` và `down`:

1. `pgcrypto` extension, `users`, `refresh_tokens`
2. `events`, `sections`, `seats`
3. `bookings`, `booking_items`, `tickets`, `payments`

Scripts: `migrate` (lên DB dev), `migrate:down` (lùi 1 bước), `migrate:test` (lên DB test, dùng
`.env.test`). Kiểm tra cú pháp node-pg-migrate bằng `npx node-pg-migrate --help` trước khi viết script.

Hoàn thành khi: `npm run migrate` rồi `npm run migrate:down` 3 lần rồi `npm run migrate` lại đều không lỗi.

## Prompt 3 — Seed và schema test

`seeds/seed.js` (chạy được nhiều lần, xóa dữ liệu cũ trước):

- 1 admin `admin@tickethub.dev`, 1 organizer `organizer@tickethub.dev`,
  2 user `user1@tickethub.dev`, `user2@tickethub.dev`, mật khẩu chung `Password123!` (bcrypt cost 10)
- 1 sự kiện PUBLISHED của organizer, bắt đầu sau 30 ngày, kéo dài 3 giờ
- Section `VIP`: 2 hàng × 5 ghế, giá 500000. Section `Thường`: 5 hàng × 10 ghế, giá 200000
- Ghế sinh bằng một câu `INSERT ... SELECT` với `generate_series`; hàng đặt tên A, B, C, ...

Integration test `schema.test.js` (DB test, gọi `resetDb()` trước mỗi test):

1. Insert 2 ghế cùng (section, hàng, số) → lỗi có `code === '23505'`
2. Insert section `price = -1` → lỗi có `code === '23514'`
3. Update ghế sang `HELD` mà không có `held_until` → lỗi `23514`
4. Insert event `end_time` trước `start_time` → lỗi `23514`

Hoàn thành khi: `npm run migrate:test && npm test` xanh; `npm run seed` rồi đếm trong DB dev
có 60 ghế (10 + 50).

## Hoàn thành giai đoạn

- Toàn bộ test xanh; migration lên/xuống không lỗi
- Commit gợi ý: `feat(db): add transaction helper`, `feat(db): add schema migrations`, `feat(db): add seed and schema tests`

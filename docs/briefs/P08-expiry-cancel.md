# Brief — P08 Cron trả ghế hết hạn, hủy booking, lịch sử

## Mục tiêu

Booking quá 10 phút tự chuyển EXPIRED và trả ghế; user hủy được booking chưa thanh toán;
user xem được lịch sử booking của mình.

## Phạm vi

Được phép tạo/sửa:

- `api/src/jobs/release-expired.job.js`
- `api/src/repositories/booking.repo.js`, `api/src/repositories/seat.repo.js`
- `api/src/modules/bookings/`
- `api/src/server.js` (lên lịch cron), `api/src/container.js`
- `api/test/integration/release-expired.test.js`, `api/test/integration/bookings-manage.test.js`

Không được: lên lịch cron trong `app.js` (test sẽ khởi động cron), thêm package, sửa migration.

## Hợp đồng

`release-expired.job.js`:

- `export async function releaseExpired(pool)` chạy MỘT câu SQL dùng CTE:
  booking `PENDING` có `expires_at < now()` → `EXPIRED`; ghế của các booking đó đang `HELD`
  → `AVAILABLE`, `held_by` và `held_until` về NULL.
- Trả về `{ bookings: số booking đã hết hạn, seats: số ghế đã trả }`.
- Không đụng ghế `BOOKED`, không đụng booking `PAID`.
- `server.js` lên lịch `node-cron` mỗi phút (`'* * * * *'`); log kết quả khi `bookings > 0`; lỗi được log, không làm sập server.

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| GET | /bookings/me | User | Mới nhất trước, phân trang như P05, lọc `status` |
| GET | /bookings/:id | Chủ booking hoặc Admin | Người khác → 404 `BOOKING_NOT_FOUND` (không lộ là có tồn tại) |
| POST | /bookings/:id/cancel | Chủ booking | Chỉ PENDING → CANCELLED, trả ghế, trong `withTransaction` + `FOR UPDATE` booking |

Hủy booking không phải PENDING → 409 `BOOKING_NOT_PENDING`.

## Prompt 1 — Job trả ghế

Test cần viết (tạo dữ liệu bằng service P07 rồi sửa thời gian bằng SQL):

1. Booking PENDING có `expires_at` 1 phút trước → sau `releaseExpired`: booking EXPIRED, 2 ghế AVAILABLE
2. Kết quả trả về đúng `{ bookings: 1, seats: 2 }`
3. Booking PENDING còn hạn → không đổi
4. Booking PAID có ghế BOOKED, `expires_at` trong quá khứ → không đổi
5. Chạy `releaseExpired` 2 lần liên tiếp → lần 2 trả `{ bookings: 0, seats: 0 }`

## Prompt 2 — Hủy và xem booking

Test cần viết:

1. Hủy booking PENDING của mình → 200, status CANCELLED, ghế AVAILABLE
2. Sau khi hủy, user khác giữ được chính các ghế đó → 201
3. User B hủy booking của user A → 404 `BOOKING_NOT_FOUND`
4. Hủy booking đã CANCELLED → 409 `BOOKING_NOT_PENDING`
5. `GET /bookings/me` với 3 booking → 3 item, item đầu là booking tạo sau cùng

## Hoàn thành giai đoạn

- Chạy `npm run dev`, giữ ghế, chờ hơn 10 phút, thấy log cron và ghế trở về AVAILABLE.
- Commit gợi ý: `feat(bookings): release expired holds with cron job`, `feat(bookings): add cancel and booking history`

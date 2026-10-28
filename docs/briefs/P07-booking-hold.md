# Brief — P07 Giữ ghế với khóa dòng, race test

## Mục tiêu

`POST /bookings` giữ ghế trong 10 phút. Hai người KHÔNG BAO GIỜ giữ được cùng một ghế,
kể cả khi gửi request cùng lúc. Đây là phần quan trọng nhất của dự án.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/seat.repo.js`, `api/src/repositories/booking.repo.js`
- `api/src/modules/bookings/` (routes, controller, service, schemas)
- `api/src/config/constants.js` (`HOLD_MINUTES = 10`, `MAX_SEATS_PER_BOOKING = 6`)
- `api/src/container.js`, `api/src/app.js`
- `api/scripts/race-test.js`
- `api/test/unit/booking.service.test.js`, `api/test/integration/bookings-hold.test.js`,
  `api/test/integration/bookings-race.test.js`, `api/test/helpers/factories.js`
- `api/package.json`: CHỈ thêm script `race`

Không được: thêm package, sửa migration, sửa module events/sections (chỉ được gọi repo của chúng).

## Hợp đồng

`POST /api/v1/bookings` — quyền: User (mọi role đã đăng nhập).

Body: `{ eventId: uuid, seatIds: uuid[] }` — 1 đến 6 phần tử, không trùng nhau (trùng → 400).

Thành công 201:

```json
{
  "success": true,
  "data": {
    "id": "…", "status": "PENDING", "eventId": "…",
    "totalAmount": 1000000, "expiresAt": "2026-11-01T10:10:00.000Z",
    "items": [{ "seatId": "…", "section": "VIP", "row": "A", "number": 1, "price": 500000 }]
  }
}
```

Các bước trong `BookingService.holdSeats(actor, { eventId, seatIds })`, toàn bộ trong MỘT `withTransaction`:

1. Đọc event; không tồn tại hoặc không PUBLISHED → 404 `EVENT_NOT_FOUND`;
   `start_time <= now()` → 409 `EVENT_ALREADY_STARTED`.
2. Khóa ghế: `SELECT s.*, sec.name, sec.price FROM seats s JOIN sections sec ON sec.id = s.section_id
   WHERE s.id = ANY($1) AND s.event_id = $2 ORDER BY s.id FOR UPDATE OF s`.
   `ORDER BY s.id` là bắt buộc: khóa theo cùng một thứ tự để tránh deadlock.
3. Số ghế đọc được khác số ghế yêu cầu (sai id hoặc ghế của event khác) → 400 `INVALID_SEATS`.
4. Ghế trống khi: `status = 'AVAILABLE'` HOẶC (`status = 'HELD'` VÀ `held_until < now()`).
   Có ghế không trống → 409 `SEAT_NOT_AVAILABLE`, `details` = mảng id các ghế đó.
5. Update các ghế: `HELD`, `held_by = actor.id`, `held_until = now() + HOLD_MINUTES`.
6. Tạo booking PENDING với `expires_at` bằng đúng `held_until` ở bước 5; tạo booking_items với giá
   lấy từ section tại thời điểm này; `total_amount` = tổng giá.

So sánh thời gian dùng `now()` của PostgreSQL trong SQL, không dùng `new Date()` của Node,
để mọi so sánh dùng chung một đồng hồ.

## Prompt 1 — Repository và service

Unit test `BookingService` với repo giả và `withTransaction` giả (ghi lại commit/rollback):

1. Ghế BOOKED → ném `SEAT_NOT_AVAILABLE`, `details` chứa đúng id ghế đó, transaction rollback
2. 7 ghế → lỗi validation (schema), service không được gọi
3. Repo trả về 1 ghế khi yêu cầu 2 → `INVALID_SEATS`
4. 2 ghế giá 500000 và 1 ghế giá 200000 → `totalAmount === 1200000`

Hoàn thành khi: test unit xanh.

## Prompt 2 — Route và integration test

Integration test (event seed như P01: VIP 500000, Thường 200000):

1. Giữ 2 ghế VIP → 201, `totalAmount === 1000000`, 2 ghế trong DB là `HELD`
2. `expiresAt` cách thời điểm tạo trong khoảng 9 phút 50 giây đến 10 phút 10 giây
3. Giữ ghế đã BOOKED → 409 `SEAT_NOT_AVAILABLE`, DB không có booking mới
4. Ghế HELD có `held_until` trong quá khứ → giữ được (201)
5. Một ghế của event khác trong `seatIds` → 400 `INVALID_SEATS`
6. Event bắt đầu trong quá khứ (sửa bằng SQL) → 409 `EVENT_ALREADY_STARTED`
7. Chưa đăng nhập → 401

## Prompt 3 — Chứng minh chống đặt trùng

`bookings-race.test.js`: tạo 20 user, gọi `bookingService.holdSeats` cho CÙNG một ghế bằng
`Promise.allSettled` với 20 actor khác nhau. Kiểm tra:

1. Đúng 1 promise `fulfilled`
2. 19 promise `rejected` với `code === 'SEAT_NOT_AVAILABLE'`
3. DB có đúng 1 booking và 1 booking_item cho ghế đó

Test thứ 4: user A giữ ghế [1, 2], user B giữ ghế [2, 1] cùng lúc, lặp 20 lần
→ không lần nào có lỗi deadlock (`code === '40P01'`), mỗi lần đúng 1 người thành công.

`scripts/race-test.js` (`npm run race`, chạy trên DB dev đã seed): 50 user ảo gọi API thật
`POST /bookings` cùng một ghế qua `fetch` song song, in bảng: số 201, số 409, số lỗi khác.
Kết quả đúng: 1 / 49 / 0. Kết quả này sẽ chép vào README.

Hoàn thành khi: test race chạy xanh 5 lần liên tiếp (`npm test` 5 lần).

## Hoàn thành giai đoạn

- Chạy prompt rà soát trong PLAN.md. Đọc từng dòng `booking.service.js` và `seat.repo.js`.
- Thử nghịch: tạm xóa `FOR UPDATE`, chạy lại race test, thấy test đỏ, rồi `git restore`.
  Đây là bằng chứng bạn hiểu vì sao cần khóa.
- Commit gợi ý: `feat(bookings): hold seats with row-level locking`, `feat(bookings): add hold endpoint`, `test(bookings): add concurrency tests and race script`

# Brief — P06 Section, sinh ghế, sơ đồ ghế, upload banner

## Mục tiêu

Organizer tạo khu vực, hệ thống tự sinh ghế; mọi người xem được sơ đồ ghế; organizer upload banner.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/section.repo.js`, `api/src/repositories/seat.repo.js`, `api/src/repositories/event.repo.js`
- `api/src/modules/sections/`, `api/src/modules/events/` (thêm banner và seats)
- `api/src/services/storage/` (`supabase-storage.js`, `fake-storage.js`)
- `api/src/middlewares/upload.js`
- `api/src/config/env.js` (thêm `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, tùy chọn khi test)
- `api/.env.example`
- `api/src/container.js`, `api/src/app.js`
- `api/test/unit/section.service.test.js`, `api/test/integration/sections.test.js`,
  `api/test/integration/banner.test.js`, `api/test/helpers/factories.js`

Không được: thêm package, sửa migration.

## Hợp đồng

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| POST | /events/:id/sections | Chủ sự kiện | Body: name, price (số nguyên ≥ 0), rowCount (1–26), seatsPerRow (1–50) |
| PATCH | /sections/:id | Chủ sự kiện | Sửa name, price. Không sửa rowCount/seatsPerRow |
| DELETE | /sections/:id | Chủ sự kiện | Có ghế HELD hoặc BOOKED → 409 `SECTION_HAS_BOOKINGS` |
| GET | /events/:id/seats | Public (theo quyền xem event ở P05) | Sơ đồ ghế |
| POST | /events/:id/banner | Chủ sự kiện | multipart, field `banner` |

Tạo section và sinh ghế trong MỘT `withTransaction`. Ghế sinh bằng một câu
`INSERT ... SELECT` với hai `generate_series` (hàng và số ghế); nhãn hàng = `chr(64 + n)` (A, B, ...).
Không dùng vòng lặp INSERT từng ghế trong JS. Trùng tên section trong cùng event → 409 `SECTION_NAME_TAKEN`.
Sự kiện CANCELLED → 409 `EVENT_CANCELLED`.

Response `GET /events/:id/seats`:

```json
{
  "success": true,
  "data": {
    "eventId": "…",
    "sections": [
      {
        "id": "…", "name": "VIP", "price": 500000,
        "rows": [
          { "label": "A", "seats": [{ "id": "…", "number": 1, "status": "AVAILABLE" }] }
        ]
      }
    ]
  }
}
```

Ghế `HELD` mà `held_until < now()` được trả về là `AVAILABLE`. Không trả `heldBy`.
Section sắp theo giá giảm dần, hàng theo nhãn, ghế theo số.

Storage: interface `upload({ key, buffer, contentType }) → Promise<{ url }>`. `SupabaseStorage` dùng
`@supabase/supabase-js`; `FakeStorage` giữ file trong bộ nhớ, trả url `memory://<key>`, dùng trong test.
Container chọn `FakeStorage` khi `NODE_ENV=test`.

Upload: multer memory storage, tối đa 2 MB, chỉ `image/jpeg`, `image/png`, `image/webp`.
Sai loại → 400 `INVALID_FILE_TYPE`; quá cỡ → 400 `FILE_TOO_LARGE`. Key: `events/<eventId>/<uuid>.<ext>`.

## Prompt 1 — Section và sinh ghế

Test cần viết:

1. (integration) Tạo section 10 hàng × 20 ghế → đúng 200 ghế trong DB
2. (integration) Ghế đầu là hàng `A` số `1`, ghế cuối là hàng `J` số `20`
3. (integration) Tạo trùng tên section → 409 `SECTION_NAME_TAKEN`
4. (integration) `rowCount: 27` → 400
5. (integration) Xóa section có 1 ghế BOOKED (đặt bằng SQL trong test) → 409 `SECTION_HAS_BOOKINGS`
6. (unit) Organizer khác tạo section → `NOT_EVENT_OWNER`

## Prompt 2 — Sơ đồ ghế

Test cần viết:

1. Event có VIP (giá 500000) và Thường (giá 200000) → `sections[0].name === 'VIP'`
2. Ghế HELD có `held_until` trong quá khứ → trả về `AVAILABLE`
3. Ghế HELD còn hạn → trả về `HELD`; JSON không chứa chuỗi `heldBy`

## Prompt 3 — Upload banner

Test cần viết (dùng `FakeStorage`):

1. Upload PNG nhỏ → 200, `bannerUrl` của event bắt đầu bằng `memory://events/`
2. Upload file `text/plain` → 400 `INVALID_FILE_TYPE`
3. Upload buffer 3 MB → 400 `FILE_TOO_LARGE`

Việc của bạn: tạo bucket public trên Supabase, điền 3 biến vào `.env`, thử upload thật bằng Postman.

## Hoàn thành giai đoạn

- Commit gợi ý: `feat(sections): create sections with generated seats`, `feat(events): add seat map endpoint`, `feat(events): add banner upload`

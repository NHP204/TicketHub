# Brief — P10 Thống kê và tài liệu Swagger

## Mục tiêu

Organizer và admin xem số liệu bằng SQL aggregate; toàn bộ API có tài liệu OpenAPI xem được ở `/api-docs`.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/stats.repo.js`
- `api/src/modules/stats/`
- `api/docs/openapi.yaml`
- `api/src/app.js` (gắn swagger-ui), `api/src/container.js`
- `api/test/integration/stats.test.js`, `api/test/integration/openapi.test.js`

Không được: thêm package, sửa migration, đổi hành vi endpoint cũ.

## Hợp đồng

Doanh thu chỉ tính booking `PAID`, bằng tổng `booking_items.price`. Tiền là số nguyên đồng.
`fillRate` là phần trăm, làm tròn 1 chữ số thập phân, kiểu number (ví dụ `8.3`).

| Method | Path | Quyền | data |
| --- | --- | --- | --- |
| GET | /organizer/stats | Organizer | `[{ eventId, title, status, capacity, ticketsSold, revenue, fillRate }]` của mình |
| GET | /organizer/events/:id/stats | Chủ sự kiện | `{ eventId, revenue, ticketsSold, sections: [{ name, price, capacity, sold, held, revenue, fillRate }] }` |
| GET | /admin/stats | Admin | `{ usersByRole: { USER, ORGANIZER, ADMIN }, events: { DRAFT, PUBLISHED, CANCELLED }, totalRevenue, ticketsSold }` |

Mỗi endpoint dùng tối đa 2 câu SQL (dùng `GROUP BY`, `FILTER (WHERE ...)`, `LEFT JOIN`), không lặp query trong JS.
Event chưa bán vé nào vẫn xuất hiện với `revenue: 0`, `ticketsSold: 0`, `fillRate: 0`.

## Prompt 1 — Stats

Integration test, dữ liệu: event seed (VIP 2×5 giá 500000, Thường 5×10 giá 200000, sức chứa 60).
User1 mua 2 VIP + 3 Thường (PAID). User2 giữ 1 Thường (PENDING). Giá trị mong đợi tính tay:

1. `/organizer/stats`: `revenue === 1600000`, `ticketsSold === 5`, `capacity === 60`, `fillRate === 8.3`
2. Section VIP: `sold === 2`, `revenue === 1000000`, `fillRate === 20`
3. Section Thường: `sold === 3`, `held === 1`, `revenue === 600000`, `fillRate === 6`
4. Một event thứ hai chưa bán vé → có mặt trong danh sách với `revenue === 0`
5. Organizer khác gọi stats của event này → 403 `NOT_EVENT_OWNER`
6. `/admin/stats` → `usersByRole.USER === 2` (theo dữ liệu test tạo)

## Prompt 2 — OpenAPI

`docs/openapi.yaml` (OpenAPI 3.0.3) mô tả MỌI endpoint đã có: tham số, body, response thành công,
các mã lỗi có thể trả về, `securitySchemes` bearer và cookie. Dùng `components/schemas` cho
`Error`, `User`, `Event`, `Booking`, `Ticket` để tránh lặp.

`app.js` đọc file bằng `yaml`, phục vụ ở `/api-docs` bằng `swagger-ui-express`.

Test cần viết:

1. `GET /api-docs/` → 200, content-type html
2. Parse `openapi.yaml`: mọi route đã đăng ký trong các router đều có trong `paths`
   (lấy danh sách route bằng cách viết tay một mảng trong test, so sánh với `paths`)

Hoàn thành khi: mở `http://localhost:4000/api-docs` thử "Try it out" login và gọi `/users/me` được.

## Hoàn thành giai đoạn

- Backend hoàn chỉnh: tag `p10` là bản API có thể demo độc lập.
- Commit gợi ý: `feat(stats): add organizer and admin statistics`, `docs(api): add openapi spec and swagger ui`

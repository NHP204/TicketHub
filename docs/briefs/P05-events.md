# Brief — P05 Sự kiện: CRUD, publish, tìm kiếm, phân trang

## Mục tiêu

Organizer quản lý sự kiện của mình; ai cũng xem và tìm được sự kiện đã công khai.

## Phạm vi

Được phép tạo/sửa:

- `api/src/repositories/event.repo.js`
- `api/src/modules/events/` (routes, controller, service, schemas)
- `api/src/container.js`, `api/src/app.js`
- `api/test/unit/event.service.test.js`, `api/test/integration/events.test.js`,
  `api/test/helpers/factories.js` (hàm tạo user/token/event cho test)

Không được: thêm package, sửa migration, sửa module auth/users.

## Hợp đồng

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| GET | /events | Public | Chỉ PUBLISHED. Query: `q`, `from`, `to`, `sort`, `order`, `page`, `limit` |
| GET | /events/:id | Public | PUBLISHED: ai cũng xem. DRAFT/CANCELLED: chỉ chủ sự kiện hoặc admin, người khác → 404 |
| GET | /organizer/events | Organizer | Mọi sự kiện của chính mình, mọi trạng thái |
| POST | /events | Organizer | Tạo DRAFT. Body: title, description, venue, startTime, endTime |
| PATCH | /events/:id | Chủ sự kiện | Chỉ khi DRAFT hoặc PUBLISHED; CANCELLED → 409 `EVENT_CANCELLED` |
| POST | /events/:id/publish | Chủ sự kiện | Chỉ từ DRAFT; cần có ít nhất 1 section → nếu chưa có: 409 `EVENT_HAS_NO_SECTIONS` |
| POST | /events/:id/cancel | Chủ sự kiện hoặc Admin | Chuyển CANCELLED |

Quy tắc:

- `startTime` phải ở tương lai; `endTime > startTime` → sai: 400 `VALIDATION_ERROR`.
- Không phải chủ sự kiện (và không phải admin khi được phép) → 403 `NOT_EVENT_OWNER`.
- Không tìm thấy → 404 `EVENT_NOT_FOUND`.
- `q`: tìm `ILIKE` trong title và venue (tham số hóa, escape `%` và `_` trong input).
- `sort` chỉ nhận `startTime` | `createdAt` | `title` (whitelist, map sang tên cột); mặc định `startTime`.
  `order`: `asc` | `desc`, mặc định `asc`. Giá trị khác → 400.
- `page` ≥ 1 mặc định 1; `limit` 1–50 mặc định 10.
- `meta = { page, limit, total, totalPages }`; `total` lấy bằng `COUNT(*) OVER()` trong cùng câu query.

Kiểm tra quyền sở hữu nằm trong service (service nhận `actor = { id, role }`), không nằm ở controller.

## Prompt 1 — Repository, service, tạo và sửa

Unit test `EventService` với repo giả:

1. Organizer A sửa sự kiện của organizer B → `NOT_EVENT_OWNER`
2. Admin cancel sự kiện của organizer A → thành công
3. Sửa sự kiện CANCELLED → `EVENT_CANCELLED`
4. Publish sự kiện chưa có section → `EVENT_HAS_NO_SECTIONS`

Hoàn thành khi: test unit xanh.

## Prompt 2 — Routes, tìm kiếm, phân trang

Integration test (tạo dữ liệu bằng `factories.js`):

1. User role USER tạo sự kiện → 403
2. Tạo 12 sự kiện PUBLISHED + 3 DRAFT; `GET /events?limit=5&page=3` → 2 item, `meta.total === 12`, `meta.totalPages === 3`
3. `GET /events?q=jazz` chỉ trả sự kiện có "Jazz" trong title hoặc venue (không phân biệt hoa thường)
4. `GET /events?q=%` không trả về tất cả sự kiện (ký tự `%` được escape)
5. `GET /events?sort=password_hash` → 400
6. Người lạ xem sự kiện DRAFT → 404; chủ sự kiện xem → 200

Hoàn thành khi: toàn bộ test xanh; dùng curl tạo và sửa được một sự kiện bằng token organizer từ seed.

## Hoàn thành giai đoạn

- Commit gợi ý: `feat(events): add event service with ownership rules`, `feat(events): add routes with search and pagination`

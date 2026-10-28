# Brief — P02 Lỗi, response chuẩn, validate, logger

## Mục tiêu

Xây phần lõi mà mọi module dùng chung: lớp lỗi, helper response, middleware validate,
error handler, 404 handler, logger, và `container.js`.

## Phạm vi

Được phép tạo/sửa:

- `api/src/errors/` (`app-error.js` chứa `AppError` và 5 lớp con)
- `api/src/utils/response.js`, `api/src/utils/logger.js`
- `api/src/middlewares/validate.js`, `error-handler.js`, `not-found.js`
- `api/src/container.js`
- `api/src/app.js` (gắn not-found và error handler ở cuối, nhận `deps`)
- `api/test/unit/error-handler.test.js`, `validate.test.js`, `api/test/integration/errors.test.js`

Không được: thêm package, sửa migration, sửa test có sẵn.

## Hợp đồng

`AppError(status, code, message, details?)`. Lớp con có status và code mặc định:

| Lớp | Status | Code mặc định |
| --- | --- | --- |
| ValidationError | 400 | VALIDATION_ERROR |
| UnauthorizedError | 401 | UNAUTHORIZED |
| ForbiddenError | 403 | FORBIDDEN |
| NotFoundError | 404 | NOT_FOUND |
| ConflictError | 409 | CONFLICT |

Mỗi lớp con cho phép truyền code riêng: `new ConflictError('SEAT_NOT_AVAILABLE', 'message', details)`.

`utils/response.js`: `export function ok(res, data, { status = 200, meta } = {})`.

`validate({ body, query, params })`: mỗi phần là Zod schema (tùy chọn). Parse thành công →
gán kết quả đã parse vào `req.validated = { body, query, params }`. Thất bại → `next(new ValidationError(...))`,
`details` là mảng `{ path, message }` lấy từ Zod issues.

`errorHandler(logger)` trả về middleware 4 tham số:

- `AppError` → status và `{ success: false, error: { code, message, details } }` (bỏ `details` nếu undefined)
- Body JSON hỏng (`err.type === 'entity.parse.failed'`) → 400 `INVALID_JSON`
- Lỗi khác → 500 `INTERNAL_ERROR`, message "Internal server error", log lỗi đầy đủ bằng logger

`notFound` → 404 `ROUTE_NOT_FOUND`.

`container.js`: `export function buildContainer({ env, pool })` trả về object rỗng `{ logger }` ở giai đoạn này;
các giai đoạn sau sẽ thêm service. `createApp(deps)` nhận `{ corsOrigin, logger, routers }`.

## Prompt 1 — Lớp lỗi, response, validate

Test cần viết (`validate.test.js`, dùng req/res/next giả):

1. Body hợp lệ → `next()` không có tham số, `req.validated.body` là dữ liệu đã parse
2. Body thiếu trường bắt buộc → `next` nhận `ValidationError`, `status === 400`
3. `details[0].path` bằng tên trường bị thiếu

Hoàn thành khi: test unit xanh.

## Prompt 2 — Error handler, not-found, logger, nối vào app

Logger winston: format JSON khi production, dạng dễ đọc khi development, tắt khi `NODE_ENV=test`.

Test cần viết:

1. (unit) `ConflictError('SEAT_NOT_AVAILABLE', 'x', ['a'])` → status 409, body `{ success: false, error: { code: 'SEAT_NOT_AVAILABLE', message: 'x', details: ['a'] } }`
2. (unit) `new Error('boom')` → status 500, code `INTERNAL_ERROR`, message không chứa `boom`
3. (integration) `GET /api/v1/khong-ton-tai` → 404, code `ROUTE_NOT_FOUND`
4. (integration) POST body `{bad json` với header JSON → 400, code `INVALID_JSON`

Hoàn thành khi: toàn bộ test xanh, test health ở P00 vẫn xanh.

## Hoàn thành giai đoạn

- Commit gợi ý: `feat(core): add error classes and validate middleware`, `feat(core): add error handler and logger`

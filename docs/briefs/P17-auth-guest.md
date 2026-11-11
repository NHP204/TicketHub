# Brief — P17 Phiên đăng nhập: khách không phải là lỗi

## Mục tiêu

Khách chưa đăng nhập không gây lỗi đỏ trong Console, và trang công khai hiện ngay mà không chờ
kiểm tra phiên. Không đổi giao diện.

## Phạm vi

Được phép sửa/tạo:

- Prompt 1: `api/src/modules/auth/`, `api/test/integration/refresh.test.js`, `api/docs/openapi.yaml`,
  `web/src/context/auth-context.jsx`, `web/src/api/client.js`
- Prompt 2: `web/src/context/auth-context.jsx`, `web/src/router.jsx`,
  `web/src/components/ProtectedRoute.jsx`, `web/src/main.jsx`, `web/src/pages/HomePage.jsx`
  (chỉ thông báo máy chủ khởi động), test web liên quan

Không được: thêm package; đổi giao diện ngoài thông báo ở Prompt 2.

## Prompt 1 — Không coi "chưa đăng nhập" là lỗi

- `POST /auth/refresh` không có cookie → 204, không body, không Set-Cookie. Cookie sai/hết hạn → vẫn 401
  `INVALID_REFRESH_TOKEN`; dùng lại → vẫn `TOKEN_REUSED`.
- Sửa test cũ "không cookie → 401" thành 204; thêm test cookie rác → 401.
- Cập nhật `openapi.yaml` cho response 204.
- Web: khởi động nhận 204 → 'guest'; refresh 204 trong lúc tự làm mới → như refresh thất bại.

Kiểm tra: tab ẩn danh, Console sạch, `refresh` trả 204.

## Prompt 2 — Trang công khai không chờ kiểm tra đăng nhập

- `/` và `/events/:id` render ngay; chỉ `ProtectedRoute` chờ
- Mọi nhánh của lần refresh khi khởi động kết thúc ở 'authenticated' hoặc 'guest'.
- axios timeout 60 giây; QueryClient không retry lỗi 4xx, lỗi mạng/5xx retry tối đa 2 lần.
- Danh sách sự kiện tải quá 5 giây → "Máy chủ đang khởi độngphút."
- Test: refresh treo mãi thì trang danh sách vẫn hiện dữ liệu.

## Commit gợi ý

- `fix(auth): treat missing refresh cookie as guest`
- `fix(web): render public pages without waiting for session
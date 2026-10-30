# Brief — P15 Chức năng theo vai trò

## Mục tiêu

Mỗi vai trò chỉ thấy và chỉ dùng được đúng chức năng của mình. USER đặt vé; ORGANIZER quản lý
sự kiện của mình; ADMIN quản lý hệ thống. ORGANIZER và ADMIN không đặt vé, không có vé.

Chặn ở API là lớp bảo vệ thật; ẩn ở web chỉ để giao diện gọn. Mọi chức năng bị ẩn ở web
cũng phải bị API từ chối nếu gọi thẳng.

## Ma trận chức năng

| Chức năng | Khách | USER | ORGANIZER | ADMIN |
| --- | --- | --- | --- | --- |
| Xem, tìm sự kiện đã công khai | ✓ | ✓ | ✓ | ✓ |
| Xem sơ đồ ghế | ✓ (chỉ xem) | ✓ (chọn được) | ✓ (chỉ xem) | ✓ (chỉ xem) |
| Giữ ghế, thanh toán, hủy booking | — | ✓ | — | — |
| Lịch sử booking, vé của tôi | — | ✓ | — | — |
| Tạo, sửa, publish sự kiện; section; banner | — | — | ✓ (của mình) | — |
| Hủy sự kiện | — | — | ✓ (của mình) | ✓ (mọi sự kiện) |
| Xem sự kiện DRAFT | — | — | ✓ (của mình) | ✓ |
| Thống kê sự kiện | — | — | ✓ (của mình) | — |
| Thống kê toàn hệ thống | — | — | — | ✓ |
| Quản lý user (đổi role, khóa) | — | — | — | ✓ |
| Trang tài khoản (sửa tên, đổi mật khẩu) | — | ✓ | ✓ | ✓ |
| Đăng ký | ✓ (luôn thành USER) | — | — | — |

Tài khoản ORGANIZER và ADMIN không tự đăng ký được; admin nâng role cho user có sẵn.

Trang đích sau khi đăng nhập: USER → `/`, ORGANIZER → `/organizer`, ADMIN → `/admin`.
Nếu có `?next=` và trang đó hợp với role thì về `next`, nếu không thì về trang đích của role.

## Phạm vi

Được phép sửa/tạo:

- `api/src/modules/bookings/bookings.routes.js`, `api/src/modules/payments/payments.routes.js`,
  `api/src/modules/tickets/tickets.routes.js`
- `api/docs/openapi.yaml` (cập nhật quyền của các endpoint trên)
- `api/test/integration/roles.test.js` (mới), `api/test/helpers/factories.js`
- Test có sẵn của bookings, payments, tickets: CHỈ khi test đó dùng ORGANIZER hoặc ADMIN để đặt vé
  (nêu rõ test nào và lý do trong tóm tắt)
- `web/src/router.jsx`, `web/src/components/Layout.jsx`, `web/src/components/ProtectedRoute.jsx`
- `web/src/pages/LoginPage.jsx`, `web/src/pages/EventDetailPage.jsx`
- `web/src/pages/admin/AdminDashboardPage.jsx` (mới), `web/src/pages/AccountPage.jsx` (mới)
- `web/src/api/admin.api.js`, `web/src/api/users.api.js` (mới)
- `web/src/utils/role-home.js` (mới) và test các file web trên

Không được: sửa service, repository, migration; thêm package.

## Prompt 1 — Chặn ở API

Gắn `authorize('USER')` cho:

- `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `POST /bookings/:id/cancel`
- `POST /bookings/:id/pay`
- `GET /tickets/me`, `GET /tickets/:code`

Ngoại lệ: `GET /bookings/:id` cho phép cả `ADMIN` (để tra cứu khi hỗ trợ), như P08 đã quy định.

Không đổi các endpoint organizer và admin (đã đúng từ P05, P06, P10).

Integration test `roles.test.js`:

1. ORGANIZER gọi `POST /bookings` → 403 `FORBIDDEN`
2. ADMIN gọi `POST /bookings` → 403 `FORBIDDEN`
3. ORGANIZER gọi `GET /tickets/me` → 403
4. USER gọi `POST /events` → 403
5. ADMIN gọi `POST /events` → 403
6. ORGANIZER gọi `GET /admin/users` → 403
7. USER gọi `GET /organizer/stats` → 403
8. ADMIN gọi `GET /bookings/:id` của một USER → 200

Hoàn thành khi: toàn bộ test api xanh (chạy tuần tự); Swagger ghi đúng role cho các endpoint đã đổi.

## Prompt 2 — Menu, route và trang đích ở web

`utils/role-home.js`: `export function roleHome(role)` trả `/`, `/organizer` hoặc `/admin`;
`export function canVisit(role, path)` cho biết role có được vào đường dẫn đó không
(dựa trên bảng route trong `router.jsx`, không lặp danh sách ở hai nơi nếu tránh được).

Route và quyền:

| Path | Role |
| --- | --- |
| `/`, `/events/:id` | Mọi người |
| `/checkout/:bookingId`, `/bookings`, `/tickets`, `/tickets/:code` | USER |
| `/organizer/**` | ORGANIZER |
| `/admin`, `/admin/users` | ADMIN |
| `/account` | Đã đăng nhập |
| `/login`, `/register` | Khách (đã đăng nhập thì chuyển về trang đích của role) |

Menu trong `Layout`:

- Khách: Sự kiện · Đăng nhập · Đăng ký
- USER: Sự kiện · Booking của tôi · Vé của tôi · Tài khoản · Đăng xuất
- ORGANIZER: Sự kiện · Quản lý sự kiện · Tài khoản · Đăng xuất
- ADMIN: Sự kiện · Tổng quan · Quản lý user · Tài khoản · Đăng xuất

Sai role vào trang → trang "Không có quyền" có nút về trang đích của role (không phải trang chủ chung).

Test:

1. `roleHome('ORGANIZER') === '/organizer'`
2. Đăng nhập ORGANIZER không có `next` → chuyển tới `/organizer`
3. Đăng nhập ORGANIZER với `next=/tickets` → chuyển tới `/organizer` (không phải `/tickets`)
4. Menu của ADMIN không có chữ "Vé của tôi"; menu của USER không có "Quản lý user"
5. ORGANIZER mở `/tickets` → thấy trang "Không có quyền"

## Prompt 3 — Trang sự kiện, tổng quan admin, tài khoản

EventDetailPage:

- Khách và USER: như P12.
- ORGANIZER và ADMIN: sơ đồ ghế chỉ xem (mọi ghế `disabled`, không có thanh chọn ghế và nút "Giữ ghế"),
  hiện dòng "Tài khoản quản lý không đặt vé". Nếu ORGANIZER là chủ sự kiện, thêm nút
  "Quản lý sự kiện này" tới `/organizer/events/:id`.

AdminDashboardPage (`/admin`): gọi `GET /admin/stats`; thẻ số user theo role, số sự kiện theo trạng thái,
tổng doanh thu (`formatVnd`), tổng vé đã bán; liên kết tới `/admin/users`.

AccountPage (`/account`): sửa họ tên; đổi mật khẩu (mật khẩu hiện tại, mật khẩu mới, nhập lại).
Đổi mật khẩu thành công → thông báo và đăng xuất (API đã thu hồi mọi refresh token ở P04).

Test:

1. EventDetailPage với ORGANIZER: không có nút "Giữ ghế"; mọi nút ghế đều `disabled`
2. EventDetailPage với ORGANIZER là chủ sự kiện: có liên kết tới `/organizer/events/<id>`
3. AdminDashboardPage với dữ liệu giả `totalRevenue: 1600000` → hiện `1.600.000 đ`
4. AccountPage: mật khẩu mới và nhập lại khác nhau → hiện lỗi, không gọi API

Hoàn thành khi (thử tay trên bản deploy): đăng nhập lần lượt 3 tài khoản seed, mỗi tài khoản chỉ thấy
đúng menu trong bảng trên; gõ tay URL của role khác thì bị chặn ở web, và gọi thẳng API thì nhận 403.

## Hoàn thành giai đoạn

- Toàn bộ test api và web xanh; CI xanh trên GitHub.
- Commit gợi ý: `feat(api): restrict booking and ticket endpoints to users`,
  `feat(web): role-based navigation and landing pages`,
  `feat(web): add admin dashboard and account page`

# Brief — P13 Web: organizer và admin

## Mục tiêu

Organizer tạo và quản lý sự kiện, khu vực, banner, xem thống kê; admin quản lý user.

## Phạm vi

Được phép tạo/sửa trong `web/src/`:

- `api/organizer.api.js`, `api/admin.api.js`
- `pages/organizer/` (`DashboardPage.jsx`, `EventFormPage.jsx`, `EventManagePage.jsx`, `StatsPage.jsx`)
- `pages/admin/UsersPage.jsx`
- `components/SectionEditor.jsx`, `components/BannerUpload.jsx`, `components/StatCard.jsx`,
  `components/ConfirmDialog.jsx`
- `router.jsx`, `components/Layout.jsx` (thêm mục menu theo role)
- Test: `src/**/*.test.jsx` cho các file trên

Ngoại lệ: được cài `recharts`. Không được sửa `api/client.js`, `auth-context.jsx`, bất cứ thứ gì ngoài `web/`.

## Hợp đồng

Route (bọc `ProtectedRoute`):

| Path | Role | Nội dung |
| --- | --- | --- |
| /organizer | ORGANIZER | Bảng sự kiện của mình: tên, trạng thái, ngày, vé bán, doanh thu |
| /organizer/events/new | ORGANIZER | Form tạo sự kiện |
| /organizer/events/:id | ORGANIZER | Sửa thông tin, banner, danh sách section, nút Publish / Hủy sự kiện |
| /organizer/events/:id/stats | ORGANIZER | Thẻ tổng + biểu đồ cột doanh thu theo section (Recharts) |
| /admin/users | ADMIN | Bảng user, lọc role, đổi role, khóa/mở khóa |

Quy tắc:

- Form validate phía client giống schema API (ngày kết thúc sau ngày bắt đầu, giá là số nguyên ≥ 0),
  nhưng vẫn hiển thị lỗi từ API nếu server từ chối.
- SectionEditor: nhập tên, giá, số hàng, số ghế mỗi hàng; hiện "Sẽ tạo N ghế" trước khi bấm lưu.
- Publish, Hủy sự kiện, Xóa section, Khóa user đều qua `ConfirmDialog`.
- BannerUpload: kiểm tra loại và cỡ (≤ 2 MB) trước khi gửi; xem trước ảnh.
- Tiền hiển thị bằng `formatVnd`.

## Prompt 1 — Dashboard, form sự kiện, section, banner

Test:

1. EventForm: ngày kết thúc trước ngày bắt đầu → hiện lỗi, không gọi API
2. SectionEditor: 10 hàng × 20 ghế → hiện "Sẽ tạo 200 ghế"
3. BannerUpload: file 3 MB → hiện lỗi, không gọi API
4. API trả 409 `EVENT_HAS_NO_SECTIONS` khi publish → hiện thông báo dễ hiểu

## Prompt 2 — Thống kê và admin

Test:

1. StatsPage với dữ liệu giả `revenue: 1600000` → hiện `1.600.000 đ`
2. UsersPage: bấm "Khóa" → mở ConfirmDialog; bấm Hủy → không gọi API
3. Menu: user role USER không thấy mục "Quản lý sự kiện" và "Quản lý user"

Hoàn thành khi (thử tay): organizer tạo sự kiện mới, thêm 2 section, upload banner, publish;
user mua vé; organizer thấy doanh thu cập nhật.

## Hoàn thành giai đoạn

- Commit gợi ý: `feat(web): add organizer event management`, `feat(web): add stats and admin pages`

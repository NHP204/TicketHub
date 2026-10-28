# Brief — P12 Web: danh sách sự kiện, sơ đồ ghế, checkout, vé

## Mục tiêu

Người dùng đi hết luồng trên giao diện: tìm sự kiện → chọn ghế → thanh toán trong 10 phút → xem vé có QR.

## Phạm vi

Được phép tạo/sửa trong `web/src/`:

- `api/events.api.js`, `api/bookings.api.js`, `api/tickets.api.js`
- `pages/HomePage.jsx`, `pages/EventDetailPage.jsx`, `pages/CheckoutPage.jsx`,
  `pages/MyBookingsPage.jsx`, `pages/MyTicketsPage.jsx`, `pages/TicketPage.jsx`
- `components/EventCard.jsx`, `components/SeatMap.jsx`, `components/Countdown.jsx`,
  `components/Pagination.jsx`, `components/ErrorMessage.jsx`, `components/EmptyState.jsx`
- `hooks/useCountdown.js`, `hooks/useDebouncedValue.js`
- `router.jsx`, `components/Layout.jsx`
- Test: `src/**/*.test.jsx` cho các file trên

Không được: sửa `api/client.js`, `context/auth-context.jsx`, bất cứ thứ gì ngoài `web/`, thêm package.

## Hợp đồng

HomePage:

- Ô tìm kiếm là `<form role="search">` có `<label>`; gõ → debounce 300 ms → gọi API. Submit form không tải lại trang.
- Trạng thái tìm kiếm nằm trên URL (`?q=&page=`), nên F5 và nút Back giữ đúng kết quả.
- Mỗi sự kiện là `<li>` trong `<ul>`; hiển thị banner (có `alt`), tên `<h2>`, thời gian, địa điểm.
- Có trạng thái loading, lỗi (có nút thử lại), và rỗng ("Không có sự kiện khớp với “<chữ người dùng gõ>”").

SeatMap (`{ sections, selectedIds, onToggle, maxSelect = 6 }`):

- Mỗi ghế là `<button type="button">` có `aria-label` dạng "VIP hàng A ghế 1, 500.000 đ" và `aria-pressed`.
- Ghế HELD/BOOKED có thuộc tính `disabled` và màu khác.
- CHỈ MỘT `onClick` gắn trên phần tử bao sơ đồ (event delegation, đọc `data-seat-id`), không gắn cho từng ghế.
- Đã chọn đủ 6 ghế → ghế chưa chọn còn lại bị vô hiệu hóa; có chú thích màu.

EventDetailPage: thanh dưới cùng hiện số ghế đã chọn và tổng tiền; bấm "Giữ ghế" → `POST /bookings` →
sang `/checkout/:bookingId`. Lỗi `SEAT_NOT_AVAILABLE` → thông báo, tải lại sơ đồ, bỏ chọn các ghế trong `details`.

CheckoutPage: đồng hồ đếm ngược tính từ `expiresAt` của API (không tự đặt 10 phút ở client);
về 0 → khóa nút thanh toán và hiện "Hết thời gian giữ ghế". Nút "Thanh toán" (gọi `/pay`) và "Hủy" (gọi `/cancel`).
Thanh toán xong → `/tickets` với thông báo thành công. Nút bị khóa khi đang gửi để tránh bấm 2 lần.

MyTicketsPage / TicketPage: danh sách vé; trang chi tiết hiện ảnh QR (`<img src={qrData} alt="Mã QR vé TH-...">`).

## Prompt 1 — Danh sách sự kiện và tìm kiếm

Test:

1. Gõ "jazz" → sau 300 ms gọi API đúng 1 lần với `q=jazz` (dùng fake timers)
2. API trả rỗng → hiện đúng chữ người dùng gõ, kể cả ký tự `<b>` hiển thị nguyên văn
3. Submit form → không gọi `window.location.reload`, URL có `?q=`

## Prompt 2 — SeatMap và trang chi tiết

Test `SeatMap`:

1. Click ghế AVAILABLE → `onToggle` nhận đúng id
2. Ghế BOOKED có `disabled`, click không gọi `onToggle`
3. Đã chọn 6 ghế → ghế thứ 7 bị `disabled`
4. Click vào khoảng trống giữa các ghế → không gọi `onToggle`
5. Tổng tiền của 2 VIP + 1 Thường hiện `1.200.000 đ`

## Prompt 3 — Checkout, booking, vé

Test `useCountdown`:

1. `expiresAt` cách 90 giây → hiển thị `01:30`; tiến 30 giây → `01:00`
2. `expiresAt` trong quá khứ → `00:00` và `isExpired === true`

Hoàn thành khi (thử tay): user1 đặt 2 ghế, thanh toán, thấy 2 vé có QR; mở tab ẩn danh với user2,
ghế đó hiện là đã đặt; giữ ghế rồi chờ hết giờ thì nút thanh toán bị khóa.

## Hoàn thành giai đoạn

- `npm test`, `npm run lint`, `npm run build` xanh trong `web/`
- Commit gợi ý: `feat(web): add event list with search`, `feat(web): add seat map and hold flow`, `feat(web): add checkout and tickets`

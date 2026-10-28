# Brief — P09 Thanh toán giả lập, vé, mã QR

## Mục tiêu

User thanh toán booking PENDING (giả lập), ghế thành BOOKED, mỗi ghế sinh một vé có mã QR.
Thiết kế để sau này thêm VNPay mà không sửa `PaymentService` (nguyên tắc Open/Closed).

## Phạm vi

Được phép tạo/sửa:

- `api/src/modules/payments/` (`payment.service.js`, routes, controller, `providers/payment-provider.js`,
  `providers/mock.provider.js`)
- `api/src/modules/tickets/` (routes, controller, service)
- `api/src/repositories/payment.repo.js`, `ticket.repo.js`, `booking.repo.js`, `seat.repo.js`
- `api/src/utils/ticket-code.js`
- `api/src/container.js`, `api/src/app.js`
- `api/test/unit/payment.service.test.js`, `api/test/unit/ticket-code.test.js`,
  `api/test/integration/payments.test.js`, `api/test/integration/tickets.test.js`

Không được: sửa `booking.service.js` ngoài việc tái sử dụng repo, thêm package, sửa migration.

## Hợp đồng

`providers/payment-provider.js`: JSDoc mô tả interface, không có code chạy:
`charge({ bookingId, amount }) → Promise<{ success: boolean, transactionRef: string, reason?: string }>`.

`MockPaymentProvider({ shouldFail = () => false })`: thành công trả `transactionRef` dạng `MOCK-<uuid>`;
`shouldFail()` trả true → `{ success: false, reason: 'DECLINED' }`.

`POST /bookings/:id/pay` — chủ booking. `PaymentService.pay(actor, bookingId)`:

1. Trong `withTransaction`: khóa booking `FOR UPDATE`. Không phải của actor → 404 `BOOKING_NOT_FOUND`.
   Không PENDING → 409 `BOOKING_NOT_PENDING`. `expires_at <= now()` → 409 `BOOKING_EXPIRED`.
2. Gọi `provider.charge({ bookingId, amount: totalAmount })`.
3. Thất bại → ném 402 `PAYMENT_DECLINED`; booking giữ PENDING, ghế giữ HELD, không tạo vé,
   không ghi dòng `payments` nào (vì `payments.booking_id` là UNIQUE, một dòng FAILED sẽ chặn
   lần thanh toán lại).
4. Thành công → ghế BOOKED (`held_by`, `held_until` về NULL), booking PAID, tạo `payments` (SUCCESS),
   mỗi booking_item một `tickets` với `code` và `qr_data`.
5. Trả 200 `{ booking, tickets: [{ code, section, row, number, qrData }] }`.

Thêm lớp `PaymentRequiredError` (402) vào `errors/` nếu cần — được phép sửa `api/src/errors/app-error.js`.

`utils/ticket-code.js`: `generateTicketCode()` → `TH-` + 8 ký tự từ `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
(bỏ I, O, 0, 1), dùng `crypto.randomInt`. `qrData` = `QRCode.toDataURL(code)`.

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| GET | /tickets/me | User | Vé của mình kèm tên sự kiện, thời gian, ghế; không kèm `qrData` |
| GET | /tickets/:code | Chủ vé | Kèm `qrData`; người khác → 404 `TICKET_NOT_FOUND` |

## Prompt 1 — Provider, service, ticket code

Unit test:

1. `generateTicketCode()` khớp regex `^TH-[A-HJ-NP-Z2-9]{8}$`, chạy 1000 lần đều khớp
2. `PaymentService` với provider giả luôn thất bại → ném code `PAYMENT_DECLINED`, repo vé không được gọi
3. `PaymentService` với một provider giả viết ngay trong test (không phải Mock) vẫn chạy được →
   chứng minh service chỉ phụ thuộc interface

## Prompt 2 — Routes và integration

Integration test:

1. Giữ 2 ghế VIP rồi pay → 200, 2 vé, 2 ghế BOOKED, booking PAID, 1 dòng payments amount 1000000
2. Pay lần 2 → 409 `BOOKING_NOT_PENDING`, vẫn chỉ 1 dòng payments
3. Gửi 2 request pay cùng lúc → đúng 1 thành công
4. Booking quá hạn (sửa SQL) → 409 `BOOKING_EXPIRED`
5. Provider thất bại → 402, booking PENDING, ghế HELD, 0 vé
6. `GET /tickets/:code` của người khác → 404; của mình → `qrData` bắt đầu bằng `data:image/png;base64,`

## Hoàn thành giai đoạn

- Chạy prompt rà soát trong PLAN.md trước commit Prompt 2.
- Commit gợi ý: `feat(payments): add payment service with provider interface`, `feat(tickets): issue tickets with QR codes`

# Brief — P16 Làm mới giao diện

## Mục tiêu

Giao diện có bản sắc riêng của một nơi bán vé sự kiện, không giống template SaaS chung chung.
Ý tưởng chủ đạo: **"lịch diễn và tấm vé"**. Trang chủ đọc như tờ lịch diễn của một nhà hát;
sơ đồ ghế là trung tâm của trang sự kiện; vé trong "Vé của tôi" trông như cuống vé thật có
đường xé răng cưa. Tấm vé là chỗ duy nhất được phép "phô trương"; mọi thứ khác tiết chế.

Chỉ đổi giao diện. Không đổi hành vi, không đổi API, không đổi luồng nghiệp vụ.

## Phạm vi

Được phép sửa/tạo:

- `web/index.html` (thẻ font Google Fonts, `<title>`, favicon, `lang="vi"`)
- `web/src/index.css` (design token trong `@theme` của Tailwind v4, style nền)
- `web/src/components/` (sửa giao diện component có sẵn; tạo component nền mới trong `components/ui/`)
- `web/src/pages/` (chỉ phần JSX và class giao diện)
- Test web có sẵn: CHỈ khi chữ hiển thị hoặc cấu trúc thay đổi có chủ đích; liệt kê từng test đã sửa và lý do

Không được:

- Sửa `web/src/api/`, `context/`, `hooks/`, `utils/` (trừ khi thêm hàm định dạng mới thuần giao diện, phải hỏi trước)
- Đổi `aria-label`, `aria-pressed`, `data-seat-id`, `type` của nút, thuộc tính `disabled`, và cơ chế
  một `onClick` trên sơ đồ ghế
- Thêm package. Icon nếu cần thì viết SVG nội tuyến, tối đa vài icon dùng lại qua một component `Icon`
- Đụng tới `api/`

## Hệ thống thiết kế

### Màu

| Tên | Hex | Dùng cho |
| --- | --- | --- |
| ink | `#17162B` | Chữ chính, header, nền chân trang |
| paper | `#F6F7FB` | Nền trang (xám lạnh, không dùng màu kem) |
| surface | `#FFFFFF` | Bảng, form, sơ đồ ghế, tấm vé |
| cobalt | `#2B44D9` | Hành động chính, ghế đang chọn, liên kết |
| amber | `#F2A516` | CHỈ cho thứ có hạn thời gian: đồng hồ giữ ghế, booking PENDING. Chữ trên nền amber dùng ink |
| line | `#DADCE6` | Viền, đường kẻ bảng |
| muted | `#5E6075` | Chữ phụ (đạt tương phản AA trên paper) |

Màu theo khu vực ghế (gán theo thứ tự giá giảm dần, lặp lại nếu nhiều hơn 4):
`#7C4DDB` (tím), `#0E9F8E` (xanh ngọc), `#D6336C` (hồng đậm), `#2F80ED` (xanh dương).
Ghế đã đặt: `#C9CBD6`. Lỗi: `#C62828`. Thành công: `#1E8E5A`.

Không dùng gradient trang trí, không dùng nền đen gần như đen, không đổ bóng xám đồng loạt cho mọi khối.
Bóng đổ chỉ dùng cho thứ nổi lên trên trang: thanh chọn ghế cố định, dialog, menu.

### Chữ

- **Big Shoulders Display** (800): tên sự kiện, số ngày lớn trong lịch diễn, mã hàng-ghế trên vé
  (ví dụ "A12"), con số lớn trong thống kê. Đây là chữ "bảng hiệu nhà hát".
- **Be Vietnam Pro** (400, 500, 600): mọi chữ còn lại. Font được thiết kế cho tiếng Việt, dấu đẹp.
- Trước khi dùng, kiểm tra cả hai font có subset `vietnamese` trên Google Fonts. Nếu Big Shoulders
  không có, báo lại để chọn font khác, không tự đổi.
- Thang chữ tỉ lệ 1.25, gốc 16px: 12.8 / 16 / 20 / 25 / 31.25 / 39 / 48.8.
- Giá tiền và giờ dùng `font-variant-numeric: tabular-nums`.
- Đoạn văn tối đa khoảng 70 ký tự mỗi dòng.

Tránh: nhãn viết HOA giãn chữ phía trên tiêu đề; tô màu riêng một chữ trong tiêu đề; mũi tên "→"
gắn sau chữ của nút; chuỗi thông tin nối bằng dấu chấm giữa.

### Hình khối

- Bo góc theo cấp bậc, không một giá trị cho mọi thứ: nút và ô nhập 10px; khung bảng, form 12px;
  tấm vé 16px kèm hai khấc tròn ở đường xé; ghế 6px; huy hiệu trạng thái bo tròn hoàn toàn.
- Khoảng cách theo bội số 4px.

### Chuyển động

- Chỉ hai khoảnh khắc: (1) ghế đổi trạng thái khi chọn/bỏ chọn (co giãn nhẹ 120 ms);
  (2) vé xuất hiện một lần sau khi thanh toán thành công (tấm vé trượt lên, 400 ms).
- Không hiệu ứng xuất hiện cho từng khối khi cuộn, không hiệu ứng hover phóng to thẻ.
- Tôn trọng `prefers-reduced-motion`: tắt cả hai chuyển động.

### Chất lượng tối thiểu

- Hiển thị tốt từ 360px đến 1440px. Sơ đồ ghế trên điện thoại cuộn ngang trong khung riêng,
  trang không bị cuộn ngang.
- Viền focus bàn phím luôn nhìn thấy (vòng cobalt 2px, cách 2px).
- Tương phản chữ đạt WCAG AA.
- Lighthouse Accessibility trên trang chủ và trang sự kiện từ 95 trở lên.

### Chữ trong giao diện

- Tên hành động giữ nguyên xuyên suốt luồng: nút "Giữ ghế" → trang "Đang giữ ghế";
  nút "Thanh toán" → thông báo "Đã thanh toán".
- Lỗi nói rõ chuyện gì xảy ra và làm gì tiếp, không xin lỗi, không mơ hồ.
  Ví dụ: "Ghế A3 vừa có người giữ. Chọn ghế khác để tiếp tục."
- Trang trống là lời mời hành động. Ví dụ: "Bạn chưa có vé nào. Xem các sự kiện sắp diễn ra."

## Bố cục

Trang chủ: lịch diễn nhóm theo tháng, không phải lưới thẻ giống nhau.

```
┌────────────────────────────────────────────────────────┐
│ TicketHub          Sự kiện  Vé của tôi  Tài khoản      │
├────────────────────────────────────────────────────────┤
│ [Ảnh banner sự kiện gần nhất, rộng toàn trang]          │
│ TÊN SỰ KIỆN (Big Shoulders, lớn)                        │
│ Thứ Bảy 28/11, 20:00, Nhà hát Hòa Bình   [Chọn ghế]    │
├────────────────────────────────────────────────────────┤
│ [ô tìm kiếm có nhãn]                                   │
│ Tháng 11                                               │
│  28   Tên sự kiện               Địa điểm   Từ 200.000 đ │
│  T7   20:00                                [Chọn ghế]  │
│ ─────────────────────────────────────────────────────  │
│  30   ...                                              │
│ Tháng 12                                               │
└────────────────────────────────────────────────────────┘
```

Trang sự kiện: sơ đồ ghế là phần chính.

```
┌───────────────────────────┬────────────────────────────┐
│ Banner                    │ Tên, ngày giờ, địa điểm    │
│                           │ Mô tả ngắn                 │
├───────────────────────────┴────────────────────────────┤
│            ───────── Sân khấu ─────────                │
│   VIP   A  ■ ■ ■ ■ ■                                   │
│         B  ■ ■ ■ ■ ■                                   │
│ Thường  A  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■                         │
│ Chú thích: trống / đang chọn / đã có người             │
├────────────────────────────────────────────────────────┤
│ (cố định dưới cùng) 2 ghế: VIP A1, A2  1.000.000 đ [Giữ ghế] │
└────────────────────────────────────────────────────────┘
```

Tấm vé (Vé của tôi và trang chi tiết vé):

```
┌──────────────────────────────────┐ ┌──────────┐
│ Tên sự kiện                      │◖│  [QR]    │
│ Thứ Bảy 28/11, 20:00            │ │          │
│ VIP      A12  (Big Shoulders lớn)│◗│ TH-K7Q2… │
└──────────────────────────────────┘ └──────────┘
          đường xé răng cưa ↑
```

Khu quản lý (organizer, admin): yên tĩnh, ưu tiên bảng dữ liệu. Thanh điều hướng bên trái trên
màn hình rộng, chuyển thành menu trên cùng ở điện thoại. Số liệu lớn dùng Big Shoulders, không
bọc mỗi số trong một thẻ có bóng.

## Prompt 1 — Nền tảng thiết kế

Token màu, chữ, bo góc trong `index.css`; font trong `index.html`; component nền trong
`components/ui/`: `Button` (primary, secondary, danger, ghost; trạng thái loading và disabled),
`Input`/`Field` (nhãn, gợi ý, lỗi), `Badge` (trạng thái booking và sự kiện), `Panel`, `Icon`.
Làm mới `Layout` (header, chân trang, menu theo role như P15).

Trước khi viết code: trình bày bảng token và danh sách component, chỉ ra chỗ nào lệch brief.

Hoàn thành khi: test, lint, build xanh; mọi trang vẫn chạy, đã dùng font và màu mới.

## Prompt 2 — Trang chủ và trang sự kiện

Lịch diễn theo tháng, phần đầu trang là sự kiện gần nhất; trang sự kiện với sơ đồ ghế theo bố cục trên,
màu theo khu vực, chú thích, thanh chọn ghế cố định có tên ghế cụ thể và tổng tiền.

Hoàn thành khi: test xanh; trên điện thoại 360px chọn được ghế và bấm được "Giữ ghế" bằng một tay.

## Prompt 3 — Checkout và tấm vé

Checkout: đồng hồ giữ ghế nổi bật bằng amber, bản xem trước tấm vé, nút "Thanh toán".
Vé của tôi và chi tiết vé: tấm vé có đường xé (khấc tròn làm bằng CSS `radial-gradient` hoặc
pseudo-element), mã QR ở cuống vé; chuyển động xuất hiện một lần sau thanh toán.

Hoàn thành khi: test xanh; in trang chi tiết vé (Ctrl+P) ra một tấm vé gọn trên một trang.

## Prompt 4 — Khu quản lý

Áp dụng hệ thống cho dashboard organizer, form sự kiện, trình tạo section, thống kê, trang admin,
trang tài khoản. Biểu đồ Recharts dùng màu khu vực và màu token, bỏ màu mặc định của thư viện.

Hoàn thành khi: test xanh; các bảng cuộn ngang trong khung riêng trên điện thoại.

## Prompt 5 — Rà soát

Rà toàn bộ trang theo mục "Tránh" và "Chất lượng tối thiểu"; liệt kê vi phạm còn lại rồi sửa.
Kiểm tra mọi chỗ còn màu, cỡ chữ, bo góc viết cứng ngoài token.

Hoàn thành khi: Lighthouse Accessibility ≥ 95 ở trang chủ và trang sự kiện (bạn tự chạy trong DevTools);
không còn giá trị màu hex nào trong JSX.

## Cách làm việc riêng cho giai đoạn này

Giao diện phải nhìn mới đánh giá được. Sau mỗi prompt, mở `npm run dev`, chụp màn hình trang vừa đổi
ở cả máy tính và chế độ điện thoại (DevTools → Toggle device toolbar), dán ảnh vào Claude Code kèm
nhận xét cụ thể ("khoảng cách giữa các tháng quá rộng", "chữ giá bị xuống dòng ở 360px").
Claude Code đọc được ảnh. Sửa xong mới commit.

## Hoàn thành giai đoạn

- Test, lint, build xanh; CI xanh; bản deploy trên Vercel đã cập nhật.
- Commit gợi ý: `style(web): add design tokens and base components`,
  `style(web): redesign event listing and seat map`, `style(web): redesign checkout and tickets`,
  `style(web): redesign organizer and admin area`, `style(web): accessibility and consistency pass`

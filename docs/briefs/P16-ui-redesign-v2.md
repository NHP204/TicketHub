# Brief — P16 Làm mới giao diện (bản 2, làm lại)

Bản này thay cho `P16-ui-redesign.md`. Nó gộp hệ thống thiết kế gốc với mọi quyết định và lỗi đã
phát hiện trong lần làm P16 trước (các commit đã mất). Làm theo bản này để không lặp lại lỗi cũ.

## Mục tiêu

Giao diện có bản sắc riêng của nơi bán vé sự kiện. Ý tưởng chủ đạo: **"lịch diễn và tấm vé"**.
Trang chủ đọc như lịch diễn của nhà hát; sơ đồ ghế là trung tâm trang sự kiện; vé trông như cuống vé
thật có đường xé. Tấm vé là chỗ duy nhất được phô trương; mọi thứ khác tiết chế.

Chỉ đổi giao diện, trừ hai việc nhỏ được liệt kê ở Prompt 6 và 7.

## Phạm vi

Được phép sửa/tạo:

- `web/index.html` (font Google Fonts, `<title>`, favicon, `lang="vi"`)
- `web/src/index.css` (token trong `@theme` của Tailwind v4)
- `web/src/components/` (kể cả `SeatMap.jsx`, `SeatMap.test.jsx`), `web/src/components/ui/` (mới)
- `web/src/pages/`
- `web/src/utils/format.js`, `web/src/utils/format.test.js` (chỉ thêm `formatEventDateTime`)
- Test web có sẵn: chỉ khi chữ hoặc cấu trúc đổi có chủ đích; liệt kê từng test đã sửa và lý do

Không được: sửa `web/src/api/`, `context/`, `hooks/` (trừ Prompt 6, 7); đổi `aria-label`,
`aria-pressed`, `data-seat-id`, `disabled`, cơ chế một `onClick` trên sơ đồ ghế; thêm package; sửa `api/`
(trừ Prompt 6).

## Hệ thống thiết kế

### Màu

| Tên | Hex | Dùng cho |
| --- | --- | --- |
| ink | `#17162B` | Chữ chính, nền footer |
| paper | `#F6F7FB` | Nền trang |
| surface | `#FFFFFF` | Header, bảng, form, sơ đồ ghế, tấm vé |
| cobalt | `#2B44D9` | Hành động chính, ghế đang chọn, liên kết, giá tiền |
| amber | `#F2A516` | CHỈ cho thứ có hạn thời gian (đồng hồ giữ ghế, booking PENDING). Chữ trên amber dùng ink |
| line | `#DADCE6` | Viền, kẻ bảng |
| muted | `#5E6075` | Chữ phụ |

Màu khu vực (theo giá giảm dần, lặp lại nếu hơn 4): `#7C4DDB`, `#0E9F8E`, `#D6336C`, `#2F80ED`.
Ghế đã bán `#C9CBD6`. Lỗi `#C62828`. Thành công `#1E8E5A`.

**Lỗi lần trước:** còn sót màu indigo/violet mặc định của Tailwind ở ghế đang chọn, giá tiền, nút
"Giữ ghế". Không được dùng bất kỳ màu mặc định nào của Tailwind; chỉ dùng token.

### Chữ

- **Big Shoulders Display** 800: logo, tên sự kiện (mọi nơi), số ngày lớn trong lịch diễn, mã ghế trên vé,
  số liệu lớn. **Lỗi lần trước:** tên sự kiện vẫn dùng Be Vietnam Pro.
- **Be Vietnam Pro** 400/500/600: mọi chữ còn lại.
- Kiểm tra cả hai font có subset `vietnamese`; nếu không, dừng lại hỏi.
- Thang 1.25, gốc 16px. Chữ menu header 16px, weight 500 (**lỗi lần trước:** 14px, quá nhỏ).
- Giá và giờ dùng `tabular-nums`.

Tránh: nhãn HOA giãn chữ trên tiêu đề; tô màu riêng một chữ trong tiêu đề; "→" sau chữ của nút;
**dấu chấm giữa nối thông tin** (lỗi lần trước: "VIP · 500.000 đ", "Đã chọn 0 ghế · Tổng tiền").
Dùng dấu phẩy hoặc tách dòng.

### Ngày giờ

Thêm `formatEventDateTime(iso)` vào `utils/format.js`: `Intl.DateTimeFormat('vi-VN')`, `timeZone`
`'Asia/Ho_Chi_Minh'`, `formatToParts`, kết quả dạng `Chủ Nhật, 29/11/2026, 14:12` (viết hoa chữ đầu
mỗi từ của thứ). Không sửa `formatDateTime` cũ. Test (tính tay):

1. `'2026-11-29T07:12:00Z'` → `'Chủ Nhật, 29/11/2026, 14:12'`
2. `'2026-11-29T17:30:00Z'` → `'Thứ Hai, 30/11/2026, 00:30'`
3. `'2026-11-28T13:00:00Z'` → `'Thứ Bảy, 28/11/2026, 20:00'`

Mọi chỗ hiển thị thời gian sự kiện dùng hàm này.

### Khung trang

- Container chung: max-width **1280px**, padding ngang 24px (32px từ 1024px). Header, nội dung,
  thanh cố định đều thẳng hàng với container.
- Khối **full-bleed**: nền/ảnh tràn hết chiều ngang, nội dung bên trong vẫn trong container.
  Dùng cho phần đầu trang chủ và trang sự kiện.
- Không kéo nội dung chữ ra hết chiều ngang; đoạn văn tối đa khoảng 70 ký tự mỗi dòng.

### Hình khối và chuyển động

- Bo góc theo cấp: nút, ô nhập 10px; khung 12px; tấm vé 16px; ghế 6px; huy hiệu tròn hẳn.
- Bóng đổ chỉ cho thứ nổi: khung ghế đã chọn, thanh cố định, dialog, menu.
- Chuyển động chỉ hai lúc: chọn ghế (co giãn 120 ms rồi **về scale 1**), vé xuất hiện sau thanh toán
  (400 ms). Tắt khi `prefers-reduced-motion`.

### Chất lượng tối thiểu

360px–1440px; viền focus cobalt 2px offset 2px luôn thấy đủ 4 cạnh; tương phản AA;
Lighthouse Accessibility ≥ 95 ở trang chủ và trang sự kiện.

## Prompt 1 — Nền tảng, header, footer

Token, font, component nền `components/ui/` (`Button`, `Field`, `Badge`, `Panel`, `Icon`), container.

Header (nền surface, cao 72px):

- Logo: icon tấm vé SVG nhỏ + wordmark Big Shoulders.
- Menu theo role (P15); mục đang mở gạch chân cobalt 2px; chữ 16px weight 500, khoảng cách rộng dễ bấm.
- Khách: "Đăng nhập" là liên kết chữ, "Đăng ký" là nút primary. Đã đăng nhập: tên người dùng và menu theo role.
- Mép dưới là đường răng cưa nhỏ (hàng chấm tròn bằng radial-gradient), chi tiết trang trí duy nhất.
- Điện thoại: menu gập vào nút có `aria-expanded`.
- Trong lúc AuthContext đang 'loading', vùng đăng nhập hiện chỗ trống giữ chỗ (xem Prompt 7).

Footer (nền ink, mép trên cũng răng cưa):

- Cột 1: logo và một câu mô tả. Cột 2: Sự kiện, Vé của tôi, Tài khoản.
- Cột 3: Tài liệu API (`/api-docs` của backend), mã nguồn GitHub, "Dự án cá nhân: Node.js, PostgreSQL, React".
- Dòng cuối: năm và tên tác giả. Điện thoại: các cột xếp dọc.

## Prompt 2 — Trang chủ

- Phần đầu là khối full-bleed với sự kiện gần nhất: banner, hoặc **poster chữ** nếu không có banner
  (nền màu khu vực đầu tiên, tên sự kiện Big Shoulders cỡ lớn), ngày giờ, địa điểm, nút "Chọn ghế".
  Không dùng khối xám trống.
- Bên dưới: ô tìm kiếm có nhãn, rồi **lịch diễn nhóm theo tháng** (không phải lưới thẻ): số ngày lớn
  và thứ bên trái, tên sự kiện, giờ, địa điểm, "Từ X đ", nút "Chọn ghế".
- Trạng thái tải, lỗi (có nút "Thử lại"), rỗng (lời mời hành động).

## Prompt 3 — Trang sự kiện và sơ đồ ghế

Phần đầu: khối full-bleed như trang chủ (banner hoặc poster chữ, tên, `formatEventDateTime`, địa điểm, mô tả).

Từ 1024px:

```
┌────────────────────────────────────┬─────────────────────┐
│        ──── Sân khấu ────          │ Ghế đã chọn (sticky)│
│  VIP     A ■ ■ ■ ■ ■               │ VIP A2   500.000 đ ✕│
│          B ■ ■ ■ ■ ■               │ Thường A6 200.000 đ✕│
│  Thường  A ■ ■ ■ ■ ■ ■ ■ ■ ■ ■     │ Tổng   2.400.000 đ  │
│  Chú thích màu                     │ [     Giữ ghế     ] │
│                                    │ Giữ trong 10 phút   │
└────────────────────────────────────┴─────────────────────┘
```

- Cột phải 360px, sticky (top = chiều cao header + 24px): danh sách ghế đã chọn (khu vực, hàng, số, giá,
  nút bỏ chọn có `aria-label`, gọi cùng hàm toggle với sơ đồ), tổng tiền, nút "Giữ ghế" rộng hết khung,
  chú thích "Ghế được giữ trong 10 phút sau khi bấm". Chưa chọn: "Chọn ghế trên sơ đồ để bắt đầu".
  Thông báo "đã chọn tối đa 6 ghế" nằm trong khung này. Không hiện thanh dưới cùng.

Dưới 1024px: sơ đồ toàn chiều ngang; thanh cố định dưới cùng; bấm "Đã chọn N ghế" mở rộng danh sách
(`aria-expanded`).

**Lỗi lần trước, bắt buộc tránh:** ghế đang chọn hoặc đang focus ở **hàng đầu và hàng cuối** mỗi khu vực
bị cắt mép trên/dưới. Nguyên nhân: khung có `overflow-x: auto` làm trục dọc cũng bị cắt. Khung cuộn phải
có `padding-block: 6px; margin-block: -6px` (và tương tự theo chiều ngang cho cột đầu/cuối).

SeatMap có prop `readOnly` (P15): mọi ghế disabled nhưng vẫn đúng màu trạng thái, không có thông báo
tối đa, chú thích bỏ mục "Đang chọn". Dùng cho ORGANIZER và ADMIN.

Test: click ghế ở `readOnly` không gọi `onToggle`; nút bỏ chọn ở khung bên phải bỏ đúng ghế.

## Prompt 4 — Checkout và tấm vé

Checkout: đồng hồ giữ ghế nổi bật bằng amber, xem trước tấm vé, nút "Thanh toán" (khóa khi đang gửi).
Vé của tôi và chi tiết vé: tấm vé có đường xé (khấc tròn bằng CSS), QR ở cuống, mã ghế Big Shoulders;
chuyển động xuất hiện một lần sau thanh toán. In chi tiết vé (Ctrl+P) gọn trên một trang.

## Prompt 5 — Khu quản lý và rà soát

Áp dụng hệ thống cho organizer, admin, tài khoản: ưu tiên bảng; điều hướng bên trái từ 1024px;
Recharts dùng màu token. Sau đó rà toàn bộ: không còn màu hex trong JSX, không còn màu mặc định
Tailwind, không còn dấu chấm giữa, Lighthouse Accessibility ≥ 95.

## Prompt 6 — Không coi "chưa đăng nhập" là lỗi (ngoài giao diện)

Được sửa thêm: `api/src/modules/auth/`, `api/test/integration/refresh.test.js`, `api/docs/openapi.yaml`,
`web/src/context/auth-context.jsx`, `web/src/api/client.js`.

- `POST /auth/refresh` không có cookie → 204, không body, không Set-Cookie. Cookie sai/hết hạn → vẫn 401
  `INVALID_REFRESH_TOKEN`; dùng lại → vẫn `TOKEN_REUSED`.
- Sửa test cũ "không cookie → 401" thành 204; thêm test cookie rác → 401.
- Web: khởi động nhận 204 → 'guest'; refresh 204 trong lúc tự làm mới → như refresh thất bại.

Kiểm tra: tab ẩn danh, Console sạch, `refresh` trả 204.

## Prompt 7 — Trang công khai không chờ kiểm tra đăng nhập

Được sửa thêm: `auth-context.jsx`, `router.jsx`, `ProtectedRoute.jsx`, `main.jsx`.

- `/` và `/events/:id` render ngay; chỉ `ProtectedRoute` chờ AuthContext.
- Mọi nhánh của lần refresh khi khởi động kết thúc ở 'authenticated' hoặc 'guest'.
- axios timeout 60 giây; QueryClient không retry lỗi 4xx, lỗi mạng/5xx retry tối đa 2 lần.
- Danh sách sự kiện tải quá 5 giây → "Máy chủ đang khởi động, lần đầu có thể mất đến một phút."
- Test: refresh treo mãi thì trang danh sách vẫn hiện dữ liệu.

## Cách làm việc

Sau mỗi prompt: chạy dev, chụp ảnh ở 1440px, 1024px và 375px, dán vào Claude Code kèm nhận xét cụ thể.
Kiểm tra bằng phím Tab ở ghế đầu và cuối mỗi hàng. **Commit ngay sau mỗi prompt và push branch lên GitHub**
(`git push -u origin p16-ui` lần đầu) để không mất công lần nữa.

## Commit gợi ý

- `style(web): add design tokens, header and footer`
- `style(web): redesign home as event schedule`
- `style(web): redesign event page and seat map`
- `style(web): redesign checkout and tickets`
- `style(web): redesign admin area and consistency pass`
- `fix(auth): treat missing refresh cookie as guest`
- `fix(web): render public pages without waiting for session`

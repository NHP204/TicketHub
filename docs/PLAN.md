# TicketHub — Kế hoạch vibe code với Claude Code

Dự án chia thành 15 giai đoạn (P00–P14). Mỗi giai đoạn có một brief trong `docs/briefs/`,
mỗi brief gồm 2–5 prompt nhỏ. Sau MỖI prompt: chạy kiểm tra rồi commit. Sau MỖI giai đoạn:
merge vào `main` và gắn tag. Nhờ vậy lúc nào cũng có một mốc sạch để quay lại.

## Bộ file điều khiển AI

| File | Vai trò |
| --- | --- |
| `CLAUDE.md` | Luật chung cho cả dự án: stack, kiến trúc, quy ước, những việc AI không được làm. Claude Code tự đọc ở mỗi phiên. |
| `.claude/settings.json` | Chặn ở mức công cụ: không đọc `.env`, không sửa `CLAUDE.md`/`docs/`, không commit/push/reset. |
| `docs/PLAN.md` | File này: thứ tự giai đoạn, quy trình mỗi prompt, việc bạn tự làm. |
| `docs/briefs/Pxx-*.md` | Nhiệm vụ cụ thể: phạm vi file, hợp đồng, test tính tay, tiêu chí hoàn thành, prompt mẫu. |

`CLAUDE.md` nói "luôn luôn / không bao giờ"; brief nói "lần này làm gì, sửa file nào".
Khi brief cho phép một ngoại lệ (ví dụ cài package ở P00), brief thắng.

Lưu ý: luật `deny` của `Read(...)` chặn công cụ đọc file của Claude, nhưng không chặn hoàn toàn
lệnh shell như `cat .env`. Vì vậy vẫn phải đọc lệnh Bash trước khi bấm cho phép,
và không để secret thật trong `.env.test`. Cú pháp quyền có thể thay đổi theo phiên bản
Claude Code; kiểm tra lại bằng lệnh `/permissions` sau khi cài.

## Cài đặt ban đầu (bạn làm, 1 lần)

1. Tạo repo `tickethub`, chép `CLAUDE.md`, `.claude/`, `docs/` vào gốc repo, commit `docs: add plan and briefs`.
2. Cài Docker Desktop, Node 22, Claude Code.
3. Tạo project Supabase (dùng ở P06 và P14), chưa cần cấu hình gì thêm.
4. Ở gốc repo chạy `claude`, gõ `/permissions` để chắc chắn settings đã được nhận.

## Vòng lặp cho mỗi prompt

1. Đầu giai đoạn: `git switch -c p05-events` (mỗi giai đoạn một branch).
2. Trong Claude Code: `/clear` để bắt đầu ngữ cảnh sạch (bắt buộc khi sang giai đoạn mới).
3. Bật plan mode (Shift+Tab đến khi thấy "plan mode"), gửi prompt mở đầu:

   > Đọc CLAUDE.md và docs/briefs/P05-events.md. Làm Prompt 1.
   > Trình bày kế hoạch: file sẽ tạo/sửa, hàm, test sẽ viết. Chưa sửa code.

4. Đối chiếu kế hoạch với brief. Lệch phạm vi → yêu cầu sửa kế hoạch. Đúng → cho chạy.
5. Tự kiểm tra (không tin lời "đã xong" của AI):
   - `npm test`, `npm run lint`, `npm run format:check` đều xanh.
   - `git status` và `git diff --stat`: chỉ có file nằm trong Phạm vi của brief.
   - Thử tay theo mục "Hoàn thành khi" (curl, Postman hoặc trình duyệt).
   - Đọc diff. Phần nào không hiểu → hỏi Claude giải thích, chưa commit.
6. Commit: `git add -A && git commit -m "feat(events): list with search and pagination"`.
7. Prompt tiếp theo của cùng brief: không cần `/clear`, chỉ gửi "Làm Prompt 2 của brief P05".
8. Hết giai đoạn: `git switch main && git merge --no-ff p05-events && git tag p05`.

## Khi AI làm sai

| Tình huống | Cách xử lý |
| --- | --- |
| Sửa file ngoài phạm vi | `git restore <file>` (hoặc xóa file mới), nhắc: "Chỉ sửa file trong Phạm vi của brief". |
| Test đỏ | "Chạy npm test, đọc lỗi, sửa. Chỉ sửa file trong Phạm vi. Không sửa test có sẵn." |
| Đi sai hướng 2 lần liên tiếp | `git restore . && git clean -fd` về commit trước, `/clear`, gửi lại prompt rõ hơn. |
| Sửa test cho khớp code sai | Từ chối thay đổi, nhắc: "Giá trị mong đợi lấy từ brief, sửa code chứ không sửa test." |
| Muốn tự thêm package | Từ chối, trừ khi brief cho phép. |
| Ngữ cảnh quá dài, trả lời lan man | `/compact` hoặc commit rồi `/clear`. |

Prompt rà soát trước khi commit (dùng cho P04, P07, P09):

> Rà lại toàn bộ diff hiện tại so với brief P07. Liệt kê mọi điểm lệch, thiếu,
> hoặc vi phạm CLAUDE.md. Chưa sửa gì.

## Các giai đoạn

| # | Giai đoạn | Brief | Tuần | Tag |
| --- | --- | --- | --- | --- |
| P00 | Khung API, tooling, Docker Postgres | P00-setup.md | 1 | p00 |
| P01 | Migration 9 bảng, seed, helper transaction | P01-database.md | 1 | p01 |
| P02 | Lỗi, response chuẩn, validate, logger | P02-core.md | 1–2 | p02 |
| P03 | Đăng ký, đăng nhập, access token | P03-auth-login.md | 2 | p03 |
| P04 | Refresh rotation, logout, phân quyền, quản lý user | P04-auth-refresh.md | 2 | p04 |
| P05 | Sự kiện: CRUD, publish, tìm kiếm, phân trang | P05-events.md | 3 | p05 |
| P06 | Section, sinh ghế, sơ đồ ghế, upload banner | P06-sections-seats.md | 3 | p06 |
| P07 | Giữ ghế với FOR UPDATE, race test | P07-booking-hold.md | 4 | p07 |
| P08 | Cron trả ghế, hủy booking, lịch sử booking | P08-expiry-cancel.md | 4 | p08 |
| P09 | Thanh toán giả lập, vé, QR | P09-payment-tickets.md | 5 | p09 |
| P10 | Thống kê, Swagger | P10-stats-docs.md | 5 | p10 |
| P11 | Web: khung, auth, axios interceptor | P11-web-setup-auth.md | 6 | p11 |
| P12 | Web: danh sách, sơ đồ ghế, checkout, vé | P12-web-user.md | 6 | p12 |
| P13 | Web: organizer và admin | P13-web-organizer.md | 7 | p13 |
| P14 | Docker, CI, deploy, README | P14-ship.md | 8 | v1.0.0 |

P07 là giai đoạn quan trọng nhất: đọc kỹ từng dòng code của nó, vì đây là phần sẽ bị hỏi khi phỏng vấn.

## Việc chỉ bạn làm (không giao AI)

- Tạo file `.env` và `.env.test` từ `.env.example`, sinh JWT secret
  (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- Tạo bucket Supabase Storage, lấy URL và service key (P06).
- Commit, merge, tag, push.
- Deploy Render, Vercel và chạy migration lên Supabase (P14).
- Tự trả lời được: vì sao `FOR UPDATE`, vì sao khóa theo thứ tự id, vì sao refresh token rotation,
  SOLID nằm ở đâu trong code.

## Quy ước commit

`<type>(<scope>): <mô tả ngắn tiếng Anh>`

- type: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`
- scope: `api`, `db`, `core`, `auth`, `users`, `events`, `sections`, `bookings`,
  `payments`, `tickets`, `stats`, `web`, `ci`

Ví dụ: `feat(bookings): hold seats with row-level locking`, `test(bookings): add concurrency test`.
Mỗi commit tương ứng một prompt; không gộp nhiều prompt vào một commit.

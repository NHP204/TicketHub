# Brief — P11 Web: khung dự án, đăng nhập, tự refresh token

## Mục tiêu

Dựng `web/` (React + Vite + Tailwind), đăng ký và đăng nhập được, access token tự làm mới
khi hết hạn mà người dùng không nhận ra.

## Phạm vi

Được phép tạo:

- Toàn bộ `web/` (Vite tạo khung bằng `npm create vite@latest web -- --template react`)
- `web/package.json`, `web/package-lock.json`

Không được sửa: bất cứ thứ gì trong `api/`, `CLAUDE.md`, `docs/`.

Ngoại lệ của brief này: được cài ĐÚNG các package sau, từ P12 không thêm nữa (trừ khi brief cho phép).

- dependencies: `react-router-dom axios @tanstack/react-query`
- devDependencies: `tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom prettier`

## Hợp đồng

Cấu trúc:

```
web/src/api/client.js       axios instance + interceptor
web/src/api/auth.api.js     login, register, refresh, logout, me
web/src/context/auth-context.jsx
web/src/components/ProtectedRoute.jsx
web/src/components/Layout.jsx      header, nav, footer
web/src/pages/LoginPage.jsx, RegisterPage.jsx, HomePage.jsx (tạm)
web/src/utils/format.js
web/src/router.jsx, main.jsx
```

`api/client.js`:

- `baseURL` = `import.meta.env.VITE_API_URL` + `/api/v1`, `withCredentials: true`.
- `setAccessToken(token)` lưu token trong biến module (bộ nhớ). Không localStorage, không sessionStorage.
- Request interceptor gắn `Authorization: Bearer <token>` nếu có.
- Response interceptor: lỗi 401 có `error.code === 'TOKEN_EXPIRED'` → gọi `/auth/refresh` MỘT lần
  (nhiều request cùng hết hạn dùng chung một promise refresh), cập nhật token, gửi lại request gốc
  đúng một lần. Refresh thất bại → xóa token, gọi callback `onSessionExpired`.

`AuthContext`: khi app khởi động gọi `/auth/refresh` để khôi phục phiên (cookie còn hạn);
cung cấp `{ user, status: 'loading' | 'authenticated' | 'guest', login, register, logout }`.

`ProtectedRoute({ roles })`: `loading` → spinner; `guest` → chuyển `/login?next=<đường dẫn hiện tại>`;
sai role → trang "Không có quyền".

Form: hiển thị lỗi từng trường từ `error.details` của API. Chữ người dùng nhập và message từ API
chỉ hiển thị qua JSX, không `dangerouslySetInnerHTML`.

`utils/format.js`: `formatVnd(n)` → `n.toLocaleString('vi-VN') + ' đ'`;
`formatDateTime(iso)` → định dạng `vi-VN`, múi giờ `Asia/Ho_Chi_Minh`.

Scripts web: `dev`, `build`, `preview`, `test` (vitest run), `lint`, `format:check`.
`web/.env.example`: `VITE_API_URL=http://localhost:4000`.

## Prompt 1 — Khung, Tailwind, layout, router

Hoàn thành khi: `npm run dev` mở được trang chủ có header/nav/footer; `npm run build` xanh.

## Prompt 2 — API client và interceptor

Test (Vitest, giả lập adapter của axios):

1. Request đầu nhận 401 `TOKEN_EXPIRED`, refresh thành công → request gốc được gửi lại và trả kết quả
2. 3 request cùng nhận 401 `TOKEN_EXPIRED` → `/auth/refresh` chỉ được gọi 1 lần
3. Refresh thất bại → `onSessionExpired` được gọi, không lặp vô hạn
4. 401 với code khác (`INVALID_CREDENTIALS`) → không gọi refresh
5. `formatVnd(1600000) === '1.600.000 đ'`

## Prompt 3 — AuthContext, trang đăng nhập và đăng ký

Hoàn thành khi (thử tay, API chạy ở P10):

- Đăng ký → tự đăng nhập → về trang chủ, header hiện tên
- F5 vẫn còn đăng nhập (khôi phục qua refresh cookie)
- Đăng xuất → F5 → là khách
- Tạm sửa hạn access token trong `api/src/utils/jwt.js` thành 1 phút (bạn tự sửa, sau đó `git restore`):
  sau 1 phút thao tác vẫn chạy, tab Network thấy `/auth/refresh`

## Hoàn thành giai đoạn

- Commit gợi ý: `chore(web): scaffold react app with tailwind`, `feat(web): add api client with token refresh`, `feat(web): add auth pages and context`

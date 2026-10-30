import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/use-auth.js';
import { canVisit, isGuestOnly, landingPath, roleHome } from '../utils/role-home.js';
import Spinner from './Spinner.jsx';

// Quyền lấy từ bảng trong utils/role-home.js theo đường dẫn hiện tại.
export default function ProtectedRoute() {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner />;

  const role = user?.role ?? null;
  if (canVisit(role, location.pathname)) return <Outlet />;

  if (!role) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Đã đăng nhập mà mở /login, /register: về trang đích (giữ `next` nếu hợp với role).
  if (isGuestOnly(location.pathname)) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={landingPath(role, next)} replace />;
  }

  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">Không có quyền</h1>
      <p className="mt-2 text-slate-600">Tài khoản của bạn không được phép truy cập trang này.</p>
      <Link to={roleHome(role)} className="mt-4 inline-block text-cobalt hover:underline">
        Về trang của tôi
      </Link>
    </section>
  );
}

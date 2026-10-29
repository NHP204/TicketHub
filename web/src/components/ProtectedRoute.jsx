import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/use-auth.js';
import Spinner from './Spinner.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner />;

  if (status === 'guest') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <section className="text-center">
        <h1 className="text-2xl font-bold">Không có quyền</h1>
        <p className="mt-2 text-slate-600">Tài khoản của bạn không được phép truy cập trang này.</p>
      </section>
    );
  }

  return <Outlet />;
}

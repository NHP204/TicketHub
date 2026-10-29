import { Link, NavLink, Outlet } from 'react-router-dom';

const currentYear = new Date().getFullYear();

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
  }`;

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            TicketHub
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Sự kiện
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Đăng nhập
            </NavLink>
            <NavLink to="/register" className={navLinkClass}>
              Đăng ký
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-slate-500">
          © {currentYear} TicketHub — Hệ thống đặt vé sự kiện
        </div>
      </footer>
    </div>
  );
}

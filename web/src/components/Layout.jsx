import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/use-auth.js';
import { buttonClass } from './ui/button-class.js';
import Icon from './ui/Icon.jsx';
import Logo from './ui/Logo.jsx';

const currentYear = new Date().getFullYear();
const API_DOCS_URL = `${import.meta.env.VITE_API_URL ?? ''}/api-docs`;
const SOURCE_URL = 'https://github.com/NHP204/TicketHub';

// Menu riêng của từng role, sau mục "Sự kiện"; "Tài khoản" và "Đăng xuất" thêm cho mọi role.
const MENU_BY_ROLE = {
  USER: [
    { to: '/bookings', label: 'Booking của tôi' },
    { to: '/tickets', label: 'Vé của tôi' },
  ],
  ORGANIZER: [{ to: '/organizer', label: 'Quản lý sự kiện' }],
  ADMIN: [
    { to: '/admin', label: 'Tổng quan', end: true },
    { to: '/admin/users', label: 'Quản lý user' },
  ],
};

// Điều hướng bên trái của khu quản lý (từ 1024px). match quyết định mục đang mở theo đường dẫn.
const MANAGE_MENU = {
  ORGANIZER: [
    {
      to: '/organizer',
      label: 'Sự kiện của tôi',
      match: (path) => path.startsWith('/organizer') && path !== '/organizer/events/new',
    },
    {
      to: '/organizer/events/new',
      label: 'Tạo sự kiện',
      match: (path) => path === '/organizer/events/new',
    },
  ],
  ADMIN: [
    { to: '/admin', label: 'Tổng quan', match: (path) => path === '/admin' },
    { to: '/admin/users', label: 'Quản lý user', match: (path) => path.startsWith('/admin/users') },
  ],
};

const MANAGE_AREA = /^\/(organizer|admin)(\/|$)/;

const navLinkClass = ({ isActive }) =>
  `flex min-h-11 items-center border-b-2 px-1 text-base font-medium md:h-header ${
    isActive ? 'border-cobalt text-ink' : 'border-transparent text-muted hover:text-ink'
  }`;

const footerLinkClass = 'hover:text-surface hover:underline';

export default function Layout() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  // Theo P15 chỉ USER có vé; khách vẫn thấy để được dẫn tới đăng nhập.
  const showTicketsLink = status !== 'authenticated' || user.role === 'USER';
  const manageMenu =
    status === 'authenticated' && MANAGE_AREA.test(pathname) ? MANAGE_MENU[user.role] : null;

  async function handleLogout() {
    setLoggingOut(true);
    closeMenu();
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="@container flex min-h-screen flex-col bg-paper text-ink">
      <header className="bg-surface print:hidden">
        <div className="page-container flex flex-wrap items-center gap-x-12">
          <Link
            to="/"
            onClick={closeMenu}
            aria-label="TicketHub, trang chủ"
            className="flex h-header items-center"
          >
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            className="ml-auto flex size-11 items-center justify-center rounded-control text-ink hover:bg-paper md:hidden"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} label={menuOpen ? 'Đóng menu' : 'Mở menu'} />
          </button>
          <div
            id="main-menu"
            className={`${
              menuOpen ? 'flex' : 'hidden'
            } w-full flex-col gap-4 border-t border-line py-3 md:flex md:w-auto md:flex-1 md:flex-row md:items-center md:justify-between md:border-0 md:py-0`}
          >
            <nav aria-label="Điều hướng chính" className="flex flex-col gap-1 md:flex-row md:gap-8">
              <NavLink to="/" end onClick={closeMenu} className={navLinkClass}>
                Sự kiện
              </NavLink>
              {status === 'authenticated' && (
                <>
                  {(MENU_BY_ROLE[user.role] ?? []).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={closeMenu}
                      className={navLinkClass}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  <NavLink to="/account" onClick={closeMenu} className={navLinkClass}>
                    Tài khoản
                  </NavLink>
                </>
              )}
            </nav>

            {status === 'authenticated' && (
              <div className="flex items-center justify-between gap-4 md:justify-end">
                <span className="truncate text-base font-medium text-ink">{user.fullName}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={buttonClass({ variant: 'secondary' })}
                >
                  Đăng xuất
                </button>
              </div>
            )}
            {status === 'loading' && (
              // Giữ chỗ vùng đăng nhập trong lúc kiểm tra phiên, để header không nhảy.
              <div aria-hidden="true" className="h-11 w-44 rounded-control bg-paper md:ml-auto" />
            )}
            {status === 'guest' && (
              <div className="flex items-center gap-6 md:justify-end">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="text-base font-medium text-cobalt hover:underline"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className={buttonClass({ variant: 'primary' })}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="edge-perforation" />
      </header>

      <main className="page-container flex-1 py-8">
        {manageMenu ? (
          <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
            <nav aria-label="Khu quản lý" className="hidden lg:block">
              <ul className="space-y-1 border-l-2 border-line">
                {manageMenu.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                        className={`-ml-0.5 flex min-h-11 items-center border-l-2 pl-4 text-base font-medium ${
                          active
                            ? 'border-cobalt text-ink'
                            : 'border-transparent text-muted hover:text-ink'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="min-w-0">
              <Outlet />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="mt-12 bg-ink text-sm text-surface/75 print:hidden">
        <div aria-hidden="true" className="edge-scallop-top" />
        <div className="page-container grid gap-8 py-10 md:grid-cols-[2fr_1fr_1.5fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-3 max-w-[40ch] text-base">
              Đặt vé sự kiện, chọn đúng chỗ ngồi trên sơ đồ ghế và nhận vé QR ngay sau thanh toán.
            </p>
          </div>
          <nav aria-label="Liên kết chân trang">
            <h2 className="font-semibold text-surface">Liên kết</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/" className={footerLinkClass}>
                  Sự kiện
                </Link>
              </li>
              {showTicketsLink && (
                <li>
                  <Link to="/tickets" className={footerLinkClass}>
                    Vé của tôi
                  </Link>
                </li>
              )}
              <li>
                <Link to="/account" className={footerLinkClass}>
                  Tài khoản
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <h2 className="font-semibold text-surface">Dự án</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <a href={API_DOCS_URL} target="_blank" rel="noreferrer" className={footerLinkClass}>
                  Tài liệu API
                </a>
              </li>
              <li>
                <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={footerLinkClass}>
                  Mã nguồn trên GitHub
                </a>
              </li>
              <li>Dự án cá nhân: Node.js, PostgreSQL, React</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-surface/15">
          <p className="page-container py-4">© {currentYear} NHP204</p>
        </div>
      </footer>
    </div>
  );
}

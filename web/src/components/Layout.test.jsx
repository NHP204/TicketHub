import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/use-auth.js';
import Layout from './Layout.jsx';

function renderWithRole(role, path = '/', status = 'authenticated') {
  const router = createMemoryRouter([{ path: '*', element: <Layout /> }], {
    initialEntries: [path],
  });
  const auth = {
    user: status === 'authenticated' ? { id: 'u-1', fullName: 'Nguyễn An', role } : null,
    status,
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe('Layout', () => {
  afterEach(cleanup);

  it('user role USER không thấy "Quản lý sự kiện" và "Quản lý user"', () => {
    renderWithRole('USER');
    const nav = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));

    expect(nav.getByRole('link', { name: 'Vé của tôi' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Quản lý sự kiện' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Quản lý user' })).toBeNull();
  });

  it('ADMIN không thấy "Vé của tôi"', () => {
    renderWithRole('ADMIN');

    expect(screen.getByRole('link', { name: 'Quản lý user' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Vé của tôi' })).toBeNull();
  });

  it('ORGANIZER ở /organizer/events/ev-1 → có điều hướng "Khu quản lý", mục "Sự kiện của tôi" đang mở', () => {
    renderWithRole('ORGANIZER', '/organizer/events/ev-1');

    const manage = within(screen.getByRole('navigation', { name: 'Khu quản lý' }));
    expect(manage.getByRole('link', { name: 'Sự kiện của tôi' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      manage.getByRole('link', { name: 'Tạo sự kiện' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('trang công khai không có điều hướng "Khu quản lý"', () => {
    renderWithRole('ORGANIZER', '/');

    expect(screen.queryByRole('navigation', { name: 'Khu quản lý' })).toBeNull();
  });

  it('đang kiểm tra phiên đăng nhập → không hiện "Đăng nhập" lẫn tên người dùng', () => {
    renderWithRole(null, '/', 'loading');

    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull();
  });
});

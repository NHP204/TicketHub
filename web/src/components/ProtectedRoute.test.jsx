import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthContext } from '../context/use-auth.js';
import ProtectedRoute from './ProtectedRoute.jsx';

function renderAt(url, auth) {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/tickets', element: <p>Trang vé của tôi</p> },
          { path: '/login', element: <p>Trang đăng nhập</p> },
        ],
      },
      { path: '/organizer', element: <p>Trang organizer</p> },
    ],
    { initialEntries: [url] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

const organizer = { user: { id: 'o-1', role: 'ORGANIZER' }, status: 'authenticated' };

describe('ProtectedRoute', () => {
  afterEach(cleanup);

  it('ORGANIZER mở /tickets → thấy trang "Không có quyền"', () => {
    renderAt('/tickets', organizer);

    expect(screen.getByRole('heading', { name: 'Không có quyền' })).toBeTruthy();
    expect(screen.queryByText('Trang vé của tôi')).toBeNull();
  });

  it('trang "Không có quyền" có nút về trang đích của role (/organizer)', () => {
    renderAt('/tickets', organizer);

    expect(screen.getByRole('link', { name: 'Về trang của tôi' }).getAttribute('href')).toBe(
      '/organizer',
    );
  });

  it('khách mở /tickets → chuyển tới /login', () => {
    renderAt('/tickets', { user: null, status: 'guest' });

    expect(screen.getByText('Trang đăng nhập')).toBeTruthy();
  });

  it('ORGANIZER đã đăng nhập mở /login → chuyển về /organizer', () => {
    renderAt('/login', organizer);

    expect(screen.getByText('Trang organizer')).toBeTruthy();
  });
});

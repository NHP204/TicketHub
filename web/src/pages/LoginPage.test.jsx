import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/use-auth.js';
import LoginPage from './LoginPage.jsx';

function renderLogin(url, role) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/organizer', element: <p>Trang organizer</p> },
      { path: '/tickets', element: <p>Trang vé của tôi</p> },
    ],
    { initialEntries: [url] },
  );
  const auth = {
    user: null,
    status: 'guest',
    login: vi.fn().mockResolvedValue({ id: 'u-1', fullName: 'Trần Bình', role }),
  };
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function submit() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'org@example.com' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'Matkhau123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('LoginPage', () => {
  afterEach(cleanup);

  it('ORGANIZER đăng nhập không có next → chuyển tới /organizer', async () => {
    renderLogin('/login', 'ORGANIZER');

    submit();

    expect(await screen.findByText('Trang organizer')).toBeTruthy();
  });

  it('ORGANIZER đăng nhập với next=/tickets → chuyển tới /organizer, không tới /tickets', async () => {
    renderLogin('/login?next=%2Ftickets', 'ORGANIZER');

    submit();

    expect(await screen.findByText('Trang organizer')).toBeTruthy();
    expect(screen.queryByText('Trang vé của tôi')).toBeNull();
  });
});

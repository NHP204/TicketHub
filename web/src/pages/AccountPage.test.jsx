import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me } from '../api/auth.api.js';
import { updateMe } from '../api/users.api.js';
import { AuthContext } from '../context/use-auth.js';
import AccountPage from './AccountPage.jsx';

vi.mock('../api/auth.api.js', () => ({ me: vi.fn() }));
vi.mock('../api/users.api.js', () => ({ updateMe: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path: '/account', element: <AccountPage /> }], {
    initialEntries: ['/account'],
  });
  const auth = {
    user: { id: 'u-1', fullName: 'Nguyễn An', role: 'USER' },
    status: 'authenticated',
    logout: vi.fn(),
  };
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AccountPage', () => {
  beforeEach(() => {
    me.mockResolvedValue({ id: 'u-1', email: 'an@example.com', fullName: 'Nguyễn An' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('mật khẩu mới và nhập lại khác nhau → hiện lỗi, không gọi API', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), {
      target: { value: 'Matkhau123' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'Moi12345' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), {
      target: { value: 'Khac12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeTruthy();
    expect(updateMe).not.toHaveBeenCalled();
  });
});

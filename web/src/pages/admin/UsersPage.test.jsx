import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listUsers, updateUser } from '../../api/admin.api.js';
import { AuthContext } from '../../context/use-auth.js';
import UsersPage from './UsersPage.jsx';

vi.mock('../../api/admin.api.js', () => ({ listUsers: vi.fn(), updateUser: vi.fn() }));

const users = [
  {
    id: 'u-2',
    email: 'an@example.com',
    fullName: 'Nguyễn An',
    role: 'USER',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path: '/admin/users', element: <UsersPage /> }], {
    initialEntries: ['/admin/users'],
  });
  const auth = { user: { id: 'admin-1', role: 'ADMIN' }, status: 'authenticated' };
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    listUsers.mockResolvedValue({
      users,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('bấm "Khóa" → mở ConfirmDialog; bấm Hủy → không gọi API', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Khóa' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(updateUser).not.toHaveBeenCalled();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminStats } from '../../api/admin.api.js';
import AdminDashboardPage from './AdminDashboardPage.jsx';

vi.mock('../../api/admin.api.js', () => ({ getAdminStats: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/admin', element: <AdminDashboardPage /> }], {
    initialEntries: ['/admin'],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    getAdminStats.mockResolvedValue({
      usersByRole: { USER: 12, ORGANIZER: 3, ADMIN: 1 },
      events: { DRAFT: 2, PUBLISHED: 5, CANCELLED: 1 },
      totalRevenue: 1600000,
      ticketsSold: 5,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('totalRevenue 1600000 → hiện "1.600.000 đ"', async () => {
    renderPage();

    expect(await screen.findByText('1.600.000 đ')).toBeTruthy();
  });

  it('có liên kết tới /admin/users', async () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Quản lý user' }).getAttribute('href')).toBe(
      '/admin/users',
    );
  });
});

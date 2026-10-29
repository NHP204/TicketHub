import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvent } from '../../api/events.api.js';
import { getEventStats } from '../../api/organizer.api.js';
import StatsPage from './StatsPage.jsx';

vi.mock('../../api/events.api.js', () => ({ getEvent: vi.fn() }));
vi.mock('../../api/organizer.api.js', () => ({ getEventStats: vi.fn() }));

// 2 khu vực: 2 × 500.000 + 3 × 200.000 = 1.600.000.
const stats = {
  eventId: 'ev-1',
  revenue: 1600000,
  ticketsSold: 5,
  sections: [
    { name: 'VIP', price: 500000, capacity: 10, sold: 2, held: 0, revenue: 1000000, fillRate: 20 },
    {
      name: 'Thường',
      price: 200000,
      capacity: 20,
      sold: 3,
      held: 1,
      revenue: 600000,
      fillRate: 15,
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/organizer/events/:id/stats', element: <StatsPage /> }],
    { initialEntries: ['/organizer/events/ev-1/stats'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('StatsPage', () => {
  beforeAll(() => {
    // jsdom không có ResizeObserver mà ResponsiveContainer của Recharts cần.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    getEvent.mockResolvedValue({ id: 'ev-1', title: 'Đêm nhạc Jazz' });
    getEventStats.mockResolvedValue(stats);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('revenue 1600000 → thẻ Doanh thu hiện "1.600.000 đ"', async () => {
    renderPage();

    const label = await screen.findByText('Doanh thu', { selector: 'p' });
    expect(label.nextElementSibling.textContent).toBe('1.600.000 đ');
  });
});

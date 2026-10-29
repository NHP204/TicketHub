import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvent, getSeatMap } from '../api/events.api.js';
import { AuthContext } from '../context/use-auth.js';
import EventDetailPage from './EventDetailPage.jsx';

vi.mock('../api/events.api.js', () => ({ getEvent: vi.fn(), getSeatMap: vi.fn() }));
vi.mock('../api/bookings.api.js', () => ({ holdSeats: vi.fn() }));

const event = {
  id: 'ev-1',
  title: 'Đêm nhạc Jazz',
  description: null,
  venue: 'Nhà hát Lớn',
  startTime: '2026-12-01T12:00:00.000Z',
  endTime: '2026-12-01T15:00:00.000Z',
  bannerUrl: null,
};

const seatMap = {
  eventId: 'ev-1',
  sections: [
    {
      id: 'sec-vip',
      name: 'VIP',
      price: 500000,
      rows: [
        {
          label: 'A',
          seats: [
            { id: 'v1', number: 1, status: 'AVAILABLE' },
            { id: 'v2', number: 2, status: 'AVAILABLE' },
          ],
        },
      ],
    },
    {
      id: 'sec-std',
      name: 'Thường',
      price: 200000,
      rows: [{ label: 'B', seats: [{ id: 't1', number: 1, status: 'AVAILABLE' }] }],
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/events/:id', element: <EventDetailPage /> }], {
    initialEntries: ['/events/ev-1'],
  });
  const auth = { user: { id: 'u1', role: 'CUSTOMER' }, status: 'authenticated' };
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    getEvent.mockResolvedValue(event);
    getSeatMap.mockResolvedValue(seatMap);
  });

  afterEach(cleanup);

  it('chọn 2 VIP + 1 Thường → thanh dưới hiện tổng tiền 1.200.000 đ', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'VIP hàng A ghế 1, 500.000 đ' }));
    fireEvent.click(screen.getByRole('button', { name: 'VIP hàng A ghế 2, 500.000 đ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thường hàng B ghế 1, 200.000 đ' }));

    const summary = screen.getByText(
      (_, el) => el.tagName === 'P' && el.textContent.startsWith('Đã chọn'),
    );
    expect(summary.textContent).toBe('Đã chọn 3 ghế · Tổng tiền 1.200.000 đ');
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBooking, payBooking } from '../api/bookings.api.js';
import { getEvent } from '../api/events.api.js';
import CheckoutPage from './CheckoutPage.jsx';

vi.mock('../api/bookings.api.js', () => ({
  getBooking: vi.fn(),
  payBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));
vi.mock('../api/events.api.js', () => ({ getEvent: vi.fn() }));

const booking = {
  id: 'b-1',
  status: 'PENDING',
  eventId: 'ev-1',
  totalAmount: 500000,
  // Hạn giữ ghế còn 10 phút so với lúc chạy test.
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  items: [{ seatId: 's1', section: 'VIP', row: 'A', number: 1, price: 500000 }],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/checkout/:bookingId', element: <CheckoutPage /> },
      { path: '/tickets', element: <p>Trang vé</p> },
    ],
    { initialEntries: ['/checkout/b-1'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    getBooking.mockResolvedValue(booking);
    getEvent.mockResolvedValue({
      id: 'ev-1',
      title: 'Đêm nhạc Jazz',
      venue: 'Nhà hát Lớn',
      startTime: '2026-11-28T13:00:00Z',
    });
  });

  afterEach(cleanup);

  it('booking PENDING → có đồng hồ giữ ghế role="timer"', async () => {
    renderPage();

    expect(await screen.findByRole('timer')).toBeTruthy();
  });

  it('đang gửi thanh toán → nút thanh toán bị khóa', async () => {
    // Promise không bao giờ xong: giữ mutation ở trạng thái đang gửi.
    payBooking.mockReturnValue(new Promise(() => {}));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Thanh toán' }));

    const sending = await screen.findByRole('button', { name: 'Đang thanh toán...' });
    expect(sending.disabled).toBe(true);
  });
});

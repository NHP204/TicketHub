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

const customer = { user: { id: 'u1', role: 'CUSTOMER' }, status: 'authenticated' };

function renderPage(auth = customer) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/events/:id', element: <EventDetailPage /> }], {
    initialEntries: ['/events/ev-1'],
  });
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

    const summary = screen.getByRole('button', { name: /^Đã chọn/ });
    expect(summary.textContent).toBe('Đã chọn 3 ghế, tổng tiền 1.200.000 đ');
  });

  it('nút bỏ chọn ở khung "Ghế đã chọn" bỏ đúng ghế đó', async () => {
    renderPage();
    const a1 = await screen.findByRole('button', { name: 'VIP hàng A ghế 1, 500.000 đ' });
    const a2 = screen.getByRole('button', { name: 'VIP hàng A ghế 2, 500.000 đ' });
    fireEvent.click(a1);
    fireEvent.click(a2);

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn VIP hàng A ghế 1' }));

    expect(a1.getAttribute('aria-pressed')).toBe('false');
    expect(a2.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Bỏ chọn VIP hàng A ghế 1' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Đã chọn/ }).textContent).toBe(
      'Đã chọn 1 ghế, tổng tiền 500.000 đ',
    );
  });

  it('ORGANIZER: không có nút "Giữ ghế" và mọi nút ghế đều disabled', async () => {
    renderPage({ user: { id: 'org-2', role: 'ORGANIZER' }, status: 'authenticated' });

    const seats = await screen.findAllByRole('button', { name: /hàng/ });
    expect(seats).toHaveLength(3);
    expect(seats.every((button) => button.disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Giữ ghế' })).toBeNull();
  });

  it('ORGANIZER là chủ sự kiện: có liên kết tới /organizer/events/ev-1', async () => {
    getEvent.mockResolvedValue({ ...event, organizerId: 'org-1' });
    renderPage({ user: { id: 'org-1', role: 'ORGANIZER' }, status: 'authenticated' });

    const link = await screen.findByRole('link', { name: 'Quản lý sự kiện này' });
    expect(link.getAttribute('href')).toBe('/organizer/events/ev-1');
  });

  it('ORGANIZER không phải chủ sự kiện: không có liên kết quản lý', async () => {
    getEvent.mockResolvedValue({ ...event, organizerId: 'org-1' });
    renderPage({ user: { id: 'org-2', role: 'ORGANIZER' }, status: 'authenticated' });

    expect(await screen.findByText('Tài khoản quản lý không đặt vé')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Quản lý sự kiện này' })).toBeNull();
  });
});

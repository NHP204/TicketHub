import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMyTickets } from '../api/tickets.api.js';
import MyTicketsPage from './MyTicketsPage.jsx';

vi.mock('../api/tickets.api.js', () => ({ listMyTickets: vi.fn() }));

const event = { title: 'Đêm nhạc Jazz', venue: 'Nhà hát Lớn', startTime: '2026-11-28T13:00:00Z' };

function ticket(code, number) {
  return { code, section: 'VIP', row: 'A', number, event };
}

function renderPage(state) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/tickets', element: <MyTicketsPage /> }], {
    initialEntries: [{ pathname: '/tickets', state }],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('MyTicketsPage', () => {
  afterEach(cleanup);

  it('sau thanh toán chỉ vé vừa tạo có chuyển động trượt lên', async () => {
    listMyTickets.mockResolvedValue([ticket('TH-1', 1), ticket('TH-2', 2)]);
    renderPage({ flash: 'Đã thanh toán. Vé của bạn ở bên dưới.', newTicketCodes: ['TH-1'] });

    const fresh = await screen.findByRole('article', { name: /ghế 1$/ });
    const old = screen.getByRole('article', { name: /ghế 2$/ });

    expect(fresh.className).toContain('animate-ticket-rise');
    expect(old.className).not.toContain('animate-ticket-rise');
  });

  it('vào trang bình thường → không vé nào có chuyển động', async () => {
    listMyTickets.mockResolvedValue([ticket('TH-1', 1)]);
    renderPage(null);

    const card = await screen.findByRole('article', { name: /ghế 1$/ });
    expect(card.className).not.toContain('animate-ticket-rise');
  });
});

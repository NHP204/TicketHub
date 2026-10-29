import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listEvents } from '../api/events.api.js';
import HomePage from './HomePage.jsx';

vi.mock('../api/events.api.js', () => ({ listEvents: vi.fn() }));

const emptyResult = { events: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } };

function renderHomePage(initialUrl = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/', element: <HomePage /> }], {
    initialEntries: [initialUrl],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

function typeSearch(value) {
  fireEvent.change(screen.getByLabelText('Tìm sự kiện'), { target: { value } });
}

function callsWithQ(q) {
  return listEvents.mock.calls.filter(([params]) => params?.q === q);
}

describe('HomePage', () => {
  beforeEach(() => {
    listEvents.mockReset();
    listEvents.mockResolvedValue(emptyResult);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('gõ "jazz" → sau 300 ms gọi API đúng 1 lần với q=jazz', async () => {
    vi.useFakeTimers();
    renderHomePage();

    for (const value of ['j', 'ja', 'jaz', 'jazz']) {
      typeSearch(value);
      await act(() => vi.advanceTimersByTimeAsync(50));
    }
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(callsWithQ('jazz')).toHaveLength(0);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(callsWithQ('jazz')).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(callsWithQ('jazz')).toHaveLength(1);
    expect(listEvents.mock.calls.every(([params]) => !params.q || params.q === 'jazz')).toBe(true);
  });

  it('API trả rỗng → hiện đúng chữ người dùng gõ, kể cả "<b>" nguyên văn', async () => {
    renderHomePage();

    typeSearch('<b>jazz</b>');

    const message = await screen.findByText('Không có sự kiện khớp với “<b>jazz</b>”');
    expect(document.querySelector('b')).toBeNull();
    expect(message.textContent).toBe('Không có sự kiện khớp với “<b>jazz</b>”');
  });

  it('submit form → không tải lại trang, URL có ?q=', () => {
    const { router } = renderHomePage();

    typeSearch('jazz');
    const notPrevented = fireEvent.submit(screen.getByRole('search'));

    // fireEvent trả false khi handler đã gọi preventDefault → trình duyệt không reload.
    expect(notPrevented).toBe(false);
    expect(router.state.location.pathname).toBe('/');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('jazz');
  });
});

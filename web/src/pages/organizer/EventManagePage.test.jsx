import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvent, getSeatMap } from '../../api/events.api.js';
import { publishEvent } from '../../api/organizer.api.js';
import EventManagePage from './EventManagePage.jsx';

vi.mock('../../api/events.api.js', () => ({ getEvent: vi.fn(), getSeatMap: vi.fn() }));
vi.mock('../../api/organizer.api.js', () => ({
  cancelEvent: vi.fn(),
  createSection: vi.fn(),
  deleteSection: vi.fn(),
  publishEvent: vi.fn(),
  updateEvent: vi.fn(),
  uploadBanner: vi.fn(),
}));

const event = {
  id: 'ev-1',
  organizerId: 'org-1',
  title: 'Đêm nhạc Jazz',
  description: 'Hòa nhạc ngoài trời',
  venue: 'Nhà hát Lớn',
  startTime: '2099-12-01T12:00:00.000Z',
  endTime: '2099-12-01T15:00:00.000Z',
  bannerUrl: null,
  status: 'DRAFT',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function apiError(status, code, message) {
  return Object.assign(new Error(message), {
    response: { status, data: { success: false, error: { code, message } } },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: '/organizer/events/:id', element: <EventManagePage /> }],
    { initialEntries: ['/organizer/events/ev-1'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('EventManagePage', () => {
  beforeEach(() => {
    getEvent.mockResolvedValue(event);
    getSeatMap.mockResolvedValue({ eventId: 'ev-1', sections: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('publish bị 409 EVENT_HAS_NO_SECTIONS → hiện thông báo dễ hiểu', async () => {
    publishEvent.mockRejectedValue(
      apiError(409, 'EVENT_HAS_NO_SECTIONS', 'Sự kiện cần ít nhất một khu vực ghế'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));

    const alert = await screen.findByText(
      'Chưa thể publish: hãy thêm ít nhất một khu vực ghế cho sự kiện trước.',
    );
    expect(alert.getAttribute('role')).toBe('alert');
  });
});

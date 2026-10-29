import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEvent } from '../../api/organizer.api.js';
import EventFormPage from './EventFormPage.jsx';

vi.mock('../../api/organizer.api.js', () => ({ createEvent: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/organizer/events/new', element: <EventFormPage /> }],
    { initialEntries: ['/organizer/events/new'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('EventFormPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ngày kết thúc trước ngày bắt đầu → hiện lỗi, không gọi API', () => {
    renderPage();

    fill('Tên sự kiện', 'Đêm nhạc Jazz');
    fill('Mô tả', 'Hòa nhạc ngoài trời');
    fill('Địa điểm', 'Nhà hát Lớn');
    fill('Bắt đầu', '2099-12-01T19:00');
    fill('Kết thúc', '2099-12-01T18:00');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sự kiện' }));

    expect(screen.getByText('Thời gian kết thúc phải sau thời gian bắt đầu')).toBeTruthy();
    expect(createEvent).not.toHaveBeenCalled();
  });
});

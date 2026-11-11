import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth.api.js';
import { listEvents } from '../api/events.api.js';
import HomePage from '../pages/HomePage.jsx';
import { AuthProvider } from './auth-context.jsx';
import { useAuth } from './use-auth.js';

vi.mock('../api/events.api.js', () => ({ listEvents: vi.fn() }));
vi.mock('../api/auth.api.js', () => ({
  refresh: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

const oneEvent = {
  events: [{ id: 'e-1', title: 'Đêm nhạc Jazz', venue: 'B', startTime: '2099-11-28T13:00:00Z' }],
  meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
};

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function AuthStatus() {
  return <p data-testid="auth-status">{useAuth().status}</p>;
}

// Giống main.jsx: StrictMode > QueryClientProvider > AuthProvider > router.
function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <AuthStatus />
            <HomePage />
          </>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('AuthProvider + trang công khai (StrictMode)', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockReset();
    listEvents.mockReset();
  });

  afterEach(cleanup);

  it('F5 trang chủ khi là khách: refresh trả 204 lúc danh sách đang tải → danh sách vẫn hiện', async () => {
    const refreshCall = deferred();
    const eventsCall = deferred();
    vi.mocked(authApi.refresh).mockReturnValue(refreshCall.promise);
    listEvents.mockReturnValue(eventsCall.promise);
    renderApp();

    // Refresh (204 → null) xong trước, trong lúc request danh sách sự kiện còn đang chạy.
    await act(async () => refreshCall.resolve(null));
    await act(async () => eventsCall.resolve(oneEvent));

    expect(await screen.findByRole('heading', { level: 2, name: 'Đêm nhạc Jazz' })).toBeTruthy();
    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
  });

  it('refresh treo mãi → trang danh sách vẫn hiện dữ liệu', async () => {
    vi.mocked(authApi.refresh).mockReturnValue(new Promise(() => {}));
    listEvents.mockResolvedValue(oneEvent);
    renderApp();

    expect(await screen.findByRole('heading', { level: 2, name: 'Đêm nhạc Jazz' })).toBeTruthy();
  });

  it('StrictMode chạy effect hai lần nhưng vẫn kết thúc ở guest', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(null);
    listEvents.mockResolvedValue(oneEvent);
    renderApp();

    await act(async () => {});
    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
  });

  it('refresh lỗi mạng/timeout → kết thúc ở guest', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('timeout of 60000ms exceeded'));
    listEvents.mockResolvedValue(oneEvent);
    renderApp();

    await act(async () => {});
    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
  });

  it('refresh thành công → authenticated', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      user: { id: 'u-1', role: 'CUSTOMER', fullName: 'An' },
      accessToken: 't',
    });
    listEvents.mockResolvedValue(oneEvent);
    renderApp();

    await act(async () => {});
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
  });
});

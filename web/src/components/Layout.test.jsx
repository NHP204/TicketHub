import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/use-auth.js';
import Layout from './Layout.jsx';

function renderWithRole(role) {
  const router = createMemoryRouter([{ path: '/', element: <Layout /> }], {
    initialEntries: ['/'],
  });
  const auth = {
    user: { id: 'u-1', fullName: 'Nguyễn An', role },
    status: 'authenticated',
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe('Layout', () => {
  afterEach(cleanup);

  it('user role USER không thấy "Quản lý sự kiện" và "Quản lý user"', () => {
    renderWithRole('USER');

    expect(screen.getByRole('link', { name: 'Vé của tôi' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Quản lý sự kiện' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Quản lý user' })).toBeNull();
  });
});

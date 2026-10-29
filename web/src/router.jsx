import { createElement, lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Spinner from './components/Spinner.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import MyTicketsPage from './pages/MyTicketsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TicketPage from './pages/TicketPage.jsx';

// Trang organizer/admin (kèm Recharts) chỉ tải khi vào route, để user thường không phải tải.
// Tạo component lazy bên trong hàm để file chỉ export `router` (giữ Fast Refresh).
function lazyPage(load) {
  return <Suspense fallback={<Spinner />}>{createElement(lazy(load))}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/checkout/:bookingId', element: <CheckoutPage /> },
          { path: '/bookings', element: <MyBookingsPage /> },
          { path: '/tickets', element: <MyTicketsPage /> },
          { path: '/tickets/:code', element: <TicketPage /> },
        ],
      },
      {
        element: <ProtectedRoute roles={['ORGANIZER']} />,
        children: [
          {
            path: '/organizer',
            element: lazyPage(() => import('./pages/organizer/DashboardPage.jsx')),
          },
          {
            path: '/organizer/events/new',
            element: lazyPage(() => import('./pages/organizer/EventFormPage.jsx')),
          },
          {
            path: '/organizer/events/:id',
            element: lazyPage(() => import('./pages/organizer/EventManagePage.jsx')),
          },
          {
            path: '/organizer/events/:id/stats',
            element: lazyPage(() => import('./pages/organizer/StatsPage.jsx')),
          },
        ],
      },
      {
        element: <ProtectedRoute roles={['ADMIN']} />,
        children: [
          { path: '/admin/users', element: lazyPage(() => import('./pages/admin/UsersPage.jsx')) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

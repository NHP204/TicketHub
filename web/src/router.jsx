import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import MyTicketsPage from './pages/MyTicketsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TicketPage from './pages/TicketPage.jsx';

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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

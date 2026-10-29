import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

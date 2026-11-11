import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/auth-context.jsx';
import './index.css';
import { router } from './router.jsx';

const MAX_RETRIES = 2;

// Lỗi 4xx là do request, thử lại cũng vậy; lỗi mạng/timeout/5xx thử lại tối đa 2 lần.
function shouldRetry(failureCount, error) {
  const status = error?.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < MAX_RETRIES;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

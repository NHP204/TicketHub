import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listMyBookings } from '../api/bookings.api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime, formatVnd } from '../utils/format.js';

const statusLabels = {
  PENDING: { text: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-800' },
  PAID: { text: 'Đã thanh toán', className: 'bg-green-100 text-green-800' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-slate-200 text-slate-700' },
  EXPIRED: { text: 'Hết hạn', className: 'bg-slate-200 text-slate-700' },
};

function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export default function MyBookingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  // Giữ thông báo trong state rồi xóa khỏi history, để F5 không hiện lại.
  const [flash] = useState(location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location, navigate]);

  const query = useQuery({
    queryKey: ['bookings', { page }],
    queryFn: () => listMyBookings({ page }),
    placeholderData: keepPreviousData,
  });

  function handlePageChange(nextPage) {
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {});
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Đặt chỗ của tôi</h1>

      {flash && (
        <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {flash}
        </p>
      )}

      <div className="mt-6">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorMessage
            message={parseApiError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : query.data.bookings.length === 0 ? (
          <EmptyState>Bạn chưa có đặt chỗ nào.</EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
              {query.data.bookings.map((booking) => {
                const label = statusLabels[booking.status];
                return (
                  <li key={booking.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="font-medium">{formatVnd(booking.totalAmount)}</p>
                      <p className="text-sm text-slate-600">
                        Đặt lúc{' '}
                        <time dateTime={booking.createdAt}>
                          {formatDateTime(booking.createdAt)}
                        </time>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${label.className}`}
                    >
                      {label.text}
                    </span>
                    {booking.status === 'PENDING' && (
                      <Link
                        to={`/checkout/${booking.id}`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Thanh toán
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}

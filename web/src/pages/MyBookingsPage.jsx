import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listMyBookings } from '../api/bookings.api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import Badge from '../components/ui/Badge.jsx';
import { buttonClass } from '../components/ui/button-class.js';
import Notice from '../components/ui/Notice.jsx';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime, formatVnd } from '../utils/format.js';

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
      <h1 className="text-2xl font-semibold">Đặt chỗ của tôi</h1>

      {flash && <Notice className="mt-4">{flash}</Notice>}

      <div className="mt-6">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorMessage
            message={parseApiError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : query.data.bookings.length === 0 ? (
          <EmptyState
            action={
              <Link to="/" className="text-base font-medium text-cobalt hover:underline">
                Xem các sự kiện sắp diễn ra
              </Link>
            }
          >
            Bạn chưa có đặt chỗ nào.
          </EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
              {query.data.bookings.map((booking) => {
                return (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-cobalt tabular-nums">
                        {formatVnd(booking.totalAmount)}
                      </p>
                      <p className="text-base text-muted tabular-nums">
                        Đặt lúc{' '}
                        <time dateTime={booking.createdAt}>
                          {formatDateTime(booking.createdAt)}
                        </time>
                      </p>
                    </div>
                    <Badge status={booking.status} />
                    {booking.status === 'PENDING' && (
                      <Link to={`/checkout/${booking.id}`} className={buttonClass({ size: 'sm' })}>
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

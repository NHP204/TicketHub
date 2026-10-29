import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listMyTickets } from '../api/tickets.api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime } from '../utils/format.js';

export default function MyTicketsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Giữ thông báo trong state rồi xóa khỏi history, để F5 không hiện lại.
  const [flash] = useState(location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const query = useQuery({ queryKey: ['tickets'], queryFn: listMyTickets });

  return (
    <section>
      <h1 className="text-2xl font-bold">Vé của tôi</h1>

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
        ) : query.data.length === 0 ? (
          <EmptyState>Bạn chưa có vé nào.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {query.data.map((ticket) => (
              <li key={ticket.code} className="rounded-lg bg-white p-4 shadow-sm">
                <h2 className="font-semibold">{ticket.event.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  <time dateTime={ticket.event.startTime}>
                    {formatDateTime(ticket.event.startTime)}
                  </time>{' '}
                  · {ticket.event.venue}
                </p>
                <p className="mt-2 text-sm">
                  {ticket.section} · hàng {ticket.row} ghế {ticket.number}
                </p>
                <Link
                  to={`/tickets/${ticket.code}`}
                  className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
                >
                  Xem vé {ticket.code}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

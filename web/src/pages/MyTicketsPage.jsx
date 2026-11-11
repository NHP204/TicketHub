import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listMyTickets } from '../api/tickets.api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import Ticket from '../components/Ticket.jsx';
import { parseApiError } from '../utils/api-error.js';

// Các vé vừa thanh toán trượt lên lệch nhau một chút, cùng một chuyển động.
const RISE_STAGGER_MS = 80;

export default function MyTicketsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Giữ thông báo trong state rồi xóa khỏi history, để F5 không hiện lại.
  const [flash] = useState(location.state?.flash ?? null);
  // Mã vé vừa tạo sau thanh toán: đọc một lần, state bị xóa ngay bên dưới nên F5 không chạy lại.
  const [newTicketCodes] = useState(() => location.state?.newTicketCodes ?? []);

  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const query = useQuery({ queryKey: ['tickets'], queryFn: listMyTickets });

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Vé của tôi</h1>

      {flash && (
        <p
          role="status"
          className="mt-4 rounded-panel border border-success/30 bg-success/12 px-4 py-3 text-base text-success-ink"
        >
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
          <EmptyState
            action={
              <Link to="/" className="text-base font-medium text-cobalt hover:underline">
                Xem các sự kiện sắp diễn ra
              </Link>
            }
          >
            Bạn chưa có vé nào.
          </EmptyState>
        ) : (
          <ul className="space-y-6">
            {query.data.map((ticket) => {
              const riseIndex = newTicketCodes.indexOf(ticket.code);
              return (
                <li key={ticket.code}>
                  <Ticket
                    event={ticket.event}
                    section={ticket.section}
                    row={ticket.row}
                    number={ticket.number}
                    code={ticket.code}
                    animate={riseIndex !== -1}
                    animationDelayMs={riseIndex * RISE_STAGGER_MS}
                    stubAction={
                      <Link
                        to={`/tickets/${ticket.code}`}
                        className="text-base font-medium text-cobalt hover:underline"
                      >
                        Xem vé<span className="sr-only"> {ticket.code}</span>
                      </Link>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

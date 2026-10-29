import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getTicket } from '../api/tickets.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime } from '../utils/format.js';

export default function TicketPage() {
  const { code } = useParams();
  const query = useQuery({ queryKey: ['ticket', code], queryFn: () => getTicket(code) });

  if (query.isPending) return <Spinner />;
  if (query.isError) {
    return (
      <ErrorMessage message={parseApiError(query.error).message} onRetry={() => query.refetch()} />
    );
  }

  const ticket = query.data;

  return (
    <section className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold">{ticket.event.title}</h1>
      <p className="mt-1 text-sm text-slate-600">
        <time dateTime={ticket.event.startTime}>{formatDateTime(ticket.event.startTime)}</time> ·{' '}
        {ticket.event.venue}
      </p>
      <img src={ticket.qrData} alt={`Mã QR vé ${ticket.code}`} className="mx-auto mt-6 h-56 w-56" />
      <p className="mt-2 font-mono text-lg font-semibold">{ticket.code}</p>
      <p className="mt-2">
        {ticket.section} · hàng {ticket.row} ghế {ticket.number}
      </p>
      <Link to="/tickets" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
        ← Tất cả vé
      </Link>
    </section>
  );
}

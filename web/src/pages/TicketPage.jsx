import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getTicket } from '../api/tickets.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import Ticket from '../components/Ticket.jsx';
import Button from '../components/ui/Button.jsx';
import { parseApiError } from '../utils/api-error.js';

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
    <section className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/tickets" className="text-base font-medium text-cobalt hover:underline">
          Tất cả vé
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          In vé
        </Button>
      </div>
      <div className="mt-6 print:mt-0">
        <Ticket
          event={ticket.event}
          section={ticket.section}
          row={ticket.row}
          number={ticket.number}
          code={ticket.code}
          qrData={ticket.qrData}
          size="lg"
          titleAs="h1"
        />
      </div>
    </section>
  );
}

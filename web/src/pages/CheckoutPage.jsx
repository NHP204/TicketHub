import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getBooking, payBooking } from '../api/bookings.api.js';
import { getEvent } from '../api/events.api.js';
import Countdown from '../components/Countdown.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import Ticket from '../components/Ticket.jsx';
import Button from '../components/ui/Button.jsx';
import Panel from '../components/ui/Panel.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { parseApiError } from '../utils/api-error.js';
import { formatEventDateTime, formatVnd } from '../utils/format.js';

const closedMessages = {
  PAID: 'Booking này đã được thanh toán.',
  CANCELLED: 'Booking này đã bị hủy.',
  EXPIRED: 'Booking này đã hết thời gian giữ ghế.',
};

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState(null);

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId),
  });
  const booking = bookingQuery.data;

  const eventQuery = useQuery({
    queryKey: ['event', booking?.eventId],
    queryFn: () => getEvent(booking.eventId),
    enabled: Boolean(booking?.eventId),
  });

  // Hạn giữ ghế lấy từ expiresAt của API, client không tự đặt 10 phút.
  const countdown = useCountdown(booking?.expiresAt);

  function handleActionError(err) {
    setActionError(parseApiError(err).message);
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
  }

  const payMutation = useMutation({
    mutationFn: () => payBooking(bookingId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // newTicketCodes: trang Vé của tôi cho các vé này trượt lên một lần.
      navigate('/tickets', {
        state: {
          flash: 'Đã thanh toán. Vé của bạn ở bên dưới.',
          newTicketCodes: (result?.tickets ?? []).map((ticket) => ticket.code),
        },
      });
    },
    onError: handleActionError,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/bookings', { state: { flash: 'Đã hủy booking và trả lại ghế.' } });
    },
    onError: handleActionError,
  });

  if (bookingQuery.isPending) return <Spinner />;
  if (bookingQuery.isError) {
    return (
      <ErrorMessage
        message={parseApiError(bookingQuery.error).message}
        onRetry={() => bookingQuery.refetch()}
      />
    );
  }

  const event = eventQuery.data;
  const isSubmitting = payMutation.isPending || cancelMutation.isPending;
  const isPending = booking.status === 'PENDING';
  const actionsLocked = !isPending || countdown.isExpired || isSubmitting;

  const [firstItem] = booking.items;
  const otherCount = booking.items.length - 1;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Thanh toán</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
        <div className="space-y-6">
          {isPending ? (
            <div
              className={`flex flex-wrap items-center justify-between gap-4 rounded-panel px-6 py-5 ${
                countdown.isExpired ? 'border border-danger/30 bg-danger/5' : 'bg-amber text-ink'
              }`}
            >
              <div>
                <p className="text-base font-medium">Đang giữ ghế</p>
                {countdown.isExpired ? (
                  <p role="alert" className="mt-1 text-base">
                    Hết thời gian giữ ghế. Chọn ghế lại để tiếp tục.
                  </p>
                ) : (
                  <p className="mt-1 text-sm">Thanh toán trước khi hết giờ để giữ chỗ.</p>
                )}
              </div>
              <Countdown display={countdown.display} isExpired={countdown.isExpired} />
            </div>
          ) : (
            <p role="status" className="rounded-panel border border-line bg-surface px-6 py-4">
              {closedMessages[booking.status]}
            </p>
          )}

          {actionError && (
            <p
              role="alert"
              className="rounded-panel border border-danger/30 bg-danger/5 px-4 py-3 text-base"
            >
              {actionError}
            </p>
          )}

          <Panel>
            {event && (
              <div>
                <p className="font-display text-2xl leading-none font-extrabold">{event.title}</p>
                <p className="mt-2 text-base text-muted">
                  <time dateTime={event.startTime} className="tabular-nums">
                    {formatEventDateTime(event.startTime)}
                  </time>
                  , {event.venue}
                </p>
              </div>
            )}

            <ul className={`divide-y divide-line border-y border-line ${event ? 'mt-6' : ''}`}>
              {booking.items.map((item) => (
                <li key={item.seatId} className="flex justify-between gap-4 py-3 text-base">
                  <span>
                    {item.section}, hàng {item.row} ghế {item.number}
                  </span>
                  <span className="text-cobalt tabular-nums">{formatVnd(item.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-baseline justify-between">
              <span className="text-base text-muted">Tổng cộng</span>
              <strong className="text-xl tabular-nums">{formatVnd(booking.totalAmount)}</strong>
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {booking.status === 'PAID' ? (
                <Link to="/tickets" className="mr-auto text-base text-cobalt hover:underline">
                  Xem vé
                </Link>
              ) : (
                (!isPending || countdown.isExpired) && (
                  <Link
                    to={`/events/${booking.eventId}`}
                    className="mr-auto text-base text-cobalt hover:underline"
                  >
                    Chọn ghế lại
                  </Link>
                )
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setActionError(null);
                  cancelMutation.mutate();
                }}
                disabled={actionsLocked}
                loading={cancelMutation.isPending}
                loadingLabel="Đang hủy..."
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  setActionError(null);
                  payMutation.mutate();
                }}
                disabled={actionsLocked}
                loading={payMutation.isPending}
                loadingLabel="Đang thanh toán..."
              >
                Thanh toán
              </Button>
            </div>
          </Panel>
        </div>

        {event && firstItem && (
          <aside aria-label="Xem trước vé">
            <h2 className="text-base font-medium text-muted">Vé của bạn sẽ trông như thế này</h2>
            <div className="mt-3">
              <Ticket
                event={event}
                section={firstItem.section}
                row={firstItem.row}
                number={firstItem.number}
                titleAs="h3"
              />
            </div>
            {otherCount > 0 && <p className="mt-3 text-base text-muted">và {otherCount} vé khác</p>}
          </aside>
        )}
      </div>
    </section>
  );
}

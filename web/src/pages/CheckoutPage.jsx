import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getBooking, payBooking } from '../api/bookings.api.js';
import { getEvent } from '../api/events.api.js';
import Countdown from '../components/Countdown.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Spinner from '../components/Spinner.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime, formatVnd } from '../utils/format.js';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/tickets', {
        state: { flash: 'Thanh toán thành công! Vé của bạn đã sẵn sàng.' },
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

  return (
    <section className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      {event && (
        <p className="mt-1 text-slate-600">
          {event.title} · <time dateTime={event.startTime}>{formatDateTime(event.startTime)}</time>{' '}
          · {event.venue}
        </p>
      )}

      {isPending ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">Thời gian giữ ghế còn lại</p>
          <Countdown display={countdown.display} isExpired={countdown.isExpired} />
          {countdown.isExpired && (
            <p role="alert" className="mt-2 font-medium text-red-600">
              Hết thời gian giữ ghế
            </p>
          )}
        </div>
      ) : (
        <p role="status" className="mt-6 rounded-md bg-slate-100 px-3 py-2 text-slate-700">
          {closedMessages[booking.status]}
        </p>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
        {booking.items.map((item) => (
          <li key={item.seatId} className="flex justify-between py-2 text-sm">
            <span>
              {item.section} · hàng {item.row} ghế {item.number}
            </span>
            <span>{formatVnd(item.price)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between font-semibold">
        <span>Tổng cộng</span>
        <span>{formatVnd(booking.totalAmount)}</span>
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {booking.status === 'PAID' ? (
          <Link
            to="/tickets"
            className="mr-auto self-center text-sm text-indigo-600 hover:underline"
          >
            Xem vé
          </Link>
        ) : (
          (!isPending || countdown.isExpired) && (
            <Link
              to={`/events/${booking.eventId}`}
              className="mr-auto self-center text-sm text-indigo-600 hover:underline"
            >
              Chọn ghế lại
            </Link>
          )
        )}
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            cancelMutation.mutate();
          }}
          disabled={actionsLocked}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
        >
          {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy'}
        </button>
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            payMutation.mutate();
          }}
          disabled={actionsLocked}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {payMutation.isPending ? 'Đang thanh toán...' : 'Thanh toán'}
        </button>
      </div>
    </section>
  );
}

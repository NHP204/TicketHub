import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { holdSeats } from '../api/bookings.api.js';
import { getEvent, getSeatMap } from '../api/events.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SeatMap from '../components/SeatMap.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';
import { formatDateTime, formatVnd } from '../utils/format.js';

const MAX_SEATS_PER_BOOKING = 6;

// id ghế → giá của section chứa ghế.
function buildSeatPrices(sections) {
  const prices = new Map();
  for (const section of sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) prices.set(seat.id, section.price);
    }
  }
  return prices;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const [selectedIds, setSelectedIds] = useState([]);
  const [holdError, setHoldError] = useState(null);

  const eventQuery = useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id) });
  const seatMapQuery = useQuery({ queryKey: ['seat-map', id], queryFn: () => getSeatMap(id) });

  const holdMutation = useMutation({
    mutationFn: holdSeats,
    onSuccess: (booking) => navigate(`/checkout/${booking.id}`),
    onError: (err) => {
      const { code, message } = parseApiError(err);
      if (code === 'SEAT_NOT_AVAILABLE') {
        const taken = new Set(err.response.data.error.details ?? []);
        setSelectedIds((prev) => prev.filter((seatId) => !taken.has(seatId)));
        setHoldError('Một số ghế bạn chọn vừa có người giữ. Sơ đồ đã được cập nhật.');
        queryClient.invalidateQueries({ queryKey: ['seat-map', id] });
      } else {
        setHoldError(message);
      }
    },
  });

  function handleToggle(seatId) {
    setHoldError(null);
    setSelectedIds((prev) => {
      if (prev.includes(seatId)) return prev.filter((x) => x !== seatId);
      return prev.length >= MAX_SEATS_PER_BOOKING ? prev : [...prev, seatId];
    });
  }

  function handleHold() {
    if (status !== 'authenticated') {
      navigate(`/login?next=${encodeURIComponent(`/events/${id}`)}`);
      return;
    }
    setHoldError(null);
    holdMutation.mutate({ eventId: id, seatIds: selectedIds });
  }

  if (eventQuery.isPending) return <Spinner />;
  if (eventQuery.isError) {
    return (
      <ErrorMessage
        message={parseApiError(eventQuery.error).message}
        onRetry={() => eventQuery.refetch()}
      />
    );
  }

  const event = eventQuery.data;
  const sections = seatMapQuery.data?.sections ?? [];
  const seatPrices = buildSeatPrices(sections);
  const total = selectedIds.reduce((sum, seatId) => sum + (seatPrices.get(seatId) ?? 0), 0);

  return (
    <section className="pb-28">
      {event.bannerUrl && (
        <img
          src={event.bannerUrl}
          alt={`Banner sự kiện ${event.title}`}
          className="aspect-[3/1] w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mt-6 text-2xl font-bold">{event.title}</h1>
      <p className="mt-2 text-slate-600">
        <time dateTime={event.startTime}>{formatDateTime(event.startTime)}</time> · {event.venue}
      </p>
      {event.description && (
        <p className="mt-4 whitespace-pre-line text-slate-700">{event.description}</p>
      )}

      <h2 className="mt-8 text-xl font-semibold">Chọn ghế</h2>

      {holdError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {holdError}
        </p>
      )}

      <div className="mt-4">
        {seatMapQuery.isPending ? (
          <Spinner />
        ) : seatMapQuery.isError ? (
          <ErrorMessage
            message={parseApiError(seatMapQuery.error).message}
            onRetry={() => seatMapQuery.refetch()}
          />
        ) : (
          <SeatMap
            sections={sections}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            maxSelect={MAX_SEATS_PER_BOOKING}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm" aria-live="polite">
            Đã chọn <strong>{selectedIds.length}</strong> ghế · Tổng tiền{' '}
            <strong>{formatVnd(total)}</strong>
          </p>
          <button
            type="button"
            onClick={handleHold}
            disabled={selectedIds.length === 0 || holdMutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {holdMutation.isPending ? 'Đang giữ ghế...' : 'Giữ ghế'}
          </button>
        </div>
      </div>
    </section>
  );
}

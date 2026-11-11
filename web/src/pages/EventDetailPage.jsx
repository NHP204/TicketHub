import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { holdSeats } from '../api/bookings.api.js';
import { getEvent, getSeatMap } from '../api/events.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventHero from '../components/EventHero.jsx';
import SeatMap from '../components/SeatMap.jsx';
import { assignZones } from '../components/seat-zones.js';
import SelectionPanel from '../components/SelectionPanel.jsx';
import Spinner from '../components/Spinner.jsx';
import { buttonClass } from '../components/ui/button-class.js';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';

const MAX_SEATS_PER_BOOKING = 6;
// Tài khoản quản lý chỉ xem sơ đồ ghế, không đặt vé.
const MANAGER_ROLES = ['ORGANIZER', 'ADMIN'];

// id ghế → khu vực, màu khu vực, hàng, số ghế và giá, để hiện danh sách ghế đã chọn.
function buildSeatIndex(sections) {
  const zones = assignZones(sections);
  const index = new Map();
  for (const section of sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) {
        index.set(seat.id, {
          id: seat.id,
          sectionName: section.name,
          zone: zones.get(section.id),
          row: row.label,
          number: seat.number,
          price: section.price,
        });
      }
    }
  }
  return index;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, status } = useAuth();
  const isManager = status === 'authenticated' && MANAGER_ROLES.includes(user.role);
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
  const seatIndex = buildSeatIndex(sections);
  const selectedSeats = selectedIds.map((seatId) => seatIndex.get(seatId)).filter(Boolean);
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const isOwner = isManager && user.role === 'ORGANIZER' && event.organizerId === user.id;

  return (
    <section className={isManager ? undefined : 'pb-28 lg:pb-0'}>
      <EventHero event={event} />

      {isManager && (
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface px-4 py-3">
          <p className="text-base text-ink">Tài khoản quản lý không đặt vé</p>
          {isOwner && (
            <Link
              to={`/organizer/events/${event.id}`}
              className={buttonClass({ variant: 'primary', size: 'sm' })}
            >
              Quản lý sự kiện này
            </Link>
          )}
        </div>
      )}

      <div
        className={`mt-8 ${
          isManager ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8'
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{isManager ? 'Sơ đồ ghế' : 'Chọn ghế'}</h2>

          {holdError && (
            <p
              role="alert"
              className="mt-4 rounded-panel border border-danger/30 bg-danger/5 px-4 py-3 text-base text-ink"
            >
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
                readOnly={isManager}
              />
            )}
          </div>
        </div>

        {!isManager && (
          <SelectionPanel
            seats={selectedSeats}
            total={total}
            isFull={selectedIds.length >= MAX_SEATS_PER_BOOKING}
            maxSelect={MAX_SEATS_PER_BOOKING}
            onRemove={handleToggle}
            onHold={handleHold}
            holding={holdMutation.isPending}
          />
        )}
      </div>
    </section>
  );
}

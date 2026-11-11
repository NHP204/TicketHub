import { formatVnd } from '../utils/format.js';
import { assignZones, sortSectionsByPrice, ZONE_STYLES } from './seat-zones.js';

const seatBase = 'size-9 rounded-seat text-sm font-medium tabular-nums';

// AVAILABLE không có ở đây: ghế còn trống lấy viền màu khu vực từ seat-zones.js.
const seatClasses = {
  SELECTED: 'border border-cobalt bg-cobalt text-surface',
  HELD: 'cursor-not-allowed border border-amber bg-amber/25 text-ink',
  BOOKED: 'cursor-not-allowed border border-seat-booked bg-seat-booked text-muted',
  LIMIT: 'cursor-not-allowed border border-line bg-surface text-seat-booked',
};

const legend = [
  { key: 'SELECTED', label: 'Đang chọn' },
  { key: 'HELD', label: 'Đang được giữ' },
  { key: 'BOOKED', label: 'Đã bán' },
];

// Co giãn nhẹ 120 ms khi chọn/bỏ chọn rồi về scale 1; không giữ trạng thái phóng to.
const SEAT_POP_KEYFRAMES = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.12)' },
  { transform: 'scale(1)' },
];

function popSeat(button) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof button.animate !== 'function') return;
  button.animate(SEAT_POP_KEYFRAMES, { duration: 120, easing: 'ease-out' });
}

function seatState(seat, isSelected, isFull) {
  if (seat.status !== 'AVAILABLE') return seat.status;
  if (isSelected) return 'SELECTED';
  return isFull ? 'LIMIT' : 'AVAILABLE';
}

// readOnly: chỉ xem (tài khoản quản lý). Mọi ghế disabled nhưng giữ màu theo trạng thái thật.
export default function SeatMap({
  sections,
  selectedIds = [],
  onToggle,
  maxSelect = 6,
  readOnly = false,
}) {
  const selected = new Set(readOnly ? [] : selectedIds);
  const isFull = !readOnly && selected.size >= maxSelect;
  const legendItems = readOnly ? legend.filter((item) => item.key !== 'SELECTED') : legend;
  const zones = assignZones(sections);

  function seatClassName(state, zoneStyle) {
    const stateClass =
      state === 'AVAILABLE'
        ? `bg-surface text-ink ${zoneStyle.border} ${zoneStyle.hover}`
        : seatClasses[state];
    return `${seatBase} ${stateClass}`;
  }

  // Một onClick duy nhất cho cả sơ đồ (event delegation): đọc data-seat-id của nút được bấm.
  function handleClick(event) {
    const button = event.target.closest('button[data-seat-id]');
    if (!button || button.disabled || !event.currentTarget.contains(button)) return;
    popSeat(button);
    onToggle(button.dataset.seatId);
  }

  return (
    <div onClick={handleClick}>
      <div className="rounded-panel border border-line bg-surface">
        {/* Khung cuộn ngang riêng; padding bên trong đủ cho viền focus (2px + 2px) và hiệu ứng co giãn. */}
        <div className="overflow-x-auto">
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-8 p-4 sm:p-6">
            <div className="flex w-full items-center gap-3 text-sm font-medium text-muted">
              <span className="h-0.5 flex-1 rounded-full bg-ink" />
              Sân khấu
              <span className="h-0.5 flex-1 rounded-full bg-ink" />
            </div>

            {sections.map((section) => {
              const zoneStyle = ZONE_STYLES[zones.get(section.id)];
              return (
                <section
                  key={section.id}
                  aria-label={`Khu ${section.name}`}
                  className="flex flex-col items-center"
                >
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <span
                      aria-hidden="true"
                      className={`inline-block size-3 rounded-full ${zoneStyle.swatch}`}
                    />
                    <span>
                      {section.name},{' '}
                      <span className="text-cobalt tabular-nums">{formatVnd(section.price)}</span>
                    </span>
                  </h3>
                  <div className="mt-3 space-y-2">
                    {section.rows.map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-6 shrink-0 text-sm font-medium text-muted">
                          {row.label}
                        </span>
                        {row.seats.map((seat) => {
                          const isSelected = selected.has(seat.id);
                          const state = seatState(seat, isSelected, isFull);
                          return (
                            <button
                              key={seat.id}
                              type="button"
                              data-seat-id={seat.id}
                              aria-label={`${section.name} hàng ${row.label} ghế ${seat.number}, ${formatVnd(section.price)}`}
                              aria-pressed={isSelected}
                              disabled={readOnly || (state !== 'AVAILABLE' && state !== 'SELECTED')}
                              className={seatClassName(state, zoneStyle)}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                        <span className="w-6 shrink-0" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <ul
        className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
        aria-label="Chú thích màu ghế"
      >
        {sortSectionsByPrice(sections).map((section) => (
          <li key={section.id} className="flex items-center gap-2">
            <span
              className={`inline-block size-4 rounded-seat bg-surface ${ZONE_STYLES[zones.get(section.id)].border}`}
            />
            {section.name}, <span className="tabular-nums">{formatVnd(section.price)}</span>
          </li>
        ))}
        {legendItems.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className={`inline-block size-4 rounded-seat ${seatClasses[item.key]}`} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

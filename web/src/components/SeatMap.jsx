import { formatVnd } from '../utils/format.js';

const seatBase =
  'h-9 w-9 rounded-md border text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none';

const seatClasses = {
  AVAILABLE: 'border-slate-300 bg-white text-slate-700 hover:border-indigo-500',
  SELECTED: 'border-indigo-600 bg-indigo-600 text-white',
  HELD: 'cursor-not-allowed border-amber-300 bg-amber-100 text-amber-700',
  BOOKED: 'cursor-not-allowed border-slate-300 bg-slate-300 text-slate-500',
  LIMIT: 'cursor-not-allowed border-slate-200 bg-white text-slate-300',
};

const legend = [
  { key: 'AVAILABLE', label: 'Còn trống' },
  { key: 'SELECTED', label: 'Đang chọn' },
  { key: 'HELD', label: 'Đang được giữ' },
  { key: 'BOOKED', label: 'Đã bán' },
];

function seatState(seat, isSelected, isFull) {
  if (seat.status !== 'AVAILABLE') return seat.status;
  if (isSelected) return 'SELECTED';
  return isFull ? 'LIMIT' : 'AVAILABLE';
}

export default function SeatMap({ sections, selectedIds, onToggle, maxSelect = 6 }) {
  const selected = new Set(selectedIds);
  const isFull = selected.size >= maxSelect;

  // Một onClick duy nhất cho cả sơ đồ (event delegation): đọc data-seat-id của nút được bấm.
  function handleClick(event) {
    const button = event.target.closest('button[data-seat-id]');
    if (!button || button.disabled || !event.currentTarget.contains(button)) return;
    onToggle(button.dataset.seatId);
  }

  return (
    <div onClick={handleClick}>
      <ul className="flex flex-wrap gap-4 text-sm text-slate-600" aria-label="Chú thích màu ghế">
        {legend.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className={`inline-block h-4 w-4 rounded border ${seatClasses[item.key]}`} />
            {item.label}
          </li>
        ))}
      </ul>

      {isFull && (
        <p className="mt-3 text-sm text-amber-700" role="status">
          Bạn đã chọn tối đa {maxSelect} ghế.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {sections.map((section) => (
          <section key={section.id} aria-label={`Khu ${section.name}`}>
            <h3 className="font-semibold">
              {section.name} · <span className="text-indigo-700">{formatVnd(section.price)}</span>
            </h3>
            <div className="mt-3 space-y-2 overflow-x-auto">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-sm font-medium text-slate-500">
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
                        disabled={state !== 'AVAILABLE' && state !== 'SELECTED'}
                        className={`${seatBase} ${seatClasses[state]}`}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

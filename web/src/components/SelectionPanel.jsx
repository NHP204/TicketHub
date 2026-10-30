import { useId, useState } from 'react';
import { formatVnd } from '../utils/format.js';
import Button from './ui/Button.jsx';
import Icon from './ui/Icon.jsx';

// Một khối DOM cho hai bố cục. Dưới 1024px: thanh cố định dưới cùng, bấm dòng "Đã chọn N ghế"
// để mở danh sách. Từ 1024px: khung "Ghế đã chọn" dính khi cuộn ở cột phải.
// Thứ tự hiển thị đổi bằng order-* để chỉ có một nút "Giữ ghế" và một danh sách.
export default function SelectionPanel({
  seats,
  total,
  isFull,
  maxSelect,
  onRemove,
  onHold,
  holding,
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const count = seats.length;

  return (
    <aside
      aria-label="Ghế đã chọn"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface shadow-float lg:sticky lg:inset-auto lg:top-[calc(var(--spacing-header)+24px)] lg:z-auto lg:rounded-panel lg:border lg:shadow-none"
    >
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 lg:max-w-none lg:flex-col lg:items-stretch lg:p-6">
        <h2 className="hidden text-lg font-semibold lg:order-1 lg:block">Ghế đã chọn</h2>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="order-1 flex min-h-11 flex-1 items-center gap-2 text-left text-base lg:hidden"
        >
          <span aria-live="polite">
            Đã chọn <strong>{count}</strong> ghế, tổng tiền{' '}
            <strong className="tabular-nums">{formatVnd(total)}</strong>
          </span>
          <Icon
            name="chevron-up"
            size={18}
            className={`text-muted ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div
          id={listId}
          className={`order-3 w-full lg:order-2 lg:block ${expanded ? 'block' : 'hidden'}`}
        >
          {count === 0 ? (
            <p className="py-2 text-base text-muted">Chọn ghế trên sơ đồ để bắt đầu.</p>
          ) : (
            <ul className="max-h-[40vh] divide-y divide-line overflow-y-auto lg:max-h-none">
              {seats.map((seat) => {
                const name = `${seat.sectionName} hàng ${seat.row} ghế ${seat.number}`;
                return (
                  <li key={seat.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">
                        {seat.sectionName}, hàng {seat.row} ghế {seat.number}
                      </p>
                      <p className="text-sm text-muted tabular-nums">{formatVnd(seat.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(seat.id)}
                      aria-label={`Bỏ chọn ${name}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-paper hover:text-ink"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isFull && (
          <p role="status" className="order-3 w-full text-sm text-ink lg:order-3">
            Bạn đã chọn tối đa {maxSelect} ghế. Bỏ chọn một ghế để đổi chỗ khác.
          </p>
        )}

        <div className="hidden items-baseline justify-between border-t border-line pt-4 lg:order-3 lg:flex">
          <span className="text-base text-muted">Tổng tiền</span>
          <strong className="text-xl tabular-nums" aria-live="polite">
            {formatVnd(total)}
          </strong>
        </div>

        <Button
          onClick={onHold}
          disabled={count === 0}
          loading={holding}
          loadingLabel="Đang giữ ghế..."
          className="order-2 lg:order-4 lg:w-full"
        >
          Giữ ghế
        </Button>

        <p className="hidden text-sm text-muted lg:order-5 lg:block">
          Ghế được giữ trong 10 phút sau khi bấm.
        </p>
      </div>
    </aside>
  );
}

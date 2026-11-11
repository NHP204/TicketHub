import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEventDateTime, getVnDateParts } from '../utils/format.js';
import { buttonClass } from './ui/button-class.js';

// Gom sự kiện (đã sắp theo startTime) thành nhóm theo tháng, giữ nguyên thứ tự.
function groupByMonth(events) {
  const groups = [];
  for (const event of events) {
    const parts = getVnDateParts(event.startTime);
    const key = `${parts.year}-${parts.month}`;
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, year: parts.year, month: parts.month, items: [] };
      groups.push(group);
    }
    group.items.push({ event, parts });
  }
  return groups;
}

// Lịch diễn theo tháng. now quyết định năm hiện tại: tháng khác năm thì thêm năm vào tiêu đề.
// Không truyền now thì dùng thời điểm component mount (lấy một lần, render lại không đổi).
export default function EventSchedule({ events, now }) {
  const [mountedAt] = useState(() => new Date());
  const currentYear = getVnDateParts((now ?? mountedAt).toISOString()).year;

  return (
    <div className="space-y-10">
      {groupByMonth(events).map((group) => (
        <section key={group.key} aria-labelledby={`month-${group.key}`}>
          <h2 id={`month-${group.key}`} className="text-xl font-semibold">
            Tháng {group.month}
            {group.year !== currentYear && `, ${group.year}`}
          </h2>
          <ul className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
            {group.items.map(({ event, parts }) => (
              <li
                key={event.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 px-4 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)_8rem_auto] sm:items-center sm:px-6"
              >
                <time dateTime={event.startTime} className="row-span-2 text-center sm:row-span-1">
                  <span
                    aria-hidden="true"
                    className="block font-display text-3xl leading-none font-extrabold tabular-nums"
                  >
                    {parts.day}
                  </span>
                  <span aria-hidden="true" className="mt-1 block text-sm font-medium text-muted">
                    {parts.weekdayShort}
                  </span>
                  <span className="sr-only">{formatEventDateTime(event.startTime)}</span>
                </time>

                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight font-extrabold break-words">
                    <Link to={`/events/${event.id}`} className="hover:text-cobalt hover:underline">
                      {event.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-base text-muted">
                    <span className="tabular-nums" aria-hidden="true">
                      {parts.time}
                    </span>
                    <span aria-hidden="true">, </span>
                    {event.venue}
                  </p>
                </div>

                {/* Chỗ dành sẵn cho giá "Từ X đ" khi API danh sách trả giá thấp nhất. */}
                <div className="hidden sm:block" />

                <Link
                  to={`/events/${event.id}`}
                  className={buttonClass({
                    className:
                      'col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end',
                  })}
                >
                  Chọn ghế<span className="sr-only">: {event.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

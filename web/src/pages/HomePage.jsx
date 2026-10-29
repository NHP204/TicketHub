import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventCard from '../components/EventCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { listEvents } from '../api/events.api.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { parseApiError } from '../utils/api-error.js';

const SEARCH_DEBOUNCE_MS = 300;

function toSearchParams(q, page = 1) {
  const params = {};
  if (q) params.q = q;
  if (page > 1) params.page = String(page);
  return params;
}

function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export default function HomePage() {
  // URL là nguồn sự thật cho q và page, để F5 và nút Back giữ đúng kết quả.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const page = parsePage(searchParams.get('page'));

  const [text, setText] = useState(q);
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  // URL đổi từ bên ngoài (Back/Forward) → đồng bộ lại ô tìm kiếm ngay trong render.
  // Giữ nguyên chữ đang gõ nếu chỉ khác khoảng trắng hai đầu.
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setText((prev) => (prev.trim() === q ? prev : q));
  }

  // Giá trị debounce đã đẩy lên URL gần nhất. Nhờ vậy khi bấm Back (q đổi, debounce chưa đổi)
  // effect không ghi đè URL bằng giá trị cũ.
  const appliedTextRef = useRef(q);

  useEffect(() => {
    if (debouncedText === appliedTextRef.current) return;
    appliedTextRef.current = debouncedText;
    const next = debouncedText.trim();
    if (next !== q) setSearchParams(toSearchParams(next));
  }, [debouncedText, q, setSearchParams]);

  const query = useQuery({
    queryKey: ['events', { q, page }],
    queryFn: () => listEvents({ q, page }),
    placeholderData: keepPreviousData,
  });

  function handleSubmit(event) {
    event.preventDefault();
    const next = text.trim();
    if (next !== q) setSearchParams(toSearchParams(next));
  }

  function handlePageChange(nextPage) {
    setSearchParams(toSearchParams(q, nextPage));
  }

  const events = query.data?.events ?? [];
  const meta = query.data?.meta;

  return (
    <section>
      <h1 className="text-2xl font-bold">Sự kiện sắp diễn ra</h1>

      <form role="search" onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <label htmlFor="event-search" className="sr-only">
          Tìm sự kiện
        </label>
        <input
          id="event-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tìm theo tên sự kiện..."
          maxLength={100}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Tìm
        </button>
      </form>

      <div className="mt-6">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorMessage
            message={parseApiError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : events.length === 0 ? (
          <EmptyState>{q ? `Không có sự kiện khớp với “${q}”` : 'Chưa có sự kiện nào.'}</EmptyState>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

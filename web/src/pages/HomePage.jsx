import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EventHero from '../components/EventHero.jsx';
import EventSchedule from '../components/EventSchedule.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import Button from '../components/ui/Button.jsx';
import { buttonClass } from '../components/ui/button-class.js';
import Field from '../components/ui/Field.jsx';
import Input from '../components/ui/Input.jsx';
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

  function handleClearSearch() {
    setText('');
    setSearchParams({});
  }

  const events = query.data?.events ?? [];
  const meta = query.data?.meta;
  // Phần đầu trang: sự kiện sắp diễn gần nhất, chỉ ở trang 1 khi không tìm kiếm.
  // API sắp theo startTime tăng dần nên sự kiện đầu tiên chưa diễn là gần nhất.
  const [now] = useState(() => new Date());
  const nextEvent =
    !q && page === 1 ? events.find((event) => new Date(event.startTime) >= now) : undefined;

  return (
    <section>
      {nextEvent && (
        <EventHero
          event={nextEvent}
          titleAs="h2"
          showDescription={false}
          action={
            <Link to={`/events/${nextEvent.id}`} className={buttonClass({ variant: 'secondary' })}>
              Chọn ghế<span className="sr-only">: {nextEvent.title}</span>
            </Link>
          }
        />
      )}

      <h1 className={`text-2xl font-semibold ${nextEvent ? 'mt-10' : ''}`}>Lịch diễn</h1>

      <form role="search" onSubmit={handleSubmit} className="mt-4 flex max-w-xl items-end gap-2">
        <Field id="event-search" label="Tìm sự kiện" className="flex-1">
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tên sự kiện hoặc địa điểm"
            maxLength={100}
          />
        </Field>
        <Button type="submit">Tìm</Button>
      </form>

      <div className="mt-8">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorMessage
            message={parseApiError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : events.length === 0 ? (
          q ? (
            <EmptyState
              action={
                <Button variant="secondary" onClick={handleClearSearch}>
                  Xem tất cả sự kiện
                </Button>
              }
            >
              {`Không có sự kiện khớp với “${q}”`}
            </EmptyState>
          ) : (
            <EmptyState>Chưa có lịch diễn mới. Quay lại sau để chọn ghế sớm.</EmptyState>
          )
        ) : (
          <>
            <EventSchedule events={events} now={now} />
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

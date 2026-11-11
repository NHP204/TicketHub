import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listMyEventStats, listMyEvents } from '../../api/organizer.api.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { buttonClass } from '../../components/ui/button-class.js';
import Notice from '../../components/ui/Notice.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatEventDateTime, formatVnd } from '../../utils/format.js';

const th = 'px-4 py-3 text-left text-sm font-medium text-muted';

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Giữ thông báo trong state rồi xóa khỏi history, để F5 không hiện lại.
  const [flash] = useState(location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const eventsQuery = useQuery({ queryKey: ['organizer-events'], queryFn: listMyEvents });
  const statsQuery = useQuery({ queryKey: ['organizer-stats'], queryFn: listMyEventStats });

  const failedQuery = [eventsQuery, statsQuery].find((q) => q.isError);
  const statsByEvent = new Map((statsQuery.data ?? []).map((s) => [s.eventId, s]));

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Quản lý sự kiện</h1>
        <Link to="/organizer/events/new" className={buttonClass()}>
          Tạo sự kiện
        </Link>
      </div>

      {flash && <Notice className="mt-4">{flash}</Notice>}

      <div className="mt-6">
        {failedQuery ? (
          <ErrorMessage
            message={parseApiError(failedQuery.error).message}
            onRetry={() => failedQuery.refetch()}
          />
        ) : eventsQuery.isPending || statsQuery.isPending ? (
          <Spinner />
        ) : eventsQuery.data.length === 0 ? (
          <EmptyState
            action={
              <Link to="/organizer/events/new" className={buttonClass()}>
                Tạo sự kiện đầu tiên
              </Link>
            }
          >
            Bạn chưa có sự kiện nào.
          </EmptyState>
        ) : (
          // Khung cuộn ngang riêng: trên điện thoại chỉ bảng cuộn, trang không cuộn ngang.
          <div className="overflow-x-auto rounded-panel border border-line bg-surface">
            <table className="min-w-full divide-y divide-line text-base">
              <thead className="bg-paper">
                <tr>
                  <th scope="col" className={th}>
                    Tên
                  </th>
                  <th scope="col" className={th}>
                    Trạng thái
                  </th>
                  <th scope="col" className={th}>
                    Ngày
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Vé bán
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Doanh thu
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Thống kê</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {eventsQuery.data.map((event) => {
                  const stats = statsByEvent.get(event.id);
                  return (
                    <tr key={event.id}>
                      <td className="min-w-48 px-4 py-3">
                        <Link
                          to={`/organizer/events/${event.id}`}
                          className="font-display text-lg leading-tight font-extrabold text-cobalt hover:underline"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={event.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">
                        {formatEventDateTime(event.startTime)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {stats ? `${stats.ticketsSold} / ${stats.capacity}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-cobalt tabular-nums">
                        {formatVnd(stats?.revenue ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/organizer/events/${event.id}/stats`}
                          aria-label={`Thống kê ${event.title}`}
                          className="font-medium text-cobalt hover:underline"
                        >
                          Thống kê
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

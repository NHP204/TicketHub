import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listMyEventStats, listMyEvents } from '../../api/organizer.api.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatDateTime, formatVnd } from '../../utils/format.js';

const eventStatusLabels = {
  DRAFT: { text: 'Nháp', className: 'bg-amber-100 text-amber-800' },
  PUBLISHED: { text: 'Đã công bố', className: 'bg-green-100 text-green-800' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-slate-200 text-slate-700' },
};

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
        <h1 className="text-2xl font-bold">Quản lý sự kiện</h1>
        <Link
          to="/organizer/events/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Tạo sự kiện
        </Link>
      </div>

      {flash && (
        <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {flash}
        </p>
      )}

      <div className="mt-6">
        {failedQuery ? (
          <ErrorMessage
            message={parseApiError(failedQuery.error).message}
            onRetry={() => failedQuery.refetch()}
          />
        ) : eventsQuery.isPending || statsQuery.isPending ? (
          <Spinner />
        ) : eventsQuery.data.length === 0 ? (
          <EmptyState>Bạn chưa có sự kiện nào.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tên
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Ngày
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Vé bán
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Doanh thu
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Thống kê</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {eventsQuery.data.map((event) => {
                  const stats = statsByEvent.get(event.id);
                  const status = eventStatusLabels[event.status];
                  return (
                    <tr key={event.id}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/organizer/events/${event.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(event.startTime)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {stats ? `${stats.ticketsSold} / ${stats.capacity}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatVnd(stats?.revenue ?? 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/organizer/events/${event.id}/stats`}
                          aria-label={`Thống kê ${event.title}`}
                          className="text-indigo-600 hover:underline"
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

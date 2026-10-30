import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../api/admin.api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatCard from '../../components/StatCard.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatVnd } from '../../utils/format.js';

const roleLabels = [
  { key: 'USER', label: 'Người dùng' },
  { key: 'ORGANIZER', label: 'Nhà tổ chức' },
  { key: 'ADMIN', label: 'Quản trị viên' },
];

const eventStatusLabels = [
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'PUBLISHED', label: 'Đã công bố' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

function StatsGroup({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const stats = statsQuery.data;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <Link
          to="/admin/users"
          className="rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white hover:bg-cobalt-hover"
        >
          Quản lý user
        </Link>
      </div>

      <div className="mt-6">
        {statsQuery.isPending ? (
          <Spinner />
        ) : statsQuery.isError ? (
          <ErrorMessage
            message={parseApiError(statsQuery.error).message}
            onRetry={() => statsQuery.refetch()}
          />
        ) : (
          <div className="space-y-8">
            <StatsGroup title="Bán vé">
              <StatCard label="Tổng doanh thu" value={formatVnd(stats.totalRevenue)} />
              <StatCard label="Tổng vé đã bán" value={stats.ticketsSold} />
            </StatsGroup>
            <StatsGroup title="User theo role">
              {roleLabels.map(({ key, label }) => (
                <StatCard key={key} label={label} value={stats.usersByRole[key] ?? 0} />
              ))}
            </StatsGroup>
            <StatsGroup title="Sự kiện theo trạng thái">
              {eventStatusLabels.map(({ key, label }) => (
                <StatCard key={key} label={label} value={stats.events[key] ?? 0} />
              ))}
            </StatsGroup>
          </div>
        )}
      </div>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../api/admin.api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatCard from '../../components/StatCard.jsx';
import { buttonClass } from '../../components/ui/button-class.js';
import Panel from '../../components/ui/Panel.jsx';
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
    <Panel as="section">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">{children}</div>
    </Panel>
  );
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const stats = statsQuery.data;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tổng quan</h1>
        <Link to="/admin/users" className={buttonClass({ variant: 'secondary' })}>
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
          <div className="space-y-6">
            <StatsGroup title="Bán vé">
              <StatCard label="Tổng doanh thu" value={formatVnd(stats.totalRevenue)} />
              <StatCard label="Tổng vé đã bán" value={stats.ticketsSold.toLocaleString('vi-VN')} />
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

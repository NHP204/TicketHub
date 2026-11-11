import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getEvent } from '../../api/events.api.js';
import { getEventStats } from '../../api/organizer.api.js';
import BackLink from '../../components/BackLink.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatCard from '../../components/StatCard.jsx';
import { assignZones, ZONE_STYLES } from '../../components/seat-zones.js';
import Panel from '../../components/ui/Panel.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatVnd } from '../../utils/format.js';

// Trục Y gọn: 1.600.000 → "1,6 Tr".
const compactVnd = new Intl.NumberFormat('vi-VN', { notation: 'compact' });

// Màu biểu đồ lấy từ token; bỏ màu mặc định của Recharts.
const AXIS_TICK = { fill: 'var(--color-muted)', fontSize: 13 };
const AXIS_LINE = { stroke: 'var(--color-line)' };
const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid var(--color-line)',
  color: 'var(--color-ink)',
};

function formatPercent(value) {
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

export default function StatsPage() {
  const { id } = useParams();
  const eventQuery = useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id) });
  const statsQuery = useQuery({
    queryKey: ['organizer-event-stats', id],
    queryFn: () => getEventStats(id),
  });

  if (statsQuery.isPending) return <Spinner />;
  if (statsQuery.isError) {
    return (
      <ErrorMessage
        message={parseApiError(statsQuery.error).message}
        onRetry={() => statsQuery.refetch()}
      />
    );
  }

  const stats = statsQuery.data;
  const capacity = stats.sections.reduce((sum, s) => sum + s.capacity, 0);
  const held = stats.sections.reduce((sum, s) => sum + s.held, 0);
  const fillRate = capacity > 0 ? (stats.ticketsSold * 100) / capacity : 0;

  // Cột theo màu khu vực giống sơ đồ ghế (giá giảm dần). Tên khu vực là duy nhất trong sự kiện.
  const zones = assignZones(stats.sections.map((s) => ({ id: s.name, price: s.price })));
  const th = 'px-4 py-3 text-right text-sm font-medium text-muted';

  return (
    <section className="space-y-6">
      <div>
        <BackLink to={`/organizer/events/${id}`}>Quản lý sự kiện</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">Thống kê</h1>
        {eventQuery.data && (
          <p className="mt-1 font-display text-3xl leading-none font-extrabold">
            {eventQuery.data.title}
          </p>
        )}
      </div>

      <Panel>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Doanh thu" value={formatVnd(stats.revenue)} />
          <StatCard
            label="Vé đã bán"
            value={stats.ticketsSold.toLocaleString('vi-VN')}
            hint={`Trên tổng ${capacity.toLocaleString('vi-VN')} ghế`}
          />
          <StatCard label="Tỷ lệ lấp đầy" value={formatPercent(fillRate)} />
          <StatCard label="Ghế đang giữ" value={held.toLocaleString('vi-VN')} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold">Doanh thu theo khu vực</h2>
        {stats.sections.length === 0 ? (
          <EmptyState>
            Sự kiện chưa có khu vực ghế nào. Thêm khu vực ở trang quản lý sự kiện.
          </EmptyState>
        ) : (
          <>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sections} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid
                    stroke="var(--color-line)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="name" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => compactVnd.format(v)}
                    width={64}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [formatVnd(v), 'Doanh thu']}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'var(--color-paper)' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {stats.sections.map((section) => (
                      <Cell
                        key={section.name}
                        fill={`var(--color-zone-${zones.get(section.name) + 1})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-base">
                <thead>
                  <tr>
                    <th scope="col" className={`${th} text-left`}>
                      Khu vực
                    </th>
                    <th scope="col" className={th}>
                      Giá
                    </th>
                    <th scope="col" className={th}>
                      Đã bán
                    </th>
                    <th scope="col" className={th}>
                      Lấp đầy
                    </th>
                    <th scope="col" className={th}>
                      Doanh thu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {stats.sections.map((section) => (
                    <tr key={section.name}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className={`mr-2 inline-block size-3 rounded-full ${
                            ZONE_STYLES[zones.get(section.name)].swatch
                          }`}
                        />
                        {section.name}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-cobalt">
                        {formatVnd(section.price)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {section.sold} / {section.capacity}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatPercent(section.fillRate)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatVnd(section.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEvent } from '../../api/events.api.js';
import { getEventStats } from '../../api/organizer.api.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Spinner from '../../components/Spinner.jsx';
import StatCard from '../../components/StatCard.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatVnd } from '../../utils/format.js';

// Trục Y gọn: 1.600.000 → "1,6 Tr".
const compactVnd = new Intl.NumberFormat('vi-VN', { notation: 'compact' });

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

  return (
    <section className="space-y-6">
      <div>
        <Link to={`/organizer/events/${id}`} className="text-sm text-indigo-600 hover:underline">
          ← Quản lý sự kiện
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Thống kê{eventQuery.data ? `: ${eventQuery.data.title}` : ''}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Doanh thu" value={formatVnd(stats.revenue)} />
        <StatCard
          label="Vé đã bán"
          value={stats.ticketsSold.toLocaleString('vi-VN')}
          hint={`Trên tổng ${capacity.toLocaleString('vi-VN')} ghế`}
        />
        <StatCard label="Tỷ lệ lấp đầy" value={formatPercent(fillRate)} />
        <StatCard label="Ghế đang giữ" value={held.toLocaleString('vi-VN')} />
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Doanh thu theo khu vực</h2>
        {stats.sections.length === 0 ? (
          <EmptyState>Sự kiện chưa có khu vực ghế nào.</EmptyState>
        ) : (
          <>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sections} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => compactVnd.format(v)} width={64} />
                  <Tooltip formatter={(v) => [formatVnd(v), 'Doanh thu']} />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Khu vực
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Giá
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Đã bán
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Lấp đầy
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Doanh thu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.sections.map((section) => (
                    <tr key={section.name}>
                      <td className="px-3 py-2 font-medium">{section.name}</td>
                      <td className="px-3 py-2 text-right">{formatVnd(section.price)}</td>
                      <td className="px-3 py-2 text-right">
                        {section.sold} / {section.capacity}
                      </td>
                      <td className="px-3 py-2 text-right">{formatPercent(section.fillRate)}</td>
                      <td className="px-3 py-2 text-right">{formatVnd(section.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

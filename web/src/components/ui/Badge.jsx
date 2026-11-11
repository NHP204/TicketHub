// Trạng thái booking và sự kiện. Amber chỉ dành cho thứ có hạn thời gian (booking PENDING).
const STATUSES = {
  PENDING: { text: 'Chờ thanh toán', tone: 'urgent' },
  PAID: { text: 'Đã thanh toán', tone: 'success' },
  EXPIRED: { text: 'Hết hạn', tone: 'neutral' },
  CANCELLED: { text: 'Đã hủy', tone: 'neutral' },
  DRAFT: { text: 'Nháp', tone: 'outline' },
  PUBLISHED: { text: 'Đã công bố', tone: 'success' },
};

const TONES = {
  urgent: 'bg-amber text-ink',
  success: 'bg-success/12 text-success-ink',
  info: 'bg-cobalt/10 text-cobalt',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-line text-ink',
  outline: 'border border-line bg-surface text-muted',
};

export default function Badge({ status, tone, children }) {
  const preset = STATUSES[status];
  const toneClass = TONES[tone ?? preset?.tone ?? 'neutral'];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${toneClass}`}
    >
      {children ?? preset?.text ?? status}
    </span>
  );
}

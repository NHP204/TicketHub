import { formatEventDateTime } from '../utils/format.js';

// Tấm vé: phần chính (sự kiện, khu vực, mã ghế lớn) và cuống (QR, mã vé) ngăn bởi đường xé.
// qrData: ảnh QR (chỉ có ở chi tiết vé); không có thì cuống hiện chỗ chờ QR (xem trước ở checkout).
// animate: trượt lên một lần (animate-ticket-rise), tắt khi prefers-reduced-motion.
export default function Ticket({
  event,
  section,
  row,
  number,
  code,
  qrData,
  stubAction,
  animate = false,
  animationDelayMs = 0,
  size = 'md',
  titleAs: Title = 'h2',
}) {
  const large = size === 'lg';

  return (
    <article
      aria-label={`Vé ${event.title}, ${section} hàng ${row} ghế ${number}`}
      className={`flex flex-col overflow-hidden rounded-ticket border border-line bg-surface break-inside-avoid sm:flex-row ${
        animate ? 'animate-ticket-rise' : ''
      }`}
      style={animate && animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
    >
      <div className="min-w-0 flex-1 p-6">
        <Title
          className={`font-display leading-[0.95] font-extrabold break-words ${
            large ? 'text-3xl' : 'text-2xl'
          }`}
        >
          {event.title}
        </Title>
        <p className="mt-2 text-base">
          <time dateTime={event.startTime} className="tabular-nums">
            {formatEventDateTime(event.startTime)}
          </time>
        </p>
        <p className="text-base text-muted">{event.venue}</p>

        <div className="mt-6 flex items-end gap-4">
          <div>
            <p className="text-sm text-muted">Khu vực</p>
            <p className="text-lg font-semibold">{section}</p>
          </div>
          <p className="ml-auto text-right">
            <span className="block text-sm text-muted">
              Hàng {row}, ghế {number}
            </span>
            <span
              aria-hidden="true"
              className={`block font-display leading-none font-extrabold text-cobalt ${
                large ? 'text-5xl' : 'text-4xl'
              }`}
            >
              {row}
              {number}
            </span>
          </p>
        </div>
      </div>

      <div className="ticket-stub flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-line p-6 sm:w-52 sm:border-t-0 sm:border-l-2">
        {qrData ? (
          <img src={qrData} alt={`Mã QR vé ${code}`} className={large ? 'size-44' : 'size-32'} />
        ) : (
          <p
            className={`flex items-center justify-center rounded-control border-2 border-dashed border-line p-3 text-center text-sm text-muted ${
              large ? 'size-44' : 'size-32'
            }`}
          >
            {code ? 'Mở vé để xem QR' : 'QR có sau khi thanh toán'}
          </p>
        )}
        {code && <p className="font-mono text-sm font-semibold break-all">{code}</p>}
        {stubAction}
      </div>
    </article>
  );
}

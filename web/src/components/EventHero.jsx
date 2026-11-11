import { formatEventDateTime } from '../utils/format.js';
import FullBleed from './ui/FullBleed.jsx';
import Icon from './ui/Icon.jsx';

// Phần đầu trang chủ và trang sự kiện: banner phủ toàn khối, hoặc poster chữ trên nền màu khu vực
// đầu tiên khi không có banner. -mt-8 bù padding trên của <main> để khối nằm sát header.
// Chữ luôn trắng đặc: trên zone-1 đạt 5.3:1; trên banner có lớp phủ ink 70% nên dù ảnh trắng hẳn,
// nền sau chữ vẫn tối tới khoảng #5D5C6B (6.5:1).
export default function EventHero({
  event,
  titleAs: Title = 'h1',
  action,
  showDescription = true,
}) {
  const hasBanner = Boolean(event.bannerUrl);
  const media = hasBanner ? (
    <>
      <img
        src={event.bannerUrl}
        alt={`Banner sự kiện ${event.title}`}
        className="size-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/70" />
    </>
  ) : null;

  return (
    <FullBleed className={`-mt-8 text-surface ${hasBanner ? 'bg-ink' : 'bg-zone-1'}`} media={media}>
      <div
        className={`flex flex-col justify-end py-10 sm:py-14 ${
          hasBanner ? 'min-h-80 lg:min-h-96' : 'min-h-64'
        }`}
      >
        <Title
          className={`max-w-[18ch] font-display leading-[0.95] font-extrabold break-words ${
            hasBanner ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'
          }`}
        >
          {event.title}
        </Title>
        <ul className="mt-4 space-y-2 text-base sm:text-lg">
          <li className="flex items-start gap-2">
            <Icon name="calendar" className="mt-1" />
            <time dateTime={event.startTime} className="tabular-nums">
              {formatEventDateTime(event.startTime)}
            </time>
          </li>
          <li className="flex items-start gap-2">
            <Icon name="location" className="mt-1" />
            {event.venue}
          </li>
        </ul>
        {showDescription && event.description && (
          <p className="mt-4 max-w-[70ch] whitespace-pre-line">{event.description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </FullBleed>
  );
}

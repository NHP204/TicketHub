import { formatEventDateTime } from '../utils/format.js';
import FullBleed from './ui/FullBleed.jsx';
import Icon from './ui/Icon.jsx';

// Phần đầu trang sự kiện: banner phủ toàn khối, hoặc poster chữ trên nền ink khi không có banner.
// -mt-8 bù padding trên của <main> để khối nằm sát header.
export default function EventHero({ event }) {
  const media = event.bannerUrl ? (
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
    <FullBleed className="-mt-8 bg-ink text-surface" media={media}>
      <div
        className={`flex flex-col justify-end py-10 sm:py-14 ${
          event.bannerUrl ? 'min-h-80 lg:min-h-96' : 'min-h-64'
        }`}
      >
        <h1
          className={`max-w-[18ch] font-display leading-[0.95] font-extrabold break-words ${
            event.bannerUrl ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'
          }`}
        >
          {event.title}
        </h1>
        <ul className="mt-4 space-y-2 text-base text-surface/85 sm:text-lg">
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
        {event.description && (
          <p className="mt-4 max-w-[70ch] whitespace-pre-line text-surface/85">
            {event.description}
          </p>
        )}
      </div>
    </FullBleed>
  );
}

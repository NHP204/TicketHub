import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/format.js';

export default function EventCard({ event }) {
  return (
    <li className="overflow-hidden rounded-lg bg-white shadow-sm">
      <Link to={`/events/${event.id}`} className="block hover:opacity-90">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={`Banner sự kiện ${event.title}`}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full bg-slate-200" aria-hidden="true" />
        )}
        <div className="p-4">
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            <time dateTime={event.startTime}>{formatDateTime(event.startTime)}</time>
          </p>
          <p className="text-sm text-slate-600">{event.venue}</p>
        </div>
      </Link>
    </li>
  );
}

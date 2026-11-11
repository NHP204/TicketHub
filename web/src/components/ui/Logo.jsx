import Icon from './Icon.jsx';

// Wordmark TicketHub kèm icon tấm vé. tone="light" dùng trên nền ink.
export default function Logo({ tone = 'dark' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon
        name="ticket"
        size={32}
        className={`-rotate-12 ${tone === 'light' ? 'text-surface' : 'text-cobalt'}`}
      />
      <span
        className={`font-display text-2xl leading-none font-extrabold tracking-wide ${
          tone === 'light' ? 'text-surface' : 'text-ink'
        }`}
      >
        TicketHub
      </span>
    </span>
  );
}

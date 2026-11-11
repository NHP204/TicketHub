export default function Countdown({ display, isExpired }) {
  return (
    <p
      role="timer"
      className={`font-display text-4xl leading-none font-extrabold tabular-nums ${isExpired ? 'text-danger' : 'text-ink'}`}
      aria-label={`Thời gian giữ ghế còn lại ${display}`}
    >
      <time>{display}</time>
    </p>
  );
}

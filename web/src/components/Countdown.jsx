export default function Countdown({ display, isExpired }) {
  return (
    <p
      role="timer"
      className={`text-3xl font-bold tabular-nums ${isExpired ? 'text-red-600' : 'text-indigo-700'}`}
      aria-label={`Thời gian giữ ghế còn lại ${display}`}
    >
      <time>{display}</time>
    </p>
  );
}

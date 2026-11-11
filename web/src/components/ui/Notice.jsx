// Lời nhắn sau một hành động. error dùng role="alert", success dùng role="status".
const TONES = {
  success: 'border-success/30 bg-success/12 text-success-ink',
  error: 'border-danger/30 bg-danger/5 text-ink',
};

export default function Notice({ tone = 'success', className = '', children }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-panel border px-4 py-3 text-base ${TONES[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

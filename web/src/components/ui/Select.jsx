export default function Select({ invalid = false, className = '', children, ...props }) {
  return (
    <select
      aria-invalid={invalid ? 'true' : undefined}
      className={`block min-h-11 rounded-control border bg-surface px-3 text-base text-ink disabled:bg-paper disabled:text-muted ${
        invalid ? 'border-danger' : 'border-line hover:border-muted'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

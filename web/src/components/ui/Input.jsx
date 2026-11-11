export default function Input({ invalid = false, className = '', ...props }) {
  return (
    <input
      aria-invalid={invalid ? 'true' : undefined}
      className={`block min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink placeholder:text-muted disabled:bg-paper disabled:text-muted ${
        invalid ? 'border-danger' : 'border-line hover:border-muted'
      } ${className}`}
      {...props}
    />
  );
}

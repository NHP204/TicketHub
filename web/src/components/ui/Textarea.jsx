export default function Textarea({ invalid = false, className = '', ...props }) {
  return (
    <textarea
      aria-invalid={invalid ? 'true' : undefined}
      className={`block w-full rounded-control border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted disabled:bg-paper disabled:text-muted ${
        invalid ? 'border-danger' : 'border-line hover:border-muted'
      } ${className}`}
      {...props}
    />
  );
}

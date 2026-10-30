import { cloneElement } from 'react';
import Icon from './Icon.jsx';

// Nhãn, gợi ý và lỗi cho một ô nhập. Field gắn id, aria-describedby, invalid vào control con.
export default function Field({ id, label, hint, error, className = '', children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        invalid: Boolean(error),
        'aria-describedby': describedBy,
        className: `mt-1 ${children.props.className ?? ''}`,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1 text-sm text-danger">
          <Icon name="alert" size={16} className="mt-px" />
          {error}
        </p>
      )}
    </div>
  );
}

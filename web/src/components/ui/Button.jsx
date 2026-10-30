import { buttonClass } from './button-class.js';
import Icon from './Icon.jsx';

// loading: khóa nút và hiện vòng quay; chữ nút giữ nguyên trừ khi truyền loadingLabel.
export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      {loading && <Icon name="spinner" size={16} className="animate-spin" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

// Class giao diện của nút, tách riêng để Link cũng dùng được kiểu nút.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55';

const VARIANTS = {
  primary: 'bg-cobalt text-surface hover:bg-cobalt-hover',
  secondary: 'border border-line bg-surface text-ink hover:border-ink',
  danger: 'bg-danger text-surface hover:bg-danger-hover',
  ghost: 'text-cobalt hover:bg-cobalt/8',
};

const SIZES = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-base',
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

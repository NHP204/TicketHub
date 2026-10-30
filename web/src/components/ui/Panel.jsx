// Khối nền trắng có viền cho bảng, form. Không đổ bóng: bóng chỉ dành cho thứ nổi trên trang.
const PADDINGS = {
  none: '',
  md: 'p-4 sm:p-6',
};

export default function Panel({
  as: Tag = 'div',
  padding = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={`rounded-panel border border-line bg-surface ${PADDINGS[padding]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

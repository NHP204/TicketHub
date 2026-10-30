// Khối tràn hết chiều ngang màn hình; nội dung bên trong vẫn nằm trong page-container.
// media: ảnh hoặc nền phủ toàn khối, nằm dưới nội dung (ví dụ <img className="size-full object-cover" />).
export default function FullBleed({
  as: Tag = 'section',
  media,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag className={`full-bleed relative isolate overflow-hidden ${className}`} {...props}>
      {media && <div className="absolute inset-0 -z-10">{media}</div>}
      <div className="page-container">{children}</div>
    </Tag>
  );
}

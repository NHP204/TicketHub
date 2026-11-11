// Trang trống là lời mời hành động: action là nút hoặc liên kết đặt dưới lời nhắn.
export default function EmptyState({ children, action }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="mx-auto max-w-[70ch] text-base text-muted">{children}</p>
      {action}
    </div>
  );
}

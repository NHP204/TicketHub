// Số liệu lớn: không bọc thẻ có bóng, chỉ một vạch trái phân nhóm. Nhãn là <p> ngay trước giá trị.
export default function StatCard({ label, value, hint }) {
  return (
    <div className="border-l-2 border-line pl-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  );
}

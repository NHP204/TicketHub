export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const buttonClass =
    'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50';

  return (
    <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={buttonClass}
      >
        Trang trước
      </button>
      <span className="text-sm text-slate-600">
        Trang {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={buttonClass}
      >
        Trang sau
      </button>
    </nav>
  );
}

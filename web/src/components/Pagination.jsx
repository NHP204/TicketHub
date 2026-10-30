import Button from './ui/Button.jsx';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Trang trước
      </Button>
      <span className="text-sm text-muted tabular-nums">
        Trang {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Trang sau
      </Button>
    </nav>
  );
}

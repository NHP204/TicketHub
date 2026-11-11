import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="py-12 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mx-auto mt-2 max-w-[70ch] text-base text-muted">
        Đường dẫn có thể đã đổi hoặc sự kiện không còn mở bán.
      </p>
      <Link to="/" className="mt-4 inline-block font-medium text-cobalt hover:underline">
        Về trang chủ
      </Link>
    </section>
  );
}

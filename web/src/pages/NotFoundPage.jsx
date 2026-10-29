import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        Về trang chủ
      </Link>
    </section>
  );
}

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';
import { landingPath } from '../utils/role-home.js';

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  // Thông báo từ trang khác (vd. sau khi đổi mật khẩu).
  const flash = useLocation().state?.flash ?? null;
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [form, setForm] = useState({ email: '', password: '' });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (loggedIn) => navigate(landingPath(loggedIn.role, next), { replace: true }),
  });

  if (status === 'authenticated' && !mutation.isPending) {
    return <Navigate to={landingPath(user.role, next)} replace />;
  }

  const error = mutation.error ? parseApiError(mutation.error) : null;

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>

      {flash && !error && (
        <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {flash}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={error?.fieldErrors.email}
          required
        />
        <FormField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={error?.fieldErrors.password}
          required
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline">
          Đăng ký
        </Link>
      </p>
    </section>
  );
}

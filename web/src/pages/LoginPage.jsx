import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Notice from '../components/ui/Notice.jsx';
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
    <section className="mx-auto max-w-md rounded-panel border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>

      {flash && !error && <Notice className="mt-4">{flash}</Notice>}

      {error && (
        <Notice tone="error" className="mt-4">
          {error.message}
        </Notice>
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
        <Button
          type="submit"
          loading={mutation.isPending}
          loadingLabel="Đang đăng nhập..."
          className="w-full"
        >
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 text-center text-base text-muted">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-cobalt hover:underline">
          Đăng ký
        </Link>
      </p>
    </section>
  );
}

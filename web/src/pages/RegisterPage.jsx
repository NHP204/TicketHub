import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Notice from '../components/ui/Notice.jsx';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';

export default function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate('/', { replace: true }),
  });

  if (status === 'authenticated' && !mutation.isPending) {
    return <Navigate to="/" replace />;
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
      <h1 className="text-2xl font-semibold">Đăng ký</h1>

      {error && (
        <Notice tone="error" className="mt-4">
          {error.message}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <FormField
          id="fullName"
          label="Họ và tên"
          autoComplete="name"
          value={form.fullName}
          onChange={handleChange}
          error={error?.fieldErrors.fullName}
          required
        />
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
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={error?.fieldErrors.password}
          required
        />
        <p className="text-sm text-muted">Tối thiểu 8 ký tự, có cả chữ và số.</p>
        <Button
          type="submit"
          loading={mutation.isPending}
          loadingLabel="Đang đăng ký..."
          className="w-full"
        >
          Đăng ký
        </Button>
      </form>

      <p className="mt-6 text-center text-base text-muted">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-cobalt hover:underline">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}

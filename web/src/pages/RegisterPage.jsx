import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
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
    <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Đăng ký</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
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
        <p className="text-xs text-slate-500">Tối thiểu 8 ký tự, có cả chữ và số.</p>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}

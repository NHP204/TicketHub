import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me } from '../api/auth.api.js';
import { updateMe } from '../api/users.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import FormField from '../components/FormField.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';

const submitClass =
  'rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white hover:bg-cobalt-hover disabled:opacity-60';

function ProfileForm({ profile }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile.fullName);

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  });

  const error = mutation.error ? parseApiError(mutation.error) : null;

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate({ fullName });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
      {error && !error.fieldErrors.fullName && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Đã lưu họ tên.
        </p>
      )}
      <p className="text-sm text-slate-600">
        Email: <span className="font-medium text-slate-900">{profile.email}</span>
      </p>
      <FormField
        id="fullName"
        label="Họ tên"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={error?.fieldErrors.fullName}
        required
      />
      <button type="submit" disabled={mutation.isPending} className={submitClass}>
        {mutation.isPending ? 'Đang lưu...' : 'Lưu họ tên'}
      </button>
    </form>
  );
}

const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordForm() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyPasswords);
  const [mismatch, setMismatch] = useState(false);

  // API đã thu hồi mọi refresh token, nên đăng xuất và mời đăng nhập lại.
  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: async () => {
      await logout();
      navigate('/login', {
        replace: true,
        state: { flash: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' },
      });
    },
  });

  const error = mutation.error ? parseApiError(mutation.error) : null;

  function handleChange(event) {
    setMismatch(false);
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMismatch(true);
      return;
    }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      <FormField
        id="currentPassword"
        label="Mật khẩu hiện tại"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={handleChange}
        error={error?.fieldErrors.currentPassword}
        required
      />
      <FormField
        id="newPassword"
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={handleChange}
        error={error?.fieldErrors.newPassword}
        required
      />
      <FormField
        id="confirmPassword"
        label="Nhập lại mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={handleChange}
        error={mismatch ? 'Mật khẩu nhập lại không khớp' : undefined}
        required
      />
      <button type="submit" disabled={mutation.isPending} className={submitClass}>
        {mutation.isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}

export default function AccountPage() {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });

  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Tài khoản</h1>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
        {meQuery.isPending ? (
          <Spinner />
        ) : meQuery.isError ? (
          <div className="mt-4">
            <ErrorMessage
              message={parseApiError(meQuery.error).message}
              onRetry={() => meQuery.refetch()}
            />
          </div>
        ) : (
          <ProfileForm profile={meQuery.data} />
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
        <PasswordForm />
      </div>
    </section>
  );
}

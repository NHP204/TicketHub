import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me } from '../api/auth.api.js';
import { updateMe } from '../api/users.api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import FormField from '../components/FormField.jsx';
import Spinner from '../components/Spinner.jsx';
import Button from '../components/ui/Button.jsx';
import Notice from '../components/ui/Notice.jsx';
import Panel from '../components/ui/Panel.jsx';
import { useAuth } from '../context/use-auth.js';
import { parseApiError } from '../utils/api-error.js';

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
      {error && !error.fieldErrors.fullName && <Notice tone="error">{error.message}</Notice>}
      {mutation.isSuccess && <Notice>Đã lưu họ tên.</Notice>}
      <p className="text-base text-muted">
        Email: <span className="font-medium text-ink">{profile.email}</span>
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
      <Button type="submit" loading={mutation.isPending} loadingLabel="Đang lưu...">
        Lưu họ tên
      </Button>
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
      {error && <Notice tone="error">{error.message}</Notice>}
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
      <Button type="submit" loading={mutation.isPending} loadingLabel="Đang đổi...">
        Đổi mật khẩu
      </Button>
    </form>
  );
}

export default function AccountPage() {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Tài khoản</h1>

      <Panel>
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
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
        <PasswordForm />
      </Panel>
    </section>
  );
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listUsers, updateUser } from '../../api/admin.api.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Notice from '../../components/ui/Notice.jsx';
import Select from '../../components/ui/Select.jsx';
import { useAuth } from '../../context/use-auth.js';
import { parseApiError } from '../../utils/api-error.js';
import { formatDateTime } from '../../utils/format.js';

const ROLES = ['USER', 'ORGANIZER', 'ADMIN'];

const roleLabels = {
  USER: 'Người dùng',
  ORGANIZER: 'Organizer',
  ADMIN: 'Admin',
};

// Mã lỗi API → câu giải thích cho admin; mã khác dùng message của API.
const friendlyMessages = {
  CANNOT_MODIFY_SELF: 'Bạn không thể tự đổi role hoặc khóa tài khoản của chính mình.',
};

function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function parseRole(value) {
  return ROLES.includes(value) ? value : '';
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const role = parseRole(searchParams.get('role'));
  const [notice, setNotice] = useState(null);
  // User đang chờ xác nhận khóa.
  const [lockTarget, setLockTarget] = useState(null);

  const query = useQuery({
    queryKey: ['admin-users', { page, role }],
    queryFn: () => listUsers({ page, role }),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: ({ user, fields }) => updateUser(user.id, fields),
    onSuccess: (updated, { fields }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      let text = `Đã đổi role của ${updated.fullName} thành ${roleLabels[updated.role]}.`;
      if (fields.isActive === false) text = `Đã khóa tài khoản ${updated.fullName}.`;
      if (fields.isActive === true) text = `Đã mở khóa tài khoản ${updated.fullName}.`;
      setNotice({ tone: 'success', text });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      setNotice({ tone: 'error', text: friendlyMessages[parsed.code] ?? parsed.message });
    },
    onSettled: () => setLockTarget(null),
  });

  function handleFilterChange(event) {
    setSearchParams(event.target.value ? { role: event.target.value } : {});
  }

  function handlePageChange(nextPage) {
    const next = {};
    if (role) next.role = role;
    if (nextPage > 1) next.page = String(nextPage);
    setSearchParams(next);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Quản lý user</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="role-filter" className="text-base font-medium">
            Lọc theo role
          </label>
          <Select id="role-filter" value={role} onChange={handleFilterChange}>
            <option value="">Tất cả</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {notice && (
        <Notice tone={notice.tone} className="mt-4">
          {notice.text}
        </Notice>
      )}

      <div className="mt-6">
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorMessage
            message={parseApiError(query.error).message}
            onRetry={() => query.refetch()}
          />
        ) : query.data.users.length === 0 ? (
          <EmptyState>Không có user nào với role này. Chọn "Tất cả" để xem mọi user.</EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-panel border border-line bg-surface">
              <table className="min-w-full divide-y divide-line text-base">
                <thead className="bg-paper text-left text-sm text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Họ tên
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Ngày tạo
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {query.data.users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const locked = isSelf || mutation.isPending;
                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{user.fullName}</td>
                        <td className="px-4 py-3 text-muted">{user.email}</td>
                        <td className="px-4 py-3">
                          <Select
                            aria-label={`Role của ${user.fullName}`}
                            value={user.role}
                            disabled={locked}
                            onChange={(e) =>
                              mutation.mutate({ user, fields: { role: e.target.value } })
                            }
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabels[r]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <Badge tone="success">Hoạt động</Badge>
                          ) : (
                            <Badge tone="neutral">Đã khóa</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {user.isActive ? (
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              onClick={() => setLockTarget(user)}
                              disabled={locked}
                            >
                              Khóa
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => mutation.mutate({ user, fields: { isActive: true } })}
                              disabled={locked}
                            >
                              Mở khóa
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={lockTarget !== null}
        title="Khóa tài khoản?"
        message={
          lockTarget
            ? `${lockTarget.fullName} (${lockTarget.email}) sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khóa.`
            : ''
        }
        confirmLabel="Khóa"
        tone="danger"
        isPending={mutation.isPending}
        onConfirm={() => mutation.mutate({ user: lockTarget, fields: { isActive: false } })}
        onCancel={() => setLockTarget(null)}
      />
    </section>
  );
}

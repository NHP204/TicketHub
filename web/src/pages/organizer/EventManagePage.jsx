import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getEvent, getSeatMap } from '../../api/events.api.js';
import {
  cancelEvent,
  createSection,
  deleteSection,
  publishEvent,
  updateEvent,
  uploadBanner,
} from '../../api/organizer.api.js';
import BannerUpload from '../../components/BannerUpload.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import SectionEditor from '../../components/SectionEditor.jsx';
import Spinner from '../../components/Spinner.jsx';
import { parseApiError } from '../../utils/api-error.js';
import { formatDateTime, formatVnd } from '../../utils/format.js';
import { EventForm } from './EventFormPage.jsx';

const eventStatusLabels = {
  DRAFT: { text: 'Nháp', className: 'bg-amber-100 text-amber-800' },
  PUBLISHED: { text: 'Đã công bố', className: 'bg-green-100 text-green-800' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-slate-200 text-slate-700' },
};

// Mã lỗi API → câu giải thích cho organizer; mã khác dùng message của API.
const friendlyMessages = {
  EVENT_HAS_NO_SECTIONS: 'Chưa thể publish: hãy thêm ít nhất một khu vực ghế cho sự kiện trước.',
  EVENT_CANCELLED: 'Sự kiện đã bị hủy nên không thể thay đổi nữa.',
  SECTION_HAS_BOOKINGS: 'Không xóa được khu vực này vì đã có ghế đang được giữ hoặc đã bán.',
  SECTION_NAME_TAKEN: 'Tên khu vực đã được dùng trong sự kiện này, hãy chọn tên khác.',
  NOT_EVENT_OWNER: 'Bạn không phải chủ sự kiện này.',
};

function toFriendlyError(err) {
  const parsed = parseApiError(err);
  return { ...parsed, message: friendlyMessages[parsed.code] ?? parsed.message };
}

// Form làm tròn đến phút, nên so thời gian theo phút để biết trường có đổi không.
function sameMinute(a, b) {
  const minute = (iso) => Math.floor(new Date(iso).getTime() / 60_000);
  return minute(a) === minute(b);
}

function changedFields(event, fields) {
  const changed = {};
  for (const key of ['title', 'description', 'venue']) {
    if (fields[key] !== event[key]) changed[key] = fields[key];
  }
  for (const key of ['startTime', 'endTime']) {
    if (!sameMinute(fields[key], event[key])) changed[key] = fields[key];
  }
  return changed;
}

// Seat map không có rowCount/seatsPerRow nên đếm từ rows.
function summarizeSection(section) {
  const seats = section.rows.flatMap((row) => row.seats);
  return {
    id: section.id,
    name: section.name,
    price: section.price,
    rowCount: section.rows.length,
    seatsPerRow: Math.max(0, ...section.rows.map((row) => row.seats.length)),
    booked: seats.filter((seat) => seat.status === 'BOOKED').length,
  };
}

const confirmTexts = {
  publish: {
    title: 'Publish sự kiện?',
    message: 'Sau khi publish, sự kiện hiện công khai và người dùng có thể đặt vé.',
    confirmLabel: 'Publish',
    tone: 'primary',
  },
  cancel: {
    title: 'Hủy sự kiện?',
    message: 'Sự kiện bị hủy sẽ không thể mở lại hoặc chỉnh sửa. Bạn chắc chắn chứ?',
    confirmLabel: 'Hủy sự kiện',
    tone: 'danger',
  },
  deleteSection: {
    title: 'Xóa khu vực?',
    confirmLabel: 'Xóa khu vực',
    tone: 'danger',
  },
};

export default function EventManagePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Giữ thông báo trong state rồi xóa khỏi history, để F5 không hiện lại.
  const [notice, setNotice] = useState(() =>
    location.state?.flash ? { tone: 'success', text: location.state.flash } : null,
  );
  // { kind: 'publish' | 'cancel' } hoặc { kind: 'deleteSection', section }.
  const [confirm, setConfirm] = useState(null);
  // Đổi key để xóa trắng SectionEditor / BannerUpload sau khi lưu thành công.
  const [sectionEditorKey, setSectionEditorKey] = useState(0);
  const [bannerKey, setBannerKey] = useState(0);

  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const eventQuery = useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id) });
  const seatMapQuery = useQuery({ queryKey: ['seat-map', id], queryFn: () => getSeatMap(id) });

  function refreshEvent(updated) {
    if (updated) queryClient.setQueryData(['event', id], updated);
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
    queryClient.invalidateQueries({ queryKey: ['organizer-stats'] });
  }

  function refreshSections() {
    queryClient.invalidateQueries({ queryKey: ['seat-map', id] });
    queryClient.invalidateQueries({ queryKey: ['organizer-stats'] });
  }

  function showSuccess(text) {
    setNotice({ tone: 'success', text });
  }

  function showError(err) {
    setNotice({ tone: 'error', text: toFriendlyError(err).message });
  }

  const updateMutation = useMutation({
    mutationFn: (fields) => updateEvent(id, fields),
    onSuccess: (updated) => {
      refreshEvent(updated);
      showSuccess('Đã lưu thông tin sự kiện.');
    },
  });

  const bannerMutation = useMutation({
    mutationFn: (file) => uploadBanner(id, file),
    onSuccess: (updated) => {
      refreshEvent(updated);
      setBannerKey((k) => k + 1);
      showSuccess('Đã cập nhật banner.');
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: (section) => createSection(id, section),
    onSuccess: (section) => {
      refreshSections();
      setSectionEditorKey((k) => k + 1);
      showSuccess(`Đã thêm khu vực "${section.name}".`);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishEvent(id),
    onSuccess: (updated) => {
      refreshEvent(updated);
      showSuccess('Sự kiện đã được publish.');
    },
    onError: showError,
    onSettled: () => setConfirm(null),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelEvent(id),
    onSuccess: (updated) => {
      refreshEvent(updated);
      showSuccess('Sự kiện đã bị hủy.');
    },
    onError: showError,
    onSettled: () => setConfirm(null),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (section) => deleteSection(section.id),
    onSuccess: (_, section) => {
      refreshSections();
      showSuccess(`Đã xóa khu vực "${section.name}".`);
    },
    onError: showError,
    onSettled: () => setConfirm(null),
  });

  if (eventQuery.isPending) return <Spinner />;
  if (eventQuery.isError) {
    return (
      <ErrorMessage
        message={parseApiError(eventQuery.error).message}
        onRetry={() => eventQuery.refetch()}
      />
    );
  }

  const event = eventQuery.data;
  const status = eventStatusLabels[event.status];
  const isCancelled = event.status === 'CANCELLED';
  const sections = (seatMapQuery.data?.sections ?? []).map(summarizeSection);

  function handleUpdate(fields) {
    const changed = changedFields(event, fields);
    if (Object.keys(changed).length === 0) {
      setNotice({ tone: 'success', text: 'Không có thay đổi nào để lưu.' });
      return;
    }
    updateMutation.mutate(changed);
  }

  function handleConfirm() {
    if (confirm.kind === 'publish') publishMutation.mutate();
    else if (confirm.kind === 'cancel') cancelMutation.mutate();
    else deleteSectionMutation.mutate(confirm.section);
  }

  const confirmText = confirm ? confirmTexts[confirm.kind] : null;
  const isConfirming =
    publishMutation.isPending || cancelMutation.isPending || deleteSectionMutation.isPending;

  return (
    <section className="space-y-6">
      <div>
        <Link to="/organizer" className="text-sm text-indigo-600 hover:underline">
          ← Quản lý sự kiện
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
              {status.text}
            </span>
          </div>
          <div className="flex gap-2">
            {event.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => setConfirm({ kind: 'publish' })}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Publish
              </button>
            )}
            {!isCancelled && (
              <button
                type="button"
                onClick={() => setConfirm({ kind: 'cancel' })}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Hủy sự kiện
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {formatDateTime(event.startTime)} – {formatDateTime(event.endTime)} · {event.venue}
        </p>
      </div>

      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-md px-3 py-2 text-sm ${
            notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Thông tin sự kiện</h2>
          <div className="mt-4">
            <EventForm
              key={event.updatedAt}
              initialEvent={event}
              onSubmit={handleUpdate}
              isSubmitting={updateMutation.isPending}
              apiError={updateMutation.error ? toFriendlyError(updateMutation.error) : null}
              submitLabel="Lưu thay đổi"
              disabled={isCancelled}
            />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Banner</h2>
          <div className="mt-4">
            <BannerUpload
              key={bannerKey}
              currentUrl={event.bannerUrl}
              onUpload={(file) => bannerMutation.mutate(file)}
              isUploading={bannerMutation.isPending}
              apiError={bannerMutation.error ? toFriendlyError(bannerMutation.error) : null}
              disabled={isCancelled}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Khu vực ghế</h2>
        <div className="mt-4">
          {seatMapQuery.isPending ? (
            <Spinner />
          ) : seatMapQuery.isError ? (
            <ErrorMessage
              message={parseApiError(seatMapQuery.error).message}
              onRetry={() => seatMapQuery.refetch()}
            />
          ) : sections.length === 0 ? (
            <EmptyState>Chưa có khu vực ghế nào.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-200">
              {sections.map((section) => (
                <li key={section.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{section.name}</p>
                    <p className="text-sm text-slate-600">
                      {formatVnd(section.price)} · {section.rowCount} hàng × {section.seatsPerRow}{' '}
                      ghế · đã bán {section.booked}
                    </p>
                  </div>
                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: 'deleteSection', section })}
                      aria-label={`Xóa khu vực ${section.name}`}
                      className="rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isCancelled && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="font-semibold">Thêm khu vực</h3>
            <div className="mt-4">
              <SectionEditor
                key={sectionEditorKey}
                onSubmit={(section) => createSectionMutation.mutate(section)}
                isSubmitting={createSectionMutation.isPending}
                apiError={
                  createSectionMutation.error ? toFriendlyError(createSectionMutation.error) : null
                }
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirmText?.title}
        message={
          confirm?.kind === 'deleteSection'
            ? `Khu vực "${confirm.section.name}" và toàn bộ ghế của nó sẽ bị xóa.`
            : confirmText?.message
        }
        confirmLabel={confirmText?.confirmLabel}
        cancelLabel="Quay lại"
        tone={confirmText?.tone}
        isPending={isConfirming}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}

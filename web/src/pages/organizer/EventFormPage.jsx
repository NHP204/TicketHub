import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createEvent } from '../../api/organizer.api.js';
import FormField from '../../components/FormField.jsx';
import { parseApiError } from '../../utils/api-error.js';

// ISO 8601 → giá trị của <input type="datetime-local"> theo giờ máy người dùng.
function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// Giá trị datetime-local (giờ địa phương) → ISO 8601 có offset (Z).
function toIso(localValue) {
  return new Date(localValue).toISOString();
}

// Giống createEventSchema và EventService.assertValidSchedule của API.
function validate({ title, description, venue, startTime, endTime }, now) {
  const errors = {};
  if (title.trim().length === 0) errors.title = 'Vui lòng nhập tên sự kiện';
  else if (title.trim().length > 200) errors.title = 'Tên tối đa 200 ký tự';
  if (description.trim().length === 0) errors.description = 'Vui lòng nhập mô tả';
  else if (description.trim().length > 5000) errors.description = 'Mô tả tối đa 5000 ký tự';
  if (venue.trim().length === 0) errors.venue = 'Vui lòng nhập địa điểm';
  else if (venue.trim().length > 200) errors.venue = 'Địa điểm tối đa 200 ký tự';

  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;
  if (!start) errors.startTime = 'Vui lòng chọn thời gian bắt đầu';
  else if (start <= now) errors.startTime = 'Thời gian bắt đầu phải ở tương lai';
  if (!end) errors.endTime = 'Vui lòng chọn thời gian kết thúc';
  else if (start && end <= start) errors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
  return errors;
}

// Form thông tin sự kiện, dùng cho cả tạo mới và sửa.
// onSubmit nhận { title, description, venue, startTime, endTime } với thời gian là ISO 8601.
export function EventForm({
  initialEvent = null,
  onSubmit,
  isSubmitting = false,
  apiError = null,
  submitLabel = 'Lưu',
  disabled = false,
}) {
  const [form, setForm] = useState(() => ({
    title: initialEvent?.title ?? '',
    description: initialEvent?.description ?? '',
    venue: initialEvent?.venue ?? '',
    startTime: toLocalInput(initialEvent?.startTime),
    endTime: toLocalInput(initialEvent?.endTime),
  }));
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form, new Date());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      venue: form.venue.trim(),
      startTime: toIso(form.startTime),
      endTime: toIso(form.endTime),
    });
  }

  const fieldError = (field) => errors[field] ?? apiError?.fieldErrors[field];
  const descriptionError = fieldError('description');

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {apiError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {apiError.message}
        </p>
      )}
      <fieldset disabled={disabled} className="space-y-4">
        <FormField
          id="title"
          label="Tên sự kiện"
          value={form.title}
          onChange={handleChange}
          error={fieldError('title')}
          required
        />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Mô tả
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={form.description}
            onChange={handleChange}
            aria-invalid={descriptionError ? 'true' : undefined}
            aria-describedby={descriptionError ? 'description-error' : undefined}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
              descriptionError ? 'border-red-400' : 'border-slate-300'
            }`}
            required
          />
          {descriptionError && (
            <p id="description-error" className="mt-1 text-sm text-red-600">
              {descriptionError}
            </p>
          )}
        </div>
        <FormField
          id="venue"
          label="Địa điểm"
          value={form.venue}
          onChange={handleChange}
          error={fieldError('venue')}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="startTime"
            label="Bắt đầu"
            type="datetime-local"
            value={form.startTime}
            onChange={handleChange}
            error={fieldError('startTime')}
            required
          />
          <FormField
            id="endTime"
            label="Kết thúc"
            type="datetime-local"
            value={form.endTime}
            onChange={handleChange}
            error={fieldError('endTime')}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Đang lưu...' : submitLabel}
        </button>
      </fieldset>
    </form>
  );
}

export default function EventFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      navigate(`/organizer/events/${event.id}`, {
        state: { flash: 'Đã tạo sự kiện. Hãy thêm khu vực ghế và banner trước khi publish.' },
      });
    },
  });

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  return (
    <section className="mx-auto max-w-2xl">
      <Link to="/organizer" className="text-sm text-indigo-600 hover:underline">
        ← Quản lý sự kiện
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Tạo sự kiện</h1>
      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <EventForm
          onSubmit={(fields) => mutation.mutate(fields)}
          isSubmitting={mutation.isPending}
          apiError={apiError}
          submitLabel="Tạo sự kiện"
        />
      </div>
    </section>
  );
}

import { useState } from 'react';
import FormField from './FormField.jsx';

// Giới hạn giống createSectionSchema của API.
const MAX_PRICE = 2_147_483_647;
const MAX_ROWS = 26;
const MAX_SEATS_PER_ROW = 50;

const emptyForm = { name: '', price: '', rowCount: '', seatsPerRow: '' };

// Chuỗi rỗng → NaN để không bị coi là 0.
function toInteger(value) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function isIntegerInRange(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max;
}

function validate({ name, price, rowCount, seatsPerRow }) {
  const errors = {};
  const trimmed = name.trim();
  if (trimmed.length === 0) errors.name = 'Vui lòng nhập tên khu vực';
  else if (trimmed.length > 50) errors.name = 'Tên tối đa 50 ký tự';
  if (!isIntegerInRange(price, 0, MAX_PRICE)) errors.price = 'Giá phải là số nguyên ≥ 0';
  if (!isIntegerInRange(rowCount, 1, MAX_ROWS)) {
    errors.rowCount = `Số hàng là số nguyên từ 1 đến ${MAX_ROWS}`;
  }
  if (!isIntegerInRange(seatsPerRow, 1, MAX_SEATS_PER_ROW)) {
    errors.seatsPerRow = `Số ghế mỗi hàng là số nguyên từ 1 đến ${MAX_SEATS_PER_ROW}`;
  }
  return errors;
}

// onSubmit nhận { name, price, rowCount, seatsPerRow } đã là số nguyên.
// Muốn xóa trắng form sau khi lưu thành công thì đổi `key` của component.
export default function SectionEditor({ onSubmit, isSubmitting = false, apiError = null }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const values = {
    name: form.name,
    price: toInteger(form.price),
    rowCount: toInteger(form.rowCount),
    seatsPerRow: toInteger(form.seatsPerRow),
  };
  const seatCount =
    isIntegerInRange(values.rowCount, 1, MAX_ROWS) &&
    isIntegerInRange(values.seatsPerRow, 1, MAX_SEATS_PER_ROW)
      ? values.rowCount * values.seatsPerRow
      : null;

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({ ...values, name: values.name.trim() });
  }

  const fieldError = (field) => errors[field] ?? apiError?.fieldErrors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {apiError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {apiError.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="name"
          label="Tên khu vực"
          value={form.name}
          onChange={handleChange}
          error={fieldError('name')}
          required
        />
        <FormField
          id="price"
          label="Giá vé (đồng)"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={form.price}
          onChange={handleChange}
          error={fieldError('price')}
          required
        />
        <FormField
          id="rowCount"
          label="Số hàng"
          type="number"
          inputMode="numeric"
          min="1"
          max={MAX_ROWS}
          step="1"
          value={form.rowCount}
          onChange={handleChange}
          error={fieldError('rowCount')}
          required
        />
        <FormField
          id="seatsPerRow"
          label="Số ghế mỗi hàng"
          type="number"
          inputMode="numeric"
          min="1"
          max={MAX_SEATS_PER_ROW}
          step="1"
          value={form.seatsPerRow}
          onChange={handleChange}
          error={fieldError('seatsPerRow')}
          required
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600" aria-live="polite">
          {seatCount !== null && `Sẽ tạo ${seatCount} ghế`}
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu khu vực'}
        </button>
      </div>
    </form>
  );
}

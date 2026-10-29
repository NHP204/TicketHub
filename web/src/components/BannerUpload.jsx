import { useEffect, useId, useState } from 'react';

// Giống BANNER_IMAGE_TYPES và BANNER_MAX_BYTES của API.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

function checkFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.';
  if (file.size > MAX_BYTES) return 'Ảnh vượt quá 2 MB, vui lòng chọn ảnh nhỏ hơn.';
  return null;
}

// onUpload(file) chỉ được gọi với file đã qua kiểm tra loại và cỡ.
export default function BannerUpload({
  currentUrl = null,
  onUpload,
  isUploading = false,
  apiError = null,
  disabled = false,
}) {
  const inputId = useId();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Thu hồi object URL cũ khi đổi ảnh hoặc unmount.
  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleChange(event) {
    const selected = event.target.files?.[0] ?? null;
    // Cho phép chọn lại đúng file đó sau khi sửa.
    event.target.value = '';
    if (!selected) return;
    const message = checkFile(selected);
    setError(message);
    setFile(message ? null : selected);
    setPreviewUrl(message ? null : URL.createObjectURL(selected));
  }

  function handleUpload() {
    if (file) onUpload(file);
  }

  const shownUrl = previewUrl ?? currentUrl;

  return (
    <div className="space-y-3">
      {shownUrl ? (
        <img
          src={shownUrl}
          alt={previewUrl ? 'Xem trước banner' : 'Banner hiện tại'}
          className="aspect-[3/1] w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex aspect-[3/1] w-full items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">
          Chưa có banner
        </div>
      )}

      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          Chọn ảnh banner
        </label>
        <input
          id={inputId}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          disabled={disabled || isUploading}
          className="mt-1 block w-full text-sm text-slate-600"
        />
        <p className="mt-1 text-xs text-slate-500">JPG, PNG hoặc WebP, tối đa 2 MB.</p>
      </div>

      {(error || apiError) && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? apiError.message}
        </p>
      )}

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={disabled || isUploading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isUploading ? 'Đang tải lên...' : 'Tải lên'}
        </button>
      )}
    </div>
  );
}

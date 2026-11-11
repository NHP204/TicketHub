import { useEffect, useId, useState } from 'react';
import Button from './ui/Button.jsx';
import Notice from './ui/Notice.jsx';

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
          className="aspect-[3/1] w-full rounded-control object-cover"
        />
      ) : (
        <div className="flex aspect-[3/1] w-full items-center justify-center rounded-control border-2 border-dashed border-line text-base text-muted">
          Chưa có banner
        </div>
      )}

      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          Chọn ảnh banner
        </label>
        <input
          id={inputId}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          disabled={disabled || isUploading}
          className="mt-1 block w-full text-base text-muted file:mr-3 file:min-h-11 file:rounded-control file:border file:border-line file:bg-surface file:px-4 file:font-medium file:text-ink"
        />
        <p className="mt-1 text-sm text-muted">JPG, PNG hoặc WebP, tối đa 2 MB.</p>
      </div>

      {(error || apiError) && <Notice tone="error">{error ?? apiError.message}</Notice>}

      {file && (
        <Button
          onClick={handleUpload}
          disabled={disabled}
          loading={isUploading}
          loadingLabel="Đang tải lên..."
        >
          Tải lên
        </Button>
      )}
    </div>
  );
}

// Chuyển lỗi axios thành { code, message, fieldErrors } để form hiển thị.
// fieldErrors lấy từ error.details của API: [{ path, message }].
export function parseApiError(err) {
  const apiError = err?.response?.data?.error;
  if (!apiError) {
    return {
      code: null,
      message: 'Không kết nối được máy chủ, vui lòng thử lại.',
      fieldErrors: {},
    };
  }

  const fieldErrors = {};
  for (const detail of apiError.details ?? []) {
    if (detail?.path && !fieldErrors[detail.path]) {
      fieldErrors[detail.path] = detail.message;
    }
  }
  return { code: apiError.code, message: apiError.message, fieldErrors };
}

// Chỉ nhận đường dẫn nội bộ ("/..."), chặn "//host" hay "https://..." để tránh open redirect.
export function safeNextPath(next) {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}

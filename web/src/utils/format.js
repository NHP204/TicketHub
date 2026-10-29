export function formatVnd(n) {
  return n.toLocaleString('vi-VN') + ' đ';
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

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

const eventDateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// "Chủ Nhật, 29/11/2026, 14:12" theo giờ Việt Nam. Tự ghép từ formatToParts vì thứ tự
// mặc định của vi-VN đặt giờ lên trước.
export function formatEventDateTime(iso) {
  const parts = Object.fromEntries(
    eventDateTimeFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.weekday}, ${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

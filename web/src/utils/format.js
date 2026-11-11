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

// Một bộ tách ngày giờ theo giờ Việt Nam dùng chung cho formatEventDateTime và getVnDateParts.
// Locale en-US chỉ để lấy số; tên thứ tự tra bảng nên không phụ thuộc cách ICU viết tiếng Việt.
const vnPartsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const LONG_WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const SHORT_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function splitVnDateTime(iso) {
  const parts = Object.fromEntries(
    vnPartsFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    // Thứ tính từ ngày dương lịch đã đổi sang giờ Việt Nam.
    weekdayIndex: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    time: `${parts.hour}:${parts.minute}`,
  };
}

const pad2 = (n) => String(n).padStart(2, '0');

// "Chủ Nhật, 29/11/2026, 14:12" theo giờ Việt Nam.
export function formatEventDateTime(iso) {
  const { year, month, day, weekdayIndex, time } = splitVnDateTime(iso);
  return `${LONG_WEEKDAYS[weekdayIndex]}, ${pad2(day)}/${pad2(month)}/${year}, ${time}`;
}

// Tách ngày giờ theo giờ Việt Nam cho lịch diễn:
// { year, month, day, weekdayShort: 'T7' | 'CN', time: '20:00' }.
export function getVnDateParts(iso) {
  const { year, month, day, weekdayIndex, time } = splitVnDateTime(iso);
  return { year, month, day, weekdayShort: SHORT_WEEKDAYS[weekdayIndex], time };
}

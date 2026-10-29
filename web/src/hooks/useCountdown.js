import { useEffect, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

// Đếm ngược tới expiresAt (chuỗi ISO từ API). Trả { remainingSeconds, display: 'MM:SS', isExpired }.
// Chưa có expiresAt → display '--:--', isExpired false.
export function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  const deadline = expiresAt ? Date.parse(expiresAt) : null;
  const isExpired = deadline !== null && now >= deadline;

  useEffect(() => {
    if (deadline === null || isExpired) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline, isExpired]);

  if (deadline === null) return { remainingSeconds: null, display: '--:--', isExpired: false };

  const remainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const display = `${pad(Math.floor(remainingSeconds / 60))}:${pad(remainingSeconds % 60)}`;
  return { remainingSeconds, display, isExpired };
}

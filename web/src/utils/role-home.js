import { safeNextPath } from './api-error.js';

const ALL_ROLES = ['USER', 'ORGANIZER', 'ADMIN'];

// Bảng quyền duy nhất của web: ProtectedRoute (bọc các route trong router.jsx) và
// LoginPage đều đọc bảng này. Mỗi dòng áp cho prefix và mọi đường dẫn con của nó.
// Đường dẫn không có trong bảng ("/", "/events/:id", ...) là công khai.
const ACCESS_RULES = [
  { prefix: '/checkout', roles: ['USER'] },
  { prefix: '/bookings', roles: ['USER'] },
  { prefix: '/tickets', roles: ['USER'] },
  { prefix: '/organizer', roles: ['ORGANIZER'] },
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/account', roles: ALL_ROLES },
  { prefix: '/login', guestOnly: true },
  { prefix: '/register', guestOnly: true },
];

const HOME_BY_ROLE = { USER: '/', ORGANIZER: '/organizer', ADMIN: '/admin' };

function ruleFor(path) {
  const pathname = path.split(/[?#]/)[0];
  return ACCESS_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
  );
}

export function roleHome(role) {
  return HOME_BY_ROLE[role] ?? '/';
}

// role là null/undefined với khách.
export function canVisit(role, path) {
  const rule = ruleFor(path);
  if (!rule) return true;
  if (rule.guestOnly) return !role;
  return rule.roles.includes(role);
}

export function isGuestOnly(path) {
  return Boolean(ruleFor(path)?.guestOnly);
}

// Trang sau khi đăng nhập: `next` nếu là đường dẫn nội bộ hợp với role, nếu không thì trang đích của role.
export function landingPath(role, next) {
  if (next && safeNextPath(next) === next && canVisit(role, next)) return next;
  return roleHome(role);
}

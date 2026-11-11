import { Link } from 'react-router-dom';
import Icon from './ui/Icon.jsx';

// Liên kết quay lại trang cha trong khu quản lý.
export default function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-base font-medium text-cobalt hover:underline"
    >
      <Icon name="chevron-left" size={18} />
      {children}
    </Link>
  );
}

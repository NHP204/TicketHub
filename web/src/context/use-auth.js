import { createContext, useContext } from 'react';

// Context nằm ở đây để auth-context.jsx chỉ export component (giữ Fast Refresh).
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
}

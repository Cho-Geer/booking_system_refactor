import { User } from '../../stores/auth/auth.store';

export const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
  CUSTOMER: '/booking',
};

export function getDefaultRoute(user: User | null): string {
  if (!user) return '/auth/login';
  return ROLE_ROUTES[user.role] || '/';
}

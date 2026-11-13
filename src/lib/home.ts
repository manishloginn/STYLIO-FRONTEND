import { Role } from '../types';

export function homeFor(role: Role | undefined): string {
  if (role === 'PLATFORM_ADMIN') return '/admin';
  if (role === 'SALON_OWNER' || role === 'SALON_STAFF') return '/salon';
  return '/';
}

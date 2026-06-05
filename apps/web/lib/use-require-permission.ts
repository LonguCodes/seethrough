'use client';

import { hasPermission, type Permission } from './permissions';
import { useAuth } from './use-auth';

/**
 * Returns { authorized, loading } after auth is loaded.
 * Used to gate pages that require a specific permission.
 */
export function useRequirePermission(permission: Permission) {
  const { user, loading } = useAuth();
  const authorized = hasPermission(user, permission);
  return { authorized, loading, user };
}
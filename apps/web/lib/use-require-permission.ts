'use client';

import { hasPermission, Permissions } from '@repo/core';
import { useAuth } from './use-auth';

/**
 * Returns { authorized, loading } after auth is loaded.
 * Used to gate pages that require a specific permission.
 */
export function useRequirePermission(permission: Permissions) {
  const { user, loading } = useAuth();
  console.log(user);
  const authorized = hasPermission(user, permission);
  return { authorized, loading, user };
}
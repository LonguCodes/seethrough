/**
 * Permission constants for the SeeThrough web frontend.
 * Must match the backend PERMISSIONS object exactly.
 */

export const PERMISSIONS = {
  CLUSTER_VIEW: 'cluster:view',
  ALERTS_VIEW: 'alerts:view',
  ALERTS_CONFIGURE: 'alerts:configure',
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  SSO_VIEW: 'sso:view',
  SSO_MANAGE: 'sso:manage',
  VOLUMES_VIEW: 'volumes:view',
  PODS_VIEW: 'pods:view',
  METRICS_VIEW: 'metrics:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every possible permission value. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Human-readable labels for each permission. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.CLUSTER_VIEW]: 'Cluster - View cluster info',
  [PERMISSIONS.ALERTS_VIEW]: 'Alerts - View current alerts',
  [PERMISSIONS.ALERTS_CONFIGURE]: 'Alerts - Configure triggers & rules',
  [PERMISSIONS.INTEGRATIONS_VIEW]: 'Integrations - View integrations',
  [PERMISSIONS.INTEGRATIONS_MANAGE]: 'Integrations - Manage integrations',
  [PERMISSIONS.USERS_VIEW]: 'Users - View user list',
  [PERMISSIONS.USERS_MANAGE]: 'Users - Manage users & roles',
  [PERMISSIONS.SSO_VIEW]: 'SSO - View SSO configurations',
  [PERMISSIONS.SSO_MANAGE]: 'SSO - Manage SSO configurations',
  [PERMISSIONS.VOLUMES_VIEW]: 'Volumes - View volumes',
  [PERMISSIONS.PODS_VIEW]: 'Pods - View pod details',
  [PERMISSIONS.METRICS_VIEW]: 'Metrics - View metrics charts',
};

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

/**
 * Returns true if the user has the given permission.
 */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Navigation item permission mapping.
 * Each nav item requires at least one of these permissions to be visible.
 */
export const NAV_PERMISSION_MAP: Record<string, Permission[]> = {
  '/': [PERMISSIONS.CLUSTER_VIEW],
  '/cluster': [PERMISSIONS.CLUSTER_VIEW, PERMISSIONS.PODS_VIEW],
  '/volumes': [PERMISSIONS.VOLUMES_VIEW],
  '/alerts': [PERMISSIONS.ALERTS_VIEW],
  '/users': [PERMISSIONS.USERS_VIEW],
  '/sso': [PERMISSIONS.SSO_VIEW],
};
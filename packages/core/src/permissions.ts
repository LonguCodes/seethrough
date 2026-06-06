/**
 * Permission constants for the SeeThrough web frontend.
 * Must match the backend PERMISSIONS object exactly.
 */

export enum Permissions {
  // Auth methods
  AUTH_METHODS_VIEW = "auth_methods:view",
  AUTH_METHODS_MANAGE = "auth_methods:manage",
  // MFA
  MFA_VIEW = "mfa:view",
  MFA_MANAGE = "mfa:manage",
  // Users
  USERS_VIEW = "users:view",
  USERS_MANAGE = "users:manage",
  // Roles
  ROLES_VIEW = "roles:view",
  ROLES_MANAGE = "roles:manage",
  // Cluster
  CLUSTER_VIEW = "cluster:view",
  // Alerts
  ALERTS_VIEW = "alerts:view",
  ALERTS_CONFIGURE = "alerts:configure",
  // Integrations
  INTEGRATIONS_VIEW = "integrations:view",
  INTEGRATIONS_MANAGE = "integrations:manage",
  // Metrics
  METRICS_VIEW = "metrics:view",
}


/** Every possible permission value. */
export const ALL_PERMISSIONS: Permissions[] = Object.values(Permissions);

/** Human-readable labels for each permission. */
export const PERMISSION_LABELS: Record<Permissions, string> = {
  [Permissions.AUTH_METHODS_VIEW]: "Auth Methods - View configured methods",
  [Permissions.AUTH_METHODS_MANAGE]: "Auth Methods - Manage authentication methods",
  [Permissions.MFA_VIEW]: "MFA - View MFA configuration",
  [Permissions.MFA_MANAGE]: "MFA - Manage MFA enrollment & settings",
  [Permissions.USERS_VIEW]: "Users - View user list",
  [Permissions.USERS_MANAGE]: "Users - Manage users & roles",
  [Permissions.ROLES_VIEW]: "Roles - View roles & permissions",
  [Permissions.ROLES_MANAGE]: "Roles - Manage roles & permissions",
  [Permissions.CLUSTER_VIEW]: "Cluster - View cluster info",
  [Permissions.ALERTS_VIEW]: "Alerts - View current alerts",
  [Permissions.ALERTS_CONFIGURE]: "Alerts - Configure triggers & rules",
  [Permissions.INTEGRATIONS_VIEW]: "Integrations - View integrations",
  [Permissions.INTEGRATIONS_MANAGE]: "Integrations - Manage integrations",
  [Permissions.METRICS_VIEW]: "Metrics - View metrics charts",
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
export function hasPermission(user: AuthUser | null, permission: Permissions): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Navigation item permission mapping.
 * Each nav item requires at least one of these permissions to be visible.
 */
export const NAV_PERMISSION_MAP: Record<string, Permissions[]> = {
  "/": [Permissions.CLUSTER_VIEW],
  "/cluster": [Permissions.CLUSTER_VIEW],
  "/alerts": [Permissions.ALERTS_VIEW],
  "/users": [Permissions.USERS_VIEW],
  "/auth-methods": [Permissions.AUTH_METHODS_VIEW],
  "/mfa": [Permissions.MFA_VIEW],
  "/roles": [Permissions.ROLES_VIEW],
};
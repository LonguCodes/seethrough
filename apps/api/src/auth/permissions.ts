/**
 * All permissions in the SeeThrough platform.
 */
export const PERMISSIONS = {
  // Auth methods
  AUTH_METHODS_VIEW: 'auth_methods:view',
  AUTH_METHODS_MANAGE: 'auth_methods:manage',
  // MFA
  MFA_VIEW: 'mfa:view',
  MFA_MANAGE: 'mfa:manage',
  // SSO (legacy, keep for backward compat)
  SSO_MANAGE: 'sso:manage',
  // Users
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  // Roles
  ROLES_VIEW: 'roles:view',
  ROLES_MANAGE: 'roles:manage',
  // Cluster
  CLUSTER_VIEW: 'cluster:view',
  // Alerts
  ALERTS_VIEW: 'alerts:view',
  ALERTS_CONFIGURE: 'alerts:configure',
  // Integrations
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  // Metrics
  METRICS_VIEW: 'metrics:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export interface RoleDefinition {
  name: string;
  superadmin: boolean;
  permissions: string[];
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: 'superadmin',
    superadmin: true,
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: 'viewer',
    superadmin: false,
    permissions: [
      PERMISSIONS.CLUSTER_VIEW,
      PERMISSIONS.ALERTS_VIEW,
      PERMISSIONS.METRICS_VIEW,
    ],
  },
];
/**
 * All permissions in the SeeThrough platform.
 *
 * Naming convention: `resource:action`
 * - `resource` is the domain entity (e.g., cluster, alerts, triggers, integrations, users, sso, volumes, pods)
 * - `action` is the operation (view, configure, manage)
 *
 * "manage" implies full CRUD access including deletion.
 */

export const PERMISSIONS = {
  /** View cluster-level info (nodes, capacity, health). */
  CLUSTER_VIEW: 'cluster:view',

  /** View active/current alerts. */
  ALERTS_VIEW: 'alerts:view',
  /** Configure alert triggers, including create/update/delete. */
  ALERTS_CONFIGURE: 'alerts:configure',

  /** View integration channel definitions. */
  INTEGRATIONS_VIEW: 'integrations:view',
  /** Manage integration channels (create/update/delete). */
  INTEGRATIONS_MANAGE: 'integrations:manage',

  /** View user list and details. */
  USERS_VIEW: 'users:view',
  /** Manage users (invite, change role, delete). */
  USERS_MANAGE: 'users:manage',

  /** View SSO configurations. */
  SSO_VIEW: 'sso:view',
  /** Manage SSO configurations (create/update/delete). */
  SSO_MANAGE: 'sso:manage',

  /** View volumes list and details. */
  VOLUMES_VIEW: 'volumes:view',

  /** View pod details. */
  PODS_VIEW: 'pods:view',

  /** View metrics charts. */
  METRICS_VIEW: 'metrics:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every possible permission value. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/**
 * Default role definitions.
 *
 * Roles are stored in the database, but these defaults are provisioned on first
 * run when the `roles` table is empty.
 */
export interface RoleDefinition {
  name: string;
  superadmin: boolean;
  permissions: Permission[];
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
      PERMISSIONS.VOLUMES_VIEW,
      PERMISSIONS.PODS_VIEW,
      PERMISSIONS.METRICS_VIEW,
    ],
  },
];
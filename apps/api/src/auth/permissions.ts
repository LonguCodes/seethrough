/**
 * All permissions in the SeeThrough platform.
 */

import { Permissions } from "@repo/core";

export const ALL_PERMISSIONS = Object.values(Permissions);

export interface RoleDefinition {
  name: string;
  superadmin: boolean;
  permissions: string[];
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: "superadmin",
    superadmin: true,
    permissions: [],
  },
  {
    name: "viewer",
    superadmin: false,
    permissions: [Permissions.CLUSTER_VIEW, Permissions.ALERTS_VIEW, Permissions.METRICS_VIEW],
  },
];

/**
 * Role-Based Access Control (RBAC)
 *
 * Implements enterprise-grade access control with:
 * - Role hierarchy
 * - Permission management
 * - Resource-level access
 * - Delegation
 * - Access policies
 */

import { v4 as uuidv4 } from "uuid";

export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "share"
  | "export"
  | "admin";

export type ResourceType =
  | "tile"
  | "inference"
  | "workspace"
  | "user"
  | "organization"
  | "report";

export interface Permission {
  id: string;
  role: string;
  resource: ResourceType;
  actions: Action[];
  constraints?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Role IDs this role inherits from
  level: number; // Hierarchy level: 0=admin, 100=guest
  createdAt: number;
  updatedAt: number;
}

export interface UserRole {
  userId: string;
  roleId: string;
  organizationId: string;
  assignedAt: number;
  assignedBy: string;
  expiresAt?: number;
}

export interface ResourceAccess {
  resourceId: string;
  resourceType: ResourceType;
  userId: string;
  roleId: string;
  accessLevel: "owner" | "editor" | "viewer" | "contributor";
  grantedAt: number;
  grantedBy: string;
  expiresAt?: number;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: "eq" | "ne" | "in" | "nin" | "contains" | "gt" | "lt";
    value: any;
  }>;
  effect: "allow" | "deny";
  priority: number;
}

/**
 * RBAC Engine
 */
export class RBACEngine {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map(); // userId -> UserRole[]
  private resourceAccess: Map<string, ResourceAccess[]> = new Map(); // resourceId -> ResourceAccess[]
  private accessPolicies: Map<string, AccessPolicy> = new Map();

  // Built-in roles
  private defaultRoles: Map<string, Role> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const adminRole: Role = {
      id: "role-admin",
      name: "Admin",
      description: "Full system access",
      permissions: [
        {
          id: "perm-admin-all",
          role: "role-admin",
          resource: "tile",
          actions: ["read", "create", "update", "delete", "share", "export", "admin"],
        },
        {
          id: "perm-admin-all-inference",
          role: "role-admin",
          resource: "inference",
          actions: ["read", "create", "update", "delete", "share", "export", "admin"],
        },
        {
          id: "perm-admin-all-user",
          role: "role-admin",
          resource: "user",
          actions: ["read", "create", "update", "delete", "admin"],
        },
        {
          id: "perm-admin-all-org",
          role: "role-admin",
          resource: "organization",
          actions: ["read", "update", "delete", "admin"],
        },
      ],
      level: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const editorRole: Role = {
      id: "role-editor",
      name: "Editor",
      description: "Can create and edit tiles",
      permissions: [
        {
          id: "perm-editor-tiles",
          role: "role-editor",
          resource: "tile",
          actions: ["read", "create", "update", "share"],
        },
        {
          id: "perm-editor-inference",
          role: "role-editor",
          resource: "inference",
          actions: ["read", "create", "update"],
        },
      ],
      level: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const viewerRole: Role = {
      id: "role-viewer",
      name: "Viewer",
      description: "Read-only access",
      permissions: [
        {
          id: "perm-viewer-tiles",
          role: "role-viewer",
          resource: "tile",
          actions: ["read"],
        },
        {
          id: "perm-viewer-inference",
          role: "role-viewer",
          resource: "inference",
          actions: ["read"],
        },
      ],
      level: 60,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const contributorRole: Role = {
      id: "role-contributor",
      name: "Contributor",
      description: "Can create and edit own tiles",
      permissions: [
        {
          id: "perm-contributor-tiles",
          role: "role-contributor",
          resource: "tile",
          actions: ["read", "create", "update"],
          constraints: { ownedBy: "${userId}" },
        },
      ],
      level: 45,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const guestRole: Role = {
      id: "role-guest",
      name: "Guest",
      description: "Limited access",
      permissions: [
        {
          id: "perm-guest-tiles",
          role: "role-guest",
          resource: "tile",
          actions: ["read"],
          constraints: { public: true },
        },
      ],
      level: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.defaultRoles.set("role-admin", adminRole);
    this.defaultRoles.set("role-editor", editorRole);
    this.defaultRoles.set("role-viewer", viewerRole);
    this.defaultRoles.set("role-contributor", contributorRole);
    this.defaultRoles.set("role-guest", guestRole);

    // Add to main roles map
    for (const [id, role] of this.defaultRoles) {
      this.roles.set(id, role);
    }
  }

  /**
   * Create custom role
   */
  createRole(
    name: string,
    description: string,
    permissions: Permission[],
    inherits?: string[]
  ): Role {
    const roleId = `role-${uuidv4()}`;

    const role: Role = {
      id: roleId,
      name,
      description,
      permissions,
      inherits,
      level: 50, // Default to middle level
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.roles.set(roleId, role);
    return role;
  }

  /**
   * Assign role to user
   */
  assignRoleToUser(
    userId: string,
    roleId: string,
    organizationId: string,
    assignedBy: string,
    expiresAt?: number
  ): UserRole {
    const userRole: UserRole = {
      userId,
      roleId,
      organizationId,
      assignedAt: Date.now(),
      assignedBy,
      expiresAt,
    };

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    this.userRoles.get(userId)!.push(userRole);
    return userRole;
  }

  /**
   * Remove role from user
   */
  removeRoleFromUser(userId: string, roleId: string, organizationId: string): boolean {
    const roles = this.userRoles.get(userId);
    if (!roles) return false;

    const index = roles.findIndex(
      (r) => r.roleId === roleId && r.organizationId === organizationId
    );

    if (index !== -1) {
      roles.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Get user roles in organization
   */
  getUserRoles(userId: string, organizationId?: string): Role[] {
    const userRoles = this.userRoles.get(userId) || [];

    const filtered = organizationId
      ? userRoles.filter((ur) => ur.organizationId === organizationId)
      : userRoles;

    return filtered
      .map((ur) => {
        const role = this.roles.get(ur.roleId);

        // Check expiration
        if (ur.expiresAt && ur.expiresAt < Date.now()) {
          return null;
        }

        return role;
      })
      .filter((r) => r !== null) as Role[];
  }

  /**
   * Grant resource access to user
   */
  grantResourceAccess(
    resourceId: string,
    resourceType: ResourceType,
    userId: string,
    roleId: string,
    accessLevel: "owner" | "editor" | "viewer" | "contributor",
    grantedBy: string,
    expiresAt?: number
  ): ResourceAccess {
    const access: ResourceAccess = {
      resourceId,
      resourceType,
      userId,
      roleId,
      accessLevel,
      grantedAt: Date.now(),
      grantedBy,
      expiresAt,
    };

    if (!this.resourceAccess.has(resourceId)) {
      this.resourceAccess.set(resourceId, []);
    }

    this.resourceAccess.get(resourceId)!.push(access);
    return access;
  }

  /**
   * Revoke resource access
   */
  revokeResourceAccess(resourceId: string, userId: string): boolean {
    const accesses = this.resourceAccess.get(resourceId);
    if (!accesses) return false;

    const index = accesses.findIndex((a) => a.userId === userId);

    if (index !== -1) {
      accesses.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Check if user has permission
   */
  checkPermission(
    userId: string,
    resource: ResourceType,
    action: Action,
    organizationId: string,
    context?: Record<string, any>
  ): boolean {
    const userRoles = this.getUserRoles(userId, organizationId);

    for (const role of userRoles) {
      for (const permission of role.permissions) {
        if (
          permission.resource === resource &&
          permission.actions.includes(action)
        ) {
          // Check constraints
          if (permission.constraints && context) {
            if (!this.evaluateConstraints(permission.constraints, context)) {
              continue;
            }
          }

          return true;
        }
      }

      // Check inherited roles
      if (role.inherits) {
        for (const inheritedRoleId of role.inherits) {
          const inheritedRole = this.roles.get(inheritedRoleId);
          if (inheritedRole) {
            for (const permission of inheritedRole.permissions) {
              if (
                permission.resource === resource &&
                permission.actions.includes(action)
              ) {
                return true;
              }
            }
          }
        }
      }
    }

    // Check access policies
    const policies = Array.from(this.accessPolicies.values())
      .filter((p) => p.effect === "deny")
      .sort((a, b) => b.priority - a.priority);

    for (const policy of policies) {
      if (this.evaluatePolicy(policy, context || {})) {
        return false;
      }
    }

    return false;
  }

  /**
   * Get user's resource access level
   */
  getResourceAccessLevel(
    userId: string,
    resourceId: string
  ): "owner" | "editor" | "viewer" | "contributor" | null {
    const accesses = this.resourceAccess.get(resourceId) || [];

    for (const access of accesses) {
      if (access.userId === userId) {
        // Check expiration
        if (access.expiresAt && access.expiresAt < Date.now()) {
          continue;
        }

        return access.accessLevel;
      }
    }

    return null;
  }

  /**
   * Evaluate constraints
   */
  private evaluateConstraints(
    constraints: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(constraints)) {
      if (key === "ownedBy") {
        // Template evaluation
        const userId = value.replace("${userId}", context.userId || "");
        if (context.ownerId !== userId) {
          return false;
        }
      } else if (key === "public") {
        if (context.public !== value) {
          return false;
        }
      } else {
        if (context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate policy
   */
  private evaluatePolicy(policy: AccessPolicy, context: Record<string, any>): boolean {
    for (const condition of policy.conditions) {
      const value = context[condition.field];

      switch (condition.operator) {
        case "eq":
          if (value !== condition.value) return false;
          break;
        case "ne":
          if (value === condition.value) return false;
          break;
        case "in":
          if (!condition.value.includes(value)) return false;
          break;
        case "nin":
          if (condition.value.includes(value)) return false;
          break;
        case "contains":
          if (!String(value).includes(condition.value)) return false;
          break;
        case "gt":
          if (value <= condition.value) return false;
          break;
        case "lt":
          if (value >= condition.value) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Create access policy
   */
  createAccessPolicy(
    name: string,
    description: string,
    conditions: AccessPolicy["conditions"],
    effect: "allow" | "deny",
    priority: number = 0
  ): AccessPolicy {
    const policyId = `policy-${uuidv4()}`;

    const policy: AccessPolicy = {
      id: policyId,
      name,
      description,
      conditions,
      effect,
      priority,
    };

    this.accessPolicies.set(policyId, policy);
    return policy;
  }

  /**
   * Get all users with specific role in organization
   */
  getUsersWithRole(roleId: string, organizationId: string): string[] {
    const userIds: string[] = [];

    for (const [userId, roles] of this.userRoles) {
      if (
        roles.some(
          (r) => r.roleId === roleId && r.organizationId === organizationId
        )
      ) {
        userIds.push(userId);
      }
    }

    return userIds;
  }

  /**
   * Delegate permission
   */
  delegatePermission(
    fromUserId: string,
    toUserId: string,
    resourceId: string,
    resourceType: ResourceType,
    accessLevel: "editor" | "viewer" | "contributor",
    expiresAt?: number
  ): ResourceAccess | null {
    // Check if fromUser has ownership
    const fromAccess = this.resourceAccess
      .get(resourceId)
      ?.find((a) => a.userId === fromUserId && a.accessLevel === "owner");

    if (!fromAccess) {
      return null;
    }

    return this.grantResourceAccess(
      resourceId,
      resourceType,
      toUserId,
      fromAccess.roleId,
      accessLevel,
      fromUserId,
      expiresAt
    );
  }

  /**
   * Get RBAC statistics
   */
  getStats() {
    return {
      totalRoles: this.roles.size,
      totalUsers: this.userRoles.size,
      totalResourceAccess: Array.from(this.resourceAccess.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
      totalPolicies: this.accessPolicies.size,
    };
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * List all roles
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }
}

/**
 * Singleton instance
 */
let rbacEngine: RBACEngine | null = null;

export function getRBACEngine(): RBACEngine {
  if (!rbacEngine) {
    rbacEngine = new RBACEngine();
  }
  return rbacEngine;
}

export function resetRBACEngine(): void {
  rbacEngine = null;
}

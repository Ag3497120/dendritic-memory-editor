/**
 * Organization & Team Management
 *
 * Enterprise organization structure:
 * - Organization management
 * - Team management
 * - Member management
 * - Workspace management
 * - Billing & licensing
 */

import { v4 as uuidv4 } from "uuid";

export interface Organization {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  timezone?: string;
  status: "active" | "suspended" | "deleted";
  plan: "free" | "starter" | "professional" | "enterprise";
  maxUsers: number;
  maxStorage: number;
  features: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  icon?: string;
  memberCount: number;
  status: "active" | "archived";
  visibility: "public" | "private";
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  role: "owner" | "admin" | "member" | "guest";
  joinedAt: number;
  joinedBy: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  icon?: string;
  teams: string[]; // Team IDs
  isDefault: boolean;
  privacy: "public" | "private";
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface OrganizationSettings {
  organizationId: string;
  ssoEnabled: boolean;
  ssoProvider?: "okta" | "azure-ad" | "google" | "custom";
  twoFactorRequired: boolean;
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays?: number;
  };
  dataRetention?: number; // Days
  auditLogging: boolean;
  allowPublicSharing: boolean;
  defaultRole: string;
}

/**
 * Organization Management Engine
 */
export class OrganizationManagementEngine {
  private organizations: Map<string, Organization> = new Map();
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, TeamMember[]> = new Map(); // teamId -> members
  private workspaces: Map<string, Workspace> = new Map();
  private organizationSettings: Map<string, OrganizationSettings> = new Map();
  private userOrganizations: Map<string, string[]> = new Map(); // userId -> org IDs

  /**
   * Create organization
   */
  createOrganization(
    name: string,
    createdBy: string,
    options?: {
      description?: string;
      logo?: string;
      website?: string;
      industry?: string;
      country?: string;
      timezone?: string;
    }
  ): Organization {
    const orgId = `org-${uuidv4()}`;

    const org: Organization = {
      id: orgId,
      name,
      description: options?.description || "",
      logo: options?.logo,
      website: options?.website,
      industry: options?.industry,
      size: "small",
      country: options?.country,
      timezone: options?.timezone || "UTC",
      status: "active",
      plan: "free",
      maxUsers: 5,
      maxStorage: 1024 * 1024 * 1024, // 1GB
      features: ["basic_search", "collaboration"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy,
    };

    this.organizations.set(orgId, org);

    // Initialize settings
    const settings: OrganizationSettings = {
      organizationId: orgId,
      ssoEnabled: false,
      twoFactorRequired: false,
      auditLogging: true,
      allowPublicSharing: true,
      defaultRole: "role-viewer",
    };

    this.organizationSettings.set(orgId, settings);

    // Track user's organizations
    if (!this.userOrganizations.has(createdBy)) {
      this.userOrganizations.set(createdBy, []);
    }
    this.userOrganizations.get(createdBy)!.push(orgId);

    return org;
  }

  /**
   * Get organization
   */
  getOrganization(orgId: string): Organization | undefined {
    return this.organizations.get(orgId);
  }

  /**
   * Update organization
   */
  updateOrganization(orgId: string, updates: Partial<Organization>): Organization | undefined {
    const org = this.organizations.get(orgId);
    if (!org) return undefined;

    const updated: Organization = {
      ...org,
      ...updates,
      updatedAt: Date.now(),
    };

    this.organizations.set(orgId, updated);
    return updated;
  }

  /**
   * Create team
   */
  createTeam(
    organizationId: string,
    name: string,
    createdBy: string,
    options?: {
      description?: string;
      icon?: string;
      visibility?: "public" | "private";
    }
  ): Team {
    const teamId = `team-${uuidv4()}`;

    const team: Team = {
      id: teamId,
      organizationId,
      name,
      description: options?.description || "",
      icon: options?.icon,
      memberCount: 1,
      status: "active",
      visibility: options?.visibility || "private",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy,
    };

    this.teams.set(teamId, team);

    // Add creator as owner
    this.addTeamMember(teamId, createdBy, "", "owner", createdBy);

    return team;
  }

  /**
   * Add member to team
   */
  addTeamMember(
    teamId: string,
    userId: string,
    userName: string,
    role: "owner" | "admin" | "member" | "guest",
    addedBy: string
  ): TeamMember {
    const memberId = uuidv4();

    const member: TeamMember = {
      id: memberId,
      teamId,
      userId,
      userName,
      role,
      joinedAt: Date.now(),
      joinedBy: addedBy,
    };

    if (!this.teamMembers.has(teamId)) {
      this.teamMembers.set(teamId, []);
    }

    this.teamMembers.get(teamId)!.push(member);

    // Update team member count
    const team = this.teams.get(teamId);
    if (team) {
      team.memberCount = this.teamMembers.get(teamId)!.length;
      team.updatedAt = Date.now();
    }

    return member;
  }

  /**
   * Remove member from team
   */
  removeTeamMember(teamId: string, userId: string): boolean {
    const members = this.teamMembers.get(teamId);
    if (!members) return false;

    const index = members.findIndex((m) => m.userId === userId);

    if (index !== -1) {
      members.splice(index, 1);

      // Update team member count
      const team = this.teams.get(teamId);
      if (team) {
        team.memberCount = members.length;
        team.updatedAt = Date.now();
      }

      return true;
    }

    return false;
  }

  /**
   * Get team members
   */
  getTeamMembers(teamId: string): TeamMember[] {
    return this.teamMembers.get(teamId) || [];
  }

  /**
   * Get teams in organization
   */
  getOrganizationTeams(organizationId: string): Team[] {
    return Array.from(this.teams.values()).filter(
      (t) => t.organizationId === organizationId && t.status === "active"
    );
  }

  /**
   * Get user's teams in organization
   */
  getUserTeams(userId: string, organizationId: string): Team[] {
    const userTeamIds = new Set<string>();

    for (const members of this.teamMembers.values()) {
      for (const member of members) {
        if (member.userId === userId) {
          userTeamIds.add(member.teamId);
        }
      }
    }

    return Array.from(userTeamIds)
      .map((id) => this.teams.get(id))
      .filter((t) => t && t.organizationId === organizationId) as Team[];
  }

  /**
   * Create workspace
   */
  createWorkspace(
    organizationId: string,
    name: string,
    createdBy: string,
    options?: {
      description?: string;
      icon?: string;
      teams?: string[];
      privacy?: "public" | "private";
    }
  ): Workspace {
    const workspaceId = `workspace-${uuidv4()}`;

    const workspace: Workspace = {
      id: workspaceId,
      organizationId,
      name,
      description: options?.description || "",
      icon: options?.icon,
      teams: options?.teams || [],
      isDefault: false,
      privacy: options?.privacy || "private",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy,
    };

    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  /**
   * Get workspaces in organization
   */
  getOrganizationWorkspaces(organizationId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter(
      (w) => w.organizationId === organizationId
    );
  }

  /**
   * Update organization plan
   */
  updatePlan(
    organizationId: string,
    plan: "free" | "starter" | "professional" | "enterprise"
  ): Organization | undefined {
    const org = this.organizations.get(organizationId);
    if (!org) return undefined;

    // Update based on plan
    const planLimits: Record<string, { maxUsers: number; maxStorage: number; features: string[] }> = {
      free: {
        maxUsers: 5,
        maxStorage: 1024 * 1024 * 1024, // 1GB
        features: ["basic_search", "collaboration"],
      },
      starter: {
        maxUsers: 25,
        maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
        features: [
          "basic_search",
          "collaboration",
          "advanced_search",
          "semantic_search",
        ],
      },
      professional: {
        maxUsers: 100,
        maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
        features: [
          "basic_search",
          "collaboration",
          "advanced_search",
          "semantic_search",
          "rbac",
          "audit_logging",
          "sso",
        ],
      },
      enterprise: {
        maxUsers: 1000,
        maxStorage: 1024 * 1024 * 1024 * 1024, // 1TB
        features: [
          "all",
          "custom_branding",
          "api_access",
          "dedicated_support",
        ],
      },
    };

    const limits = planLimits[plan];
    org.plan = plan;
    org.maxUsers = limits.maxUsers;
    org.maxStorage = limits.maxStorage;
    org.features = limits.features;
    org.updatedAt = Date.now();

    this.organizations.set(organizationId, org);
    return org;
  }

  /**
   * Get organization settings
   */
  getOrganizationSettings(organizationId: string): OrganizationSettings | undefined {
    return this.organizationSettings.get(organizationId);
  }

  /**
   * Update organization settings
   */
  updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): OrganizationSettings | undefined {
    const existing = this.organizationSettings.get(organizationId);
    if (!existing) return undefined;

    const updated: OrganizationSettings = {
      ...existing,
      ...settings,
    };

    this.organizationSettings.set(organizationId, updated);
    return updated;
  }

  /**
   * Get user's organizations
   */
  getUserOrganizations(userId: string): Organization[] {
    const orgIds = this.userOrganizations.get(userId) || [];
    return orgIds
      .map((id) => this.organizations.get(id))
      .filter((o) => o !== undefined) as Organization[];
  }

  /**
   * Get organization members count
   */
  getOrganizationMemberCount(organizationId: string): number {
    const teams = this.getOrganizationTeams(organizationId);
    const userIds = new Set<string>();

    for (const team of teams) {
      const members = this.teamMembers.get(team.id) || [];
      for (const member of members) {
        userIds.add(member.userId);
      }
    }

    return userIds.size;
  }

  /**
   * Get organization statistics
   */
  getOrganizationStats(organizationId: string) {
    const org = this.organizations.get(organizationId);
    if (!org) return null;

    const teams = this.getOrganizationTeams(organizationId);
    const workspaces = this.getOrganizationWorkspaces(organizationId);
    const memberCount = this.getOrganizationMemberCount(organizationId);

    return {
      organizationId,
      plan: org.plan,
      memberCount,
      maxUsers: org.maxUsers,
      teamCount: teams.length,
      workspaceCount: workspaces.length,
      storageUsed: 0, // Would track from actual data
      maxStorage: org.maxStorage,
      features: org.features,
    };
  }

  /**
   * Archive team
   */
  archiveTeam(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (team) {
      team.status = "archived";
      team.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Delete organization (soft delete)
   */
  deleteOrganization(organizationId: string): boolean {
    const org = this.organizations.get(organizationId);
    if (org) {
      org.status = "deleted";
      org.updatedAt = Date.now();
      return true;
    }
    return false;
  }
}

/**
 * Singleton instance
 */
let orgManagementEngine: OrganizationManagementEngine | null = null;

export function getOrganizationManagementEngine(): OrganizationManagementEngine {
  if (!orgManagementEngine) {
    orgManagementEngine = new OrganizationManagementEngine();
  }
  return orgManagementEngine;
}

export function resetOrganizationManagementEngine(): void {
  orgManagementEngine = null;
}

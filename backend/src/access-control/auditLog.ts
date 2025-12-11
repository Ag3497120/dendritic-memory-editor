/**
 * Audit Logging System
 *
 * Comprehensive audit trail for compliance:
 * - User action tracking
 * - Change history
 * - Access logs
 * - Security events
 * - Compliance reporting
 */

import { v4 as uuidv4 } from "uuid";

export type ActionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "access"
  | "share"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "permission_grant"
  | "permission_revoke"
  | "role_assign"
  | "role_remove"
  | "admin_action";

export type ResourceType =
  | "tile"
  | "inference"
  | "user"
  | "organization"
  | "workspace"
  | "report";

export type Severity = "info" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: ActionType;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  result: "success" | "failure";
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  organizationId: string;
  severity: Severity;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  events: AuditEvent[];
  totalCount: number;
  filters?: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  organizationId: string;
  startDate: number;
  endDate: number;
  totalEvents: number;
  eventsByAction: Record<ActionType, number>;
  eventsByResource: Record<ResourceType, number>;
  failedActions: number;
  criticalEvents: number;
  uniqueUsers: number;
  generatedAt: number;
}

/**
 * Audit Log Engine
 */
export class AuditLogEngine {
  private events: AuditEvent[] = [];
  private maxEvents: number = 100000;
  private retentionDays: number = 90;

  /**
   * Log an event
   */
  logEvent(
    userId: string,
    userName: string,
    action: ActionType,
    resourceType: ResourceType,
    resourceId: string,
    organizationId: string,
    options: {
      resourceName?: string;
      changes?: AuditEvent["changes"];
      result?: "success" | "failure";
      errorMessage?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: Severity;
      metadata?: Record<string, any>;
    } = {}
  ): AuditEvent {
    const event: AuditEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      userId,
      userName,
      action,
      resourceType,
      resourceId,
      resourceName: options.resourceName,
      changes: options.changes,
      result: options.result || "success",
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      organizationId,
      severity: options.severity || "info",
      metadata: options.metadata,
    };

    this.events.push(event);

    // Maintain max size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return event;
  }

  /**
   * Query audit logs
   */
  queryLogs(
    organizationId: string,
    filters: {
      userId?: string;
      action?: ActionType;
      resourceType?: ResourceType;
      resourceId?: string;
      startDate?: number;
      endDate?: number;
      result?: "success" | "failure";
      severity?: Severity;
      limit?: number;
      offset?: number;
    } = {}
  ): AuditLog {
    let filtered = this.events.filter(
      (e) => e.organizationId === organizationId
    );

    // Apply filters
    if (filters.userId) {
      filtered = filtered.filter((e) => e.userId === filters.userId);
    }

    if (filters.action) {
      filtered = filtered.filter((e) => e.action === filters.action);
    }

    if (filters.resourceType) {
      filtered = filtered.filter((e) => e.resourceType === filters.resourceType);
    }

    if (filters.resourceId) {
      filtered = filtered.filter((e) => e.resourceId === filters.resourceId);
    }

    if (filters.startDate) {
      filtered = filtered.filter((e) => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter((e) => e.timestamp <= filters.endDate!);
    }

    if (filters.result) {
      filtered = filtered.filter((e) => e.result === filters.result);
    }

    if (filters.severity) {
      filtered = filtered.filter((e) => e.severity === filters.severity);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const totalCount = filtered.length;

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      events: paginated,
      totalCount,
      filters,
    };
  }

  /**
   * Get user action history
   */
  getUserActionHistory(
    userId: string,
    organizationId: string,
    limit: number = 100
  ): AuditEvent[] {
    return this.events
      .filter((e) => e.userId === userId && e.organizationId === organizationId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get resource change history
   */
  getResourceHistory(
    resourceId: string,
    organizationId: string
  ): AuditEvent[] {
    return this.events
      .filter(
        (e) =>
          e.resourceId === resourceId &&
          e.organizationId === organizationId &&
          (e.action === "create" ||
            e.action === "update" ||
            e.action === "delete")
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get failed actions
   */
  getFailedActions(
    organizationId: string,
    limit: number = 100
  ): AuditEvent[] {
    return this.events
      .filter((e) => e.organizationId === organizationId && e.result === "failure")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(
    organizationId: string,
    options: {
      failedLoginThreshold?: number;
      bulkDeleteThreshold?: number;
      unusualAccessTime?: boolean;
    } = {}
  ): AuditEvent[] {
    const failedLoginThreshold = options.failedLoginThreshold || 5;
    const bulkDeleteThreshold = options.bulkDeleteThreshold || 10;

    const suspicious: AuditEvent[] = [];

    // Track failed logins per user
    const failedLogins = new Map<string, number>();

    for (const event of this.events) {
      if (event.organizationId !== organizationId) continue;

      // Detect multiple failed logins
      if (event.action === "login" && event.result === "failure") {
        const count = (failedLogins.get(event.userId) || 0) + 1;
        failedLogins.set(event.userId, count);

        if (count >= failedLoginThreshold) {
          suspicious.push(event);
        }
      }

      // Detect bulk deletes
      if (event.action === "delete") {
        const recentDeletes = this.events.filter(
          (e) =>
            e.userId === event.userId &&
            e.action === "delete" &&
            e.timestamp >= Date.now() - 60000 // Last minute
        );

        if (recentDeletes.length >= bulkDeleteThreshold) {
          suspicious.push(event);
        }
      }

      // Detect unusual access time (e.g., 3 AM)
      if (options.unusualAccessTime && event.action === "access") {
        const hour = new Date(event.timestamp).getHours();

        if (hour < 6 || hour > 22) {
          suspicious.push(event);
        }
      }
    }

    return suspicious;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(
    organizationId: string,
    startDate: number,
    endDate: number
  ): ComplianceReport {
    const filtered = this.events.filter(
      (e) =>
        e.organizationId === organizationId &&
        e.timestamp >= startDate &&
        e.timestamp <= endDate
    );

    // Count by action type
    const eventsByAction: Record<ActionType, number> = {} as any;
    for (const event of filtered) {
      eventsByAction[event.action] =
        (eventsByAction[event.action] || 0) + 1;
    }

    // Count by resource type
    const eventsByResource: Record<ResourceType, number> = {} as any;
    for (const event of filtered) {
      eventsByResource[event.resourceType] =
        (eventsByResource[event.resourceType] || 0) + 1;
    }

    // Count failures and critical
    const failedActions = filtered.filter((e) => e.result === "failure").length;
    const criticalEvents = filtered.filter((e) => e.severity === "critical")
      .length;

    // Count unique users
    const uniqueUsers = new Set(filtered.map((e) => e.userId)).size;

    return {
      id: uuidv4(),
      organizationId,
      startDate,
      endDate,
      totalEvents: filtered.length,
      eventsByAction,
      eventsByResource,
      failedActions,
      criticalEvents,
      uniqueUsers,
      generatedAt: Date.now(),
    };
  }

  /**
   * Export audit logs
   */
  exportLogs(
    organizationId: string,
    format: "json" | "csv" = "json",
    filters?: AuditLog["filters"]
  ): string {
    const logs = this.queryLogs(organizationId, filters);

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    } else if (format === "csv") {
      // Convert to CSV
      const headers = [
        "ID",
        "Timestamp",
        "User",
        "Action",
        "Resource Type",
        "Resource ID",
        "Result",
        "Severity",
      ];

      const rows = logs.events.map((e) => [
        e.id,
        new Date(e.timestamp).toISOString(),
        e.userName,
        e.action,
        e.resourceType,
        e.resourceId,
        e.result,
        e.severity,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
      ].join("\n");

      return csvContent;
    }

    return "";
  }

  /**
   * Clean up old events
   */
  cleanupOldEvents(retentionDays: number = this.retentionDays): number {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialLength = this.events.length;

    this.events = this.events.filter((e) => e.timestamp >= cutoffTime);

    return initialLength - this.events.length;
  }

  /**
   * Set retention policy
   */
  setRetentionPolicy(days: number): void {
    this.retentionDays = days;
  }

  /**
   * Get statistics
   */
  getStats(organizationId?: string) {
    let filtered = this.events;

    if (organizationId) {
      filtered = filtered.filter((e) => e.organizationId === organizationId);
    }

    const eventsByAction: Record<string, number> = {};
    for (const event of filtered) {
      eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
    }

    return {
      totalEvents: filtered.length,
      eventsByAction,
      failureRate: filtered.filter((e) => e.result === "failure").length / Math.max(1, filtered.length),
      uniqueUsers: new Set(filtered.map((e) => e.userId)).size,
      dateRange: {
        start: filtered.length > 0 ? Math.min(...filtered.map((e) => e.timestamp)) : null,
        end: filtered.length > 0 ? Math.max(...filtered.map((e) => e.timestamp)) : null,
      },
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * Singleton instance
 */
let auditLogEngine: AuditLogEngine | null = null;

export function getAuditLogEngine(): AuditLogEngine {
  if (!auditLogEngine) {
    auditLogEngine = new AuditLogEngine();
  }
  return auditLogEngine;
}

export function resetAuditLogEngine(): void {
  auditLogEngine = null;
}

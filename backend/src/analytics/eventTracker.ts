/**
 * Event Tracker - User Activity Tracking System
 *
 * Tracks all user actions for analytics:
 * - Search queries and results
 * - Inference executions
 * - Tile operations (create, update, delete)
 * - API performance
 * - Error events
 */

import { v4 as uuidv4 } from "uuid";

export interface UserEvent {
  id: string;
  userId: string;
  eventType:
    | "search"
    | "inference"
    | "tile_create"
    | "tile_update"
    | "tile_delete"
    | "api_call"
    | "error"
    | "page_view";
  action: string;
  domain?: string;
  metadata: Record<string, any>;
  timestamp: number;
  duration?: number; // milliseconds
  success: boolean;
  errorMessage?: string;
}

export interface PerformanceMetric {
  id: string;
  eventId: string;
  metric:
    | "response_time"
    | "query_complexity"
    | "memory_usage"
    | "cache_hit_rate"
    | "network_latency";
  value: number;
  unit: string;
  threshold?: number;
  exceeded: boolean;
  timestamp: number;
}

export interface EventAggregation {
  date: string;
  eventType: string;
  domain?: string;
  count: number;
  avgDuration: number;
  successRate: number;
  errorRate: number;
  uniqueUsers: number;
}

/**
 * Event Tracker Class
 */
export class EventTracker {
  private events: Map<string, UserEvent> = new Map();
  private metrics: Map<string, PerformanceMetric> = new Map();
  private maxEvents: number = 10000;
  private aggregationInterval: number = 60000; // 1 minute

  /**
   * Track user event
   */
  trackEvent(
    userId: string,
    eventType: UserEvent["eventType"],
    action: string,
    metadata: Record<string, any> = {},
    duration?: number,
    success: boolean = true,
    errorMessage?: string
  ): string {
    const eventId = uuidv4();

    const event: UserEvent = {
      id: eventId,
      userId,
      eventType,
      action,
      domain: metadata.domain,
      metadata,
      timestamp: Date.now(),
      duration,
      success,
      errorMessage,
    };

    this.events.set(eventId, event);

    // Maintain max event size
    if (this.events.size > this.maxEvents) {
      const firstKey = this.events.keys().next().value;
      this.events.delete(firstKey);
    }

    console.log(
      `[EventTracker] Event tracked: ${eventType} by user ${userId}`
    );

    return eventId;
  }

  /**
   * Track performance metric
   */
  recordMetric(
    eventId: string,
    metric: PerformanceMetric["metric"],
    value: number,
    unit: string,
    threshold?: number
  ): void {
    const metricId = uuidv4();

    const perfMetric: PerformanceMetric = {
      id: metricId,
      eventId,
      metric,
      value,
      unit,
      threshold,
      exceeded: threshold ? value > threshold : false,
      timestamp: Date.now(),
    };

    this.metrics.set(metricId, perfMetric);

    if (perfMetric.exceeded) {
      console.warn(
        `[EventTracker] Performance threshold exceeded: ${metric} = ${value} ${unit} (threshold: ${threshold})`
      );
    }
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit: number = 100): UserEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(
    eventType: UserEvent["eventType"],
    limit: number = 100
  ): UserEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.eventType === eventType)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get events by domain
   */
  getEventsByDomain(domain: string, limit: number = 100): UserEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.domain === domain)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get events in time range
   */
  getEventsByTimeRange(
    startTime: number,
    endTime: number
  ): UserEvent[] {
    return Array.from(this.events.values()).filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Calculate event statistics
   */
  calculateStatistics(events: UserEvent[]) {
    const totalEvents = events.length;
    const successfulEvents = events.filter((e) => e.success).length;
    const failedEvents = totalEvents - successfulEvents;

    const avgDuration =
      events.reduce((sum, e) => sum + (e.duration || 0), 0) / totalEvents ||
      0;

    const uniqueUsers = new Set(events.map((e) => e.userId)).size;

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate: (successfulEvents / totalEvents) * 100,
      errorRate: (failedEvents / totalEvents) * 100,
      avgDuration,
      uniqueUsers,
      eventTypes: this.groupByEventType(events),
      domains: this.groupByDomain(events),
    };
  }

  /**
   * Group events by type
   */
  private groupByEventType(events: UserEvent[]) {
    const grouped: Record<string, number> = {};

    events.forEach((e) => {
      grouped[e.eventType] = (grouped[e.eventType] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Group events by domain
   */
  private groupByDomain(events: UserEvent[]) {
    const grouped: Record<string, number> = {};

    events.forEach((e) => {
      if (e.domain) {
        grouped[e.domain] = (grouped[e.domain] || 0) + 1;
      }
    });

    return grouped;
  }

  /**
   * Get performance metrics for event
   */
  getMetricsForEvent(eventId: string): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(
      (m) => m.eventId === eventId
    );
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 1000, limit: number = 20): UserEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.eventType === "search" && e.duration && e.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number = 50): UserEvent[] {
    return Array.from(this.events.values())
      .filter((e) => !e.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Export events for external analytics
   */
  exportEvents(filters?: {
    eventType?: UserEvent["eventType"];
    domain?: string;
    startTime?: number;
    endTime?: number;
  }): UserEvent[] {
    let events = Array.from(this.events.values());

    if (filters?.eventType) {
      events = events.filter((e) => e.eventType === filters.eventType);
    }

    if (filters?.domain) {
      events = events.filter((e) => e.domain === filters.domain);
    }

    if (filters?.startTime) {
      events = events.filter((e) => e.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      events = events.filter((e) => e.timestamp <= filters.endTime!);
    }

    return events;
  }

  /**
   * Clear old events (retention policy)
   */
  clearOldEvents(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;

    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoffTime) {
        this.events.delete(id);
        deletedCount++;
      }
    }

    console.log(
      `[EventTracker] Cleared ${deletedCount} old events older than ${olderThanMs}ms`
    );

    return deletedCount;
  }
}

/**
 * Singleton instance
 */
let trackerInstance: EventTracker | null = null;

export function getEventTracker(): EventTracker {
  if (!trackerInstance) {
    trackerInstance = new EventTracker();
  }
  return trackerInstance;
}

export function resetEventTracker(): void {
  trackerInstance = null;
}

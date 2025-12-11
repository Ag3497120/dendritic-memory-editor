/**
 * Analytics Resolvers for GraphQL
 *
 * Handles all analytics-related GraphQL queries
 * Integrates with EventTracker for retrieving and aggregating analytics data
 */

import { getEventTracker } from "../analytics/eventTracker";
import { UserEvent } from "../analytics/eventTracker";

export const analyticsResolvers = {
  Query: {
    /**
     * Get comprehensive analytics data for a time range
     */
    analytics: (
      _: any,
      args: {
        startTime: number;
        endTime: number;
        domain?: string;
      }
    ) => {
      const tracker = getEventTracker();
      let events = tracker.getEventsByTimeRange(args.startTime, args.endTime);

      // Filter by domain if specified
      if (args.domain) {
        events = events.filter((e) => e.domain === args.domain);
      }

      // Calculate statistics
      const stats = tracker.calculateStatistics(events);
      const slowQueries = tracker.getSlowQueries(1000, 20);
      const failedOps = tracker.getFailedOperations(50);

      return {
        summary: {
          totalEvents: stats.totalEvents,
          successfulEvents: stats.successfulEvents,
          failedEvents: stats.failedEvents,
          successRate: stats.successRate,
          errorRate: stats.errorRate,
          avgDuration: stats.avgDuration,
          uniqueUsers: stats.uniqueUsers,
        },
        eventTypes: stats.eventTypes,
        domains: stats.domains,
        slowQueries: slowQueries.slice(0, 20).map(formatEventAnalytics),
        failedOperations: failedOps.slice(0, 50).map(formatEventAnalytics),
      };
    },

    /**
     * Get events for a specific user
     */
    eventsByUser: (
      _: any,
      args: {
        userId: string;
        limit?: number;
      }
    ) => {
      const tracker = getEventTracker();
      const events = tracker.getEventsByUser(args.userId, args.limit || 100);
      return events.map(formatEventAnalytics);
    },

    /**
     * Get slow queries (exceeding threshold)
     */
    slowQueries: (
      _: any,
      args: {
        threshold?: number;
        limit?: number;
      }
    ) => {
      const tracker = getEventTracker();
      const queries = tracker.getSlowQueries(
        args.threshold || 1000,
        args.limit || 20
      );
      return queries.map(formatEventAnalytics);
    },

    /**
     * Get failed operations
     */
    failedOperations: (
      _: any,
      args: {
        limit?: number;
      }
    ) => {
      const tracker = getEventTracker();
      const operations = tracker.getFailedOperations(args.limit || 50);
      return operations.map(formatEventAnalytics);
    },

    /**
     * Get performance metrics for an event
     */
    performanceMetrics: (
      _: any,
      args: {
        eventId: string;
      }
    ) => {
      const tracker = getEventTracker();
      const metrics = tracker.getMetricsForEvent(args.eventId);
      return metrics.map((m) => ({
        id: m.id,
        eventId: m.eventId,
        metric: m.metric,
        value: m.value,
        unit: m.unit,
        threshold: m.threshold,
        exceeded: m.exceeded,
        timestamp: m.timestamp,
      }));
    },
  },
};

/**
 * Format UserEvent for GraphQL EventAnalytics type
 */
function formatEventAnalytics(event: UserEvent) {
  return {
    id: event.id,
    userId: event.userId,
    eventType: event.eventType,
    action: event.action,
    domain: event.domain,
    duration: event.duration,
    success: event.success,
    errorMessage: event.errorMessage,
    timestamp: event.timestamp,
  };
}

/**
 * Advanced analytics helper: Calculate domain performance
 */
export function getDomainPerformance(domain: string, days: number = 7) {
  const tracker = getEventTracker();
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;

  let events = tracker.getEventsByTimeRange(startTime, endTime);
  events = events.filter((e) => e.domain === domain);

  const stats = tracker.calculateStatistics(events);
  const slowQueries = tracker
    .getSlowQueries(1000, 100)
    .filter((e) => e.domain === domain);

  return {
    domain,
    period: `${days} days`,
    events: stats.totalEvents,
    successRate: stats.successRate,
    errorRate: stats.errorRate,
    avgDuration: stats.avgDuration,
    slowQueryCount: slowQueries.length,
    uniqueUsers: stats.uniqueUsers,
  };
}

/**
 * Advanced analytics helper: Get user activity summary
 */
export function getUserActivitySummary(userId: string) {
  const tracker = getEventTracker();
  const events = tracker.getEventsByUser(userId);

  if (events.length === 0) {
    return {
      userId,
      totalEvents: 0,
      eventTypes: {},
      domains: {},
      successRate: 0,
      firstActivity: null,
      lastActivity: null,
    };
  }

  const stats = tracker.calculateStatistics(events);
  const sortedEvents = events.sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return {
    userId,
    totalEvents: stats.totalEvents,
    eventTypes: stats.eventTypes,
    domains: stats.domains,
    successRate: stats.successRate,
    firstActivity: new Date(sortedEvents[0].timestamp),
    lastActivity: new Date(sortedEvents[sortedEvents.length - 1].timestamp),
  };
}

/**
 * Advanced analytics helper: Performance trend analysis
 */
export function getPerformanceTrend(domain: string, intervalDays: number = 1) {
  const tracker = getEventTracker();
  const trends = [];
  const now = Date.now();

  // Analyze last 30 days in intervals
  for (let i = 30; i >= 0; i--) {
    const endTime = now - i * intervalDays * 24 * 60 * 60 * 1000;
    const startTime = endTime - intervalDays * 24 * 60 * 60 * 1000;

    let events = tracker.getEventsByTimeRange(startTime, endTime);
    if (domain) {
      events = events.filter((e) => e.domain === domain);
    }

    if (events.length > 0) {
      const stats = tracker.calculateStatistics(events);
      trends.push({
        date: new Date(startTime),
        eventCount: stats.totalEvents,
        avgDuration: stats.avgDuration,
        successRate: stats.successRate,
        uniqueUsers: stats.uniqueUsers,
      });
    }
  }

  return trends;
}

/**
 * Advanced analytics helper: Error analysis
 */
export function getErrorAnalysis(domain?: string, limit: number = 50) {
  const tracker = getEventTracker();
  let failures = tracker.getFailedOperations(limit);

  if (domain) {
    failures = failures.filter((f) => f.domain === domain);
  }

  const errorGroups: Record<string, number> = {};

  for (const failure of failures) {
    const errorMsg = failure.errorMessage || "Unknown error";
    errorGroups[errorMsg] = (errorGroups[errorMsg] || 0) + 1;
  }

  // Sort by frequency
  const sortedErrors = Object.entries(errorGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    domain: domain || "all",
    totalErrors: failures.length,
    errorTypes: Object.fromEntries(sortedErrors),
    recentErrors: failures.slice(0, 10).map(formatEventAnalytics),
  };
}

/**
 * Cache statistics
 */
export function getCacheStatistics() {
  const tracker = getEventTracker();
  const allEvents = tracker.getEventsByType("api_call", 10000);
  const metrics = allEvents.flatMap((e) =>
    tracker.getMetricsForEvent(e.id)
  );

  const cacheMetrics = metrics.filter((m) => m.metric === "cache_hit_rate");
  const avgCacheHitRate =
    cacheMetrics.length > 0
      ? cacheMetrics.reduce((sum, m) => sum + m.value, 0) /
        cacheMetrics.length
      : 0;

  return {
    avgCacheHitRate,
    totalCacheMetrics: cacheMetrics.length,
    bestCacheHitRate: Math.max(
      ...cacheMetrics.map((m) => m.value),
      0
    ),
    worstCacheHitRate: Math.min(
      ...cacheMetrics.map((m) => m.value),
      100
    ),
  };
}

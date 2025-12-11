/**
 * Performance Metrics Collector
 *
 * Middleware for automatically collecting performance metrics
 * Tracks API response times, memory usage, cache hit rates, and query complexity
 */

import { getEventTracker } from "./eventTracker";

export interface MetricsContext {
  eventId: string;
  startTime: number;
  startMemory: number;
  cacheHits: number;
  cacheMisses: number;
  queryComplexity: number;
}

/**
 * Start metrics collection for an event
 */
export function startMetricsCollection(eventId: string): MetricsContext {
  const memUsage = process.memoryUsage();

  return {
    eventId,
    startTime: performance.now(),
    startMemory: memUsage.heapUsed,
    cacheHits: 0,
    cacheMisses: 0,
    queryComplexity: 0,
  };
}

/**
 * Record cache hit
 */
export function recordCacheHit(context: MetricsContext): void {
  context.cacheHits++;
}

/**
 * Record cache miss
 */
export function recordCacheMiss(context: MetricsContext): void {
  context.cacheMisses++;
}

/**
 * Update query complexity
 */
export function updateQueryComplexity(
  context: MetricsContext,
  complexity: number
): void {
  context.queryComplexity = Math.max(context.queryComplexity, complexity);
}

/**
 * End metrics collection and record all metrics
 */
export function endMetricsCollection(context: MetricsContext): void {
  const tracker = getEventTracker();
  const endTime = performance.now();
  const memUsage = process.memoryUsage();

  const duration = endTime - context.startTime;
  const memoryUsed = memUsage.heapUsed - context.startMemory;
  const cacheTotal = context.cacheHits + context.cacheMisses;
  const cacheHitRate =
    cacheTotal > 0
      ? (context.cacheHits / cacheTotal) * 100
      : 0;

  // Record response time (threshold: 1000ms)
  tracker.recordMetric(
    context.eventId,
    "response_time",
    duration,
    "ms",
    1000
  );

  // Record memory usage (threshold: 50MB)
  tracker.recordMetric(
    context.eventId,
    "memory_usage",
    memoryUsed / 1024 / 1024,
    "MB",
    50
  );

  // Record cache hit rate (threshold: 50%)
  if (cacheTotal > 0) {
    tracker.recordMetric(
      context.eventId,
      "cache_hit_rate",
      cacheHitRate,
      "%",
      50
    );
  }

  // Record query complexity (threshold: 100)
  if (context.queryComplexity > 0) {
    tracker.recordMetric(
      context.eventId,
      "query_complexity",
      context.queryComplexity,
      "points",
      100
    );
  }
}

/**
 * Hono middleware for tracking API metrics
 */
export function createMetricsMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const tracker = getEventTracker();
    const method = c.req.method;
    const path = c.req.path;
    const userId = c.user?.id || "anonymous";

    // Start event tracking
    const eventId = tracker.trackEvent(
      userId,
      "api_call",
      `${method} ${path}`,
      {
        method,
        path,
        domain: extractDomainFromPath(path),
      }
    );

    // Start metrics collection
    const metricsContext = startMetricsCollection(eventId);

    const startTime = Date.now();

    try {
      await next();

      const duration = Date.now() - startTime;
      const status = c.res.status || 200;

      // Update event with duration and success
      tracker.trackEvent(
        userId,
        "api_call",
        `${method} ${path}`,
        {
          method,
          path,
          status,
          domain: extractDomainFromPath(path),
        },
        duration,
        status < 400,
        undefined
      );

      // End metrics collection
      endMetricsCollection(metricsContext);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      tracker.trackEvent(
        userId,
        "api_call",
        `${method} ${path}`,
        {
          method,
          path,
          domain: extractDomainFromPath(path),
        },
        duration,
        false,
        errorMessage
      );

      endMetricsCollection(metricsContext);
      throw error;
    }
  };
}

/**
 * Extract domain from API path
 */
function extractDomainFromPath(path: string): string {
  // Extract domain from paths like /tiles/domain or /inferences/domain
  const match = path.match(/\/(tiles|inferences|search)\/([^/]+)/);
  return match ? match[2] : "general";
}

/**
 * GraphQL metrics wrapper
 */
export function withMetricsTracking<T extends { userId: string }>(
  resolver: (parent: any, args: any, context: T) => Promise<any>
) {
  return async (parent: any, args: any, context: T) => {
    const tracker = getEventTracker();
    const userId = context.userId || "anonymous";

    // Determine operation type from resolver context
    const operationType = parent.__typename || "unknown";
    const fieldName = context.fieldName || "operation";

    const eventId = tracker.trackEvent(userId, "api_call", fieldName, {
      operationType,
      field: fieldName,
    });

    const metricsContext = startMetricsCollection(eventId);
    const startTime = Date.now();

    try {
      const result = await resolver(parent, args, context);
      const duration = Date.now() - startTime;

      tracker.trackEvent(
        userId,
        "api_call",
        fieldName,
        { operationType, field: fieldName },
        duration,
        true
      );

      endMetricsCollection(metricsContext);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      tracker.trackEvent(
        userId,
        "api_call",
        fieldName,
        { operationType, field: fieldName },
        duration,
        false,
        errorMessage
      );

      endMetricsCollection(metricsContext);
      throw error;
    }
  };
}

/**
 * Calculate query complexity
 * Helps measure GraphQL query sophistication
 */
export function calculateQueryComplexity(query: string): number {
  let complexity = 0;

  // Count field selections
  const fieldMatches = query.match(/\w+\s*\{/g);
  complexity += (fieldMatches?.length || 0) * 1;

  // Count arguments
  const argMatches = query.match(/\(\s*\w+\s*:/g);
  complexity += (argMatches?.length || 0) * 2;

  // Count nested levels
  const nestedMatches = query.match(/\{/g);
  complexity += (nestedMatches?.length || 0) * 1;

  // Count variables
  const varMatches = query.match(/\$\w+/g);
  complexity += (varMatches?.length || 0) * 1;

  return complexity;
}

/**
 * Batch metrics export for analytics
 */
export function exportMetricsForDomain(
  domain: string,
  timeRange: { startTime: number; endTime: number }
) {
  const tracker = getEventTracker();
  const events = tracker.getEventsByDomain(domain);
  const filteredEvents = events.filter(
    (e) => e.timestamp >= timeRange.startTime && e.timestamp <= timeRange.endTime
  );

  const stats = tracker.calculateStatistics(filteredEvents);

  return {
    domain,
    timeRange,
    totalEvents: stats.totalEvents,
    successRate: stats.successRate,
    errorRate: stats.errorRate,
    avgDuration: stats.avgDuration,
    uniqueUsers: stats.uniqueUsers,
    eventTypes: stats.eventTypes,
  };
}

/**
 * Performance threshold monitor
 */
export function checkPerformanceThresholds(
  eventId: string,
  thresholds: {
    responseTime?: number;
    memoryUsage?: number;
    cacheHitRate?: number;
    queryComplexity?: number;
  } = {}
): Array<{ metric: string; value: number; threshold: number }> {
  const tracker = getEventTracker();
  const metrics = tracker.getMetricsForEvent(eventId);
  const violations: Array<{ metric: string; value: number; threshold: number }> = [];

  for (const metric of metrics) {
    if (metric.exceeded) {
      violations.push({
        metric: metric.metric,
        value: metric.value,
        threshold: metric.threshold || 0,
      });
    }
  }

  return violations;
}

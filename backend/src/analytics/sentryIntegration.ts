/**
 * Sentry Error Tracking Integration
 *
 * Integrates Sentry for centralized error tracking and monitoring
 * Automatically captures and reports errors from all parts of the application
 */

import * as Sentry from "@sentry/node";
import { getEventTracker } from "./eventTracker";

/**
 * Initialize Sentry for the application
 */
export function initializeSentry(environment: string = "development") {
  Sentry.init({
    dsn:
      process.env.SENTRY_DSN ||
      "https://your-sentry-dsn@sentry.io/project-id",
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data before sending
      if (event.request?.cookies) {
        event.request.cookies = "[REDACTED]";
      }
      return event;
    },
    integrations: [
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });

  console.log("[Sentry] Initialized with environment:", environment);
}

/**
 * Create Sentry middleware for Hono
 */
export function sentryMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const transaction = Sentry.startTransaction({
      op: "http.request",
      name: `${c.req.method} ${c.req.path}`,
    });

    try {
      await next();
      transaction.finish();
    } catch (error) {
      // Capture error in Sentry
      Sentry.captureException(error, {
        tags: {
          method: c.req.method,
          path: c.req.path,
        },
      });

      // Also track in EventTracker
      const tracker = getEventTracker();
      const userId = c.user?.id || "anonymous";
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      tracker.trackEvent(
        userId,
        "error",
        `${c.req.method} ${c.req.path}`,
        {
          method: c.req.method,
          path: c.req.path,
          stack: error instanceof Error ? error.stack : "",
        },
        0,
        false,
        errorMessage
      );

      transaction.finish();
      throw error;
    }
  };
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context: Record<string, any> = {}
) {
  Sentry.captureException(error, {
    extra: context,
  });

  // Also track in EventTracker
  const tracker = getEventTracker();
  const userId = context.userId || "anonymous";

  tracker.trackEvent(
    userId,
    "error",
    context.action || "unknown_error",
    {
      ...context,
      errorType: error.name,
      errorStack: error.stack,
    },
    0,
    false,
    error.message
  );
}

/**
 * Capture message with severity
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context: Record<string, any> = {}
) {
  Sentry.captureMessage(message, level);

  // Track in EventTracker
  const tracker = getEventTracker();
  const userId = context.userId || "system";

  tracker.trackEvent(
    userId,
    "error",
    `message_${level}`,
    {
      ...context,
      message,
      level,
    },
    0,
    level !== "error" && level !== "fatal"
  );
}

/**
 * Set Sentry user context
 */
export function setSentryUser(userId: string, userInfo: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...userInfo,
  });
}

/**
 * Clear Sentry user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = "user-action",
  level: Sentry.SeverityLevel = "info",
  data: Record<string, any> = {}
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * GraphQL error handler with Sentry
 */
export function createSentryGraphQLErrorHandler() {
  return (error: any, context: any) => {
    const originalError = error.originalError || error;

    // Capture in Sentry
    Sentry.captureException(originalError, {
      tags: {
        graphql: true,
        operation: context.operation?.operation,
      },
    });

    // Track in EventTracker
    const tracker = getEventTracker();
    const userId = context.user?.id || "anonymous";

    tracker.trackEvent(
      userId,
      "error",
      `GraphQL ${context.operation?.operation}`,
      {
        operation: context.operation?.operation,
        field: context.field,
        errorType: originalError.name,
      },
      0,
      false,
      originalError.message
    );

    // Return error to client (don't expose stack trace in production)
    if (process.env.NODE_ENV === "production") {
      return {
        message: "An error occurred",
        extensions: {
          code: "INTERNAL_SERVER_ERROR",
        },
      };
    }

    return error;
  };
}

/**
 * Performance monitoring with Sentry
 */
export function monitorPerformance(
  operationName: string,
  fn: () => Promise<any>,
  context: Record<string, any> = {}
) {
  const transaction = Sentry.startTransaction({
    op: "operation",
    name: operationName,
  });

  const startTime = Date.now();

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        Sentry.captureMessage(
          `Slow operation: ${operationName} took ${duration}ms`,
          "warning",
          {
            extra: {
              operationName,
              duration,
              ...context,
            },
          }
        );
      }

      transaction.finish();
      return result;
    })
    .catch((error) => {
      transaction.finish();
      captureException(error, { operationName, ...context });
      throw error;
    });
}

/**
 * Get error statistics from Sentry (requires API token)
 */
export async function getErrorStats(hours: number = 24) {
  try {
    const orgSlug = process.env.SENTRY_ORG;
    const projectSlug = process.env.SENTRY_PROJECT;
    const authToken = process.env.SENTRY_AUTH_TOKEN;

    if (!orgSlug || !projectSlug || !authToken) {
      console.warn("[Sentry] Missing configuration for error stats");
      return null;
    }

    const response = await fetch(
      `https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/stats/`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[Sentry] Failed to fetch error stats:", error);
    return null;
  }
}

/**
 * Error rate alerting
 */
export function setupErrorRateAlert(
  threshold: number = 0.05, // 5% error rate
  checkInterval: number = 60000 // 1 minute
) {
  setInterval(() => {
    const tracker = getEventTracker();
    const recentEvents = tracker.getEventsByTimeRange(
      Date.now() - 5 * 60 * 1000,
      Date.now()
    );

    if (recentEvents.length === 0) return;

    const failedCount = recentEvents.filter((e) => !e.success).length;
    const errorRate = failedCount / recentEvents.length;

    if (errorRate > threshold) {
      captureMessage(
        `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        "warning",
        {
          threshold: `${(threshold * 100).toFixed(2)}%`,
          actual: `${(errorRate * 100).toFixed(2)}%`,
          failedCount,
          totalCount: recentEvents.length,
        }
      );
    }
  }, checkInterval);
}

/**
 * Memory leak detection
 */
export function setupMemoryMonitoring(threshold: number = 500) {
  // MB threshold
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    if (heapUsedMB > threshold) {
      captureMessage(
        `High memory usage detected: ${heapUsedMB.toFixed(2)}MB`,
        "warning",
        {
          threshold: `${threshold}MB`,
          heapUsed: `${heapUsedMB.toFixed(2)}MB`,
          heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
        }
      );
    }
  }, 60000); // Check every minute
}

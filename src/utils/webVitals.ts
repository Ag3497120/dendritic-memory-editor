/**
 * Web Vitals Monitoring
 *
 * Tracks Core Web Vitals and custom performance metrics
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Interaction to Next Paint (INP)
 */

import { useGraphQL } from "../hooks/useGraphQL";

export interface WebVital {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType?: string;
}

export interface PerformanceThresholds {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
  INP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

// Web Vitals thresholds (Google standards)
const THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 600, poor: 1800 },
};

/**
 * Calculate Web Vital rating
 */
function getRating(
  metric: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[metric as keyof PerformanceThresholds];
  if (!threshold) return "needs-improvement";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Track Largest Contentful Paint (LCP)
 */
function trackLCP(callback: (vital: WebVital) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      const vital: WebVital = {
        name: "LCP",
        value: lastEntry.renderTime || lastEntry.loadTime,
        rating: getRating("LCP", lastEntry.renderTime || lastEntry.loadTime),
        delta: 0,
        id: `lcp-${performance.now()}`,
        navigationType: performance.getEntriesByType("navigation")[0]
          ?.toJSON?.()?.type,
      };

      callback(vital);
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
  } catch (e) {
    console.warn("[WebVitals] LCP tracking not supported");
  }
}

/**
 * Track Cumulative Layout Shift (CLS)
 */
function trackCLS(callback: (vital: WebVital) => void) {
  try {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionTimeout: NodeJS.Timeout;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ((entry as any).hadRecentInput) continue;

        const firstSessionEntry = clsValue;
        clsValue += (entry as any).value;
        sessionValue += (entry as any).value;

        clearTimeout(sessionTimeout);
        sessionTimeout = setTimeout(() => {
          sessionValue = 0;
        }, 1000);

        vital: WebVital = {
          name: "CLS",
          value: sessionValue,
          rating: getRating("CLS", sessionValue),
          delta: clsValue - firstSessionEntry,
          id: `cls-${performance.now()}`,
        };

        callback(vital);
      }
    });

    observer.observe({ entryTypes: ["layout-shift"] });
  } catch (e) {
    console.warn("[WebVitals] CLS tracking not supported");
  }
}

/**
 * Track First Input Delay (FID)
 */
function trackFID(callback: (vital: WebVital) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const vital: WebVital = {
          name: "FID",
          value: (entry as any).processingDuration,
          rating: getRating("FID", (entry as any).processingDuration),
          delta: 0,
          id: `fid-${performance.now()}`,
        };

        callback(vital);
      }
    });

    observer.observe({ entryTypes: ["first-input"] });
  } catch (e) {
    console.warn("[WebVitals] FID tracking not supported");
  }
}

/**
 * Track Interaction to Next Paint (INP)
 */
function trackINP(callback: (vital: WebVital) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      const vital: WebVital = {
        name: "INP",
        value: (lastEntry as any).duration,
        rating: getRating("INP", (lastEntry as any).duration),
        delta: 0,
        id: `inp-${performance.now()}`,
      };

      callback(vital);
    });

    observer.observe({ entryTypes: ["event"] });
  } catch (e) {
    console.warn("[WebVitals] INP tracking not supported");
  }
}

/**
 * Track Time to First Byte (TTFB)
 */
function trackTTFB(callback: (vital: WebVital) => void) {
  try {
    const navigationTiming = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    if (!navigationTiming) return;

    const ttfb = navigationTiming.responseStart - navigationTiming.fetchStart;

    const vital: WebVital = {
      name: "TTFB",
      value: ttfb,
      rating: getRating("TTFB", ttfb),
      delta: 0,
      id: `ttfb-${performance.now()}`,
    };

    callback(vital);
  } catch (e) {
    console.warn("[WebVitals] TTFB tracking not supported");
  }
}

/**
 * Track custom performance metric
 */
export interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

/**
 * Initialize all Web Vitals tracking
 */
export function initializeWebVitals(
  onMetric: (vital: WebVital) => void,
  onCustomMetric?: (metric: CustomMetric) => void
) {
  // Track all Web Vitals
  trackLCP(onMetric);
  trackCLS(onMetric);
  trackFID(onMetric);
  trackINP(onMetric);
  trackTTFB(onMetric);

  // Track custom metrics
  if (onCustomMetric) {
    // Page load time
    window.addEventListener("load", () => {
      const navigationTiming = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;

      if (navigationTiming) {
        const pageLoadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        onCustomMetric({
          name: "page_load_time",
          value: pageLoadTime,
          unit: "ms",
          timestamp: Date.now(),
        });
      }
    });

    // Memory usage (if available)
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        onCustomMetric({
          name: "memory_usage",
          value: memory.usedJSHeapSize,
          unit: "bytes",
          timestamp: Date.now(),
        });
      }, 10000);
    }

    // Network information (if available)
    if ((navigator as any).connection) {
      const connection = (navigator as any).connection;
      onCustomMetric({
        name: "network_type",
        value: 0,
        unit: "type",
        timestamp: Date.now(),
      });

      connection.addEventListener("change", () => {
        onCustomMetric({
          name: "network_change",
          value: 0,
          unit: "event",
          timestamp: Date.now(),
        });
      });
    }
  }
}

/**
 * Hook for tracking Web Vitals in React components
 */
export function useWebVitals() {
  const { mutate } = useGraphQL();

  const trackWebVital = async (vital: WebVital) => {
    try {
      // Send to backend for analytics
      await mutate(
        `
        mutation TrackWebVital($name: String!, $value: Float!, $rating: String!, $id: String!) {
          trackWebVital(name: $name, value: $value, rating: $rating, id: $id) {
            id
            name
            value
          }
        }
      `,
        {
          name: vital.name,
          value: vital.value,
          rating: vital.rating,
          id: vital.id,
        }
      );
    } catch (error) {
      console.error("[WebVitals] Failed to track metric:", error);
    }
  };

  const trackCustomMetric = async (metric: CustomMetric) => {
    try {
      await mutate(
        `
        mutation TrackCustomMetric($name: String!, $value: Float!, $unit: String!) {
          trackCustomMetric(name: $name, value: $value, unit: $unit) {
            id
            name
            value
          }
        }
      `,
        {
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
        }
      );
    } catch (error) {
      console.error("[WebVitals] Failed to track custom metric:", error);
    }
  };

  return {
    initializeWebVitals: () =>
      initializeWebVitals(trackWebVital, trackCustomMetric),
    trackWebVital,
    trackCustomMetric,
    thresholds: THRESHOLDS,
  };
}

/**
 * Get Web Vital recommendations
 */
export function getWebVitalRecommendations(vital: WebVital): string[] {
  const recommendations: string[] = [];

  switch (vital.name) {
    case "LCP":
      if (vital.rating === "poor") {
        recommendations.push("Optimize images and use modern formats");
        recommendations.push("Implement lazy loading for above-fold content");
        recommendations.push("Use a CDN for static assets");
        recommendations.push("Minify CSS and defer non-critical styles");
      }
      break;

    case "CLS":
      if (vital.rating === "poor") {
        recommendations.push("Set explicit dimensions for images and videos");
        recommendations.push("Avoid inserting content above existing content");
        recommendations.push("Use transform animations instead of top/left");
        recommendations.push("Preload web fonts to prevent FOUT");
      }
      break;

    case "FID":
      if (vital.rating === "poor") {
        recommendations.push("Break up long JavaScript tasks");
        recommendations.push("Defer non-critical JavaScript");
        recommendations.push("Use Web Workers for heavy computations");
        recommendations.push("Reduce third-party script impact");
      }
      break;

    case "INP":
      if (vital.rating === "poor") {
        recommendations.push("Optimize event handler performance");
        recommendations.push("Break up long tasks");
        recommendations.push("Use efficient DOM APIs");
        recommendations.push("Debounce input handlers");
      }
      break;

    case "TTFB":
      if (vital.rating === "poor") {
        recommendations.push("Implement server caching");
        recommendations.push("Use a CDN");
        recommendations.push("Optimize database queries");
        recommendations.push("Enable gzip compression");
      }
      break;
  }

  return recommendations;
}

/**
 * Monitoring & Auto-Scaling
 *
 * System health monitoring and automatic scaling:
 * - Performance metrics collection
 * - Alert management
 * - Scaling policies
 * - Trend analysis
 * - Predictive scaling
 */

import { v4 as uuidv4 } from "uuid";

export type MetricType =
  | "cpu"
  | "memory"
  | "disk"
  | "network"
  | "requests"
  | "responseTime"
  | "errorRate"
  | "connections";

export type AlertSeverity = "info" | "warning" | "critical";
export type ScaleDirection = "up" | "down";

export interface Metric {
  id: string;
  type: MetricType;
  value: number;
  timestamp: number;
  source: string; // node ID
  unit: string;
}

export interface MetricThreshold {
  type: MetricType;
  warning: number;
  critical: number;
  cooldownMs?: number;
}

export interface Alert {
  id: string;
  type: MetricType;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  metric: MetricType;
  threshold: number;
  scaleDirection: ScaleDirection;
  scaleAmount: number; // percentage or node count
  cooldownSeconds: number;
  enabled: boolean;
  lastScaleTime?: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  metrics: Record<MetricType, number>;
  issues: string[];
  timestamp: number;
}

/**
 * Monitoring & Auto-Scaling Engine
 */
export class MonitoringAndAutoScalingEngine {
  private metrics: Metric[] = [];
  private alerts: Map<string, Alert> = new Map();
  private thresholds: Map<MetricType, MetricThreshold> = new Map();
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private systemHealth: {
    lastCheck: number;
    status: "healthy" | "degraded" | "critical";
    issues: string[];
  } = { lastCheck: 0, status: "healthy", issues: [] };
  private scalingHistory: Array<{
    timestamp: number;
    direction: ScaleDirection;
    policy: string;
    result: boolean;
  }> = [];
  private maxMetricsSize: number = 100000;
  private trendWindow: number = 300000; // 5 minutes

  constructor() {
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaults: Record<MetricType, MetricThreshold> = {
      cpu: { type: "cpu", warning: 70, critical: 90, cooldownMs: 60000 },
      memory: { type: "memory", warning: 75, critical: 90, cooldownMs: 60000 },
      disk: { type: "disk", warning: 80, critical: 95, cooldownMs: 120000 },
      network: { type: "network", warning: 70, critical: 85, cooldownMs: 60000 },
      requests: {
        type: "requests",
        warning: 5000,
        critical: 10000,
        cooldownMs: 30000,
      },
      responseTime: {
        type: "responseTime",
        warning: 500,
        critical: 2000,
        cooldownMs: 60000,
      },
      errorRate: {
        type: "errorRate",
        warning: 2,
        critical: 5,
        cooldownMs: 60000,
      },
      connections: {
        type: "connections",
        warning: 800,
        critical: 950,
        cooldownMs: 30000,
      },
    };

    for (const [type, threshold] of Object.entries(defaults)) {
      this.thresholds.set(type as MetricType, threshold);
    }
  }

  /**
   * Record metric
   */
  recordMetric(
    type: MetricType,
    value: number,
    source: string,
    unit: string = ""
  ): Metric {
    const metric: Metric = {
      id: uuidv4(),
      type,
      value,
      timestamp: Date.now(),
      source,
      unit: unit || this.getDefaultUnit(type),
    };

    this.metrics.push(metric);

    // Maintain max size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }

    // Check thresholds
    this.checkMetricThreshold(metric);

    return metric;
  }

  /**
   * Get default unit for metric type
   */
  private getDefaultUnit(type: MetricType): string {
    const units: Record<MetricType, string> = {
      cpu: "%",
      memory: "MB",
      disk: "%",
      network: "Mbps",
      requests: "req/s",
      responseTime: "ms",
      errorRate: "%",
      connections: "count",
    };
    return units[type] || "";
  }

  /**
   * Check metric threshold and create alerts
   */
  private checkMetricThreshold(metric: Metric): void {
    const threshold = this.thresholds.get(metric.type);
    if (!threshold) return;

    const alertKey = `${metric.type}-${metric.source}`;
    const existingAlert = this.alerts.get(alertKey);

    // Resolve existing alert if metric is normal
    if (existingAlert && !existingAlert.resolved) {
      if (metric.value < threshold.warning * 0.8) {
        existingAlert.resolved = true;
        existingAlert.resolvedAt = Date.now();
      }
    }

    // Create new alert if threshold exceeded
    if (metric.value >= threshold.critical) {
      this.createAlert(
        metric,
        threshold.critical,
        "critical"
      );
    } else if (metric.value >= threshold.warning) {
      this.createAlert(
        metric,
        threshold.warning,
        "warning"
      );
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    metric: Metric,
    threshold: number,
    severity: AlertSeverity
  ): void {
    const alertKey = `${metric.type}-${metric.source}`;
    const existing = this.alerts.get(alertKey);

    if (existing && !existing.resolved) {
      return; // Don't duplicate active alerts
    }

    const alert: Alert = {
      id: uuidv4(),
      type: metric.type,
      severity,
      value: metric.value,
      threshold,
      message: `${metric.type} on ${metric.source}: ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.set(alertKey, alert);

    // Update system health
    this.updateSystemHealth();
  }

  /**
   * Update system health
   */
  private updateSystemHealth(): void {
    const activeAlerts = Array.from(this.alerts.values()).filter(
      (a) => !a.resolved
    );

    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === "critical"
    );
    const warningAlerts = activeAlerts.filter((a) => a.severity === "warning");

    this.systemHealth.lastCheck = Date.now();

    if (criticalAlerts.length > 0) {
      this.systemHealth.status = "critical";
      this.systemHealth.issues = criticalAlerts.map((a) => a.message);
    } else if (warningAlerts.length > 0) {
      this.systemHealth.status = "degraded";
      this.systemHealth.issues = warningAlerts.map((a) => a.message);
    } else {
      this.systemHealth.status = "healthy";
      this.systemHealth.issues = [];
    }
  }

  /**
   * Create scaling policy
   */
  createScalingPolicy(
    name: string,
    metric: MetricType,
    threshold: number,
    scaleDirection: ScaleDirection,
    scaleAmount: number = 25,
    cooldownSeconds: number = 300
  ): ScalingPolicy {
    const policyId = uuidv4();

    const policy: ScalingPolicy = {
      id: policyId,
      name,
      metric,
      threshold,
      scaleDirection,
      scaleAmount,
      cooldownSeconds,
      enabled: true,
    };

    this.scalingPolicies.set(policyId, policy);
    return policy;
  }

  /**
   * Evaluate scaling policies
   */
  evaluateScalingPolicies(): ScaleDirection | null {
    const now = Date.now();
    const recentMetrics = this.getMetricsFromLast(300000); // Last 5 minutes

    if (recentMetrics.length === 0) return null;

    for (const [policyId, policy] of this.scalingPolicies) {
      if (!policy.enabled) continue;

      // Check cooldown
      if (
        policy.lastScaleTime &&
        now - policy.lastScaleTime < policy.cooldownSeconds * 1000
      ) {
        continue;
      }

      // Get average metric value from recent metrics
      const policyMetrics = recentMetrics.filter((m) => m.type === policy.metric);
      if (policyMetrics.length === 0) continue;

      const avgValue =
        policyMetrics.reduce((sum, m) => sum + m.value, 0) /
        policyMetrics.length;

      // Evaluate policy
      if (policy.scaleDirection === "up" && avgValue >= policy.threshold) {
        policy.lastScaleTime = now;
        this.scalingHistory.push({
          timestamp: now,
          direction: "up",
          policy: policy.name,
          result: true,
        });
        return "up";
      } else if (
        policy.scaleDirection === "down" &&
        avgValue <= policy.threshold * 0.5
      ) {
        policy.lastScaleTime = now;
        this.scalingHistory.push({
          timestamp: now,
          direction: "down",
          policy: policy.name,
          result: true,
        });
        return "down";
      }
    }

    return null;
  }

  /**
   * Get metrics from last N milliseconds
   */
  private getMetricsFromLast(milliseconds: number): Metric[] {
    const cutoff = Date.now() - milliseconds;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  /**
   * Get metric trend
   */
  getMetricTrend(
    type: MetricType,
    windowMs: number = 300000
  ): { timestamp: number; value: number }[] {
    const metrics = this.getMetricsFromLast(windowMs).filter(
      (m) => m.type === type
    );

    return metrics.map((m) => ({
      timestamp: m.timestamp,
      value: m.value,
    }));
  }

  /**
   * Calculate trend direction and rate
   */
  calculateTrendAnalysis(
    type: MetricType,
    windowMs: number = 300000
  ): { trend: "increasing" | "decreasing" | "stable"; rate: number } {
    const trend = this.getMetricTrend(type, windowMs);

    if (trend.length < 2) {
      return { trend: "stable", rate: 0 };
    }

    const firstValue = trend[0].value;
    const lastValue = trend[trend.length - 1].value;
    const change = lastValue - firstValue;
    const rate = change / Math.max(firstValue, 1);

    let direction: "increasing" | "decreasing" | "stable" = "stable";
    if (rate > 0.05) direction = "increasing";
    else if (rate < -0.05) direction = "decreasing";

    return { trend: direction, rate };
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): HealthCheckResult {
    const metricTypes: MetricType[] = [
      "cpu",
      "memory",
      "disk",
      "network",
      "requests",
      "responseTime",
      "errorRate",
      "connections",
    ];

    const metrics: Record<MetricType, number> = {} as Record<MetricType, number>;

    for (const type of metricTypes) {
      const typeMetrics = this.metrics.filter((m) => m.type === type);
      metrics[type] =
        typeMetrics.length > 0
          ? typeMetrics.reduce((sum, m) => sum + m.value, 0) /
            typeMetrics.length
          : 0;
    }

    return {
      healthy: this.systemHealth.status === "healthy",
      metrics,
      issues: this.systemHealth.issues,
      timestamp: Date.now(),
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(limit: number = 50): Alert[] {
    return Array.from(this.alerts.values())
      .filter((a) => !a.resolved)
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return (
          severityOrder[a.severity] - severityOrder[b.severity] ||
          b.timestamp - a.timestamp
        );
      })
      .slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alert of this.alerts.values()) {
      if (alert.id === alertId) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        return true;
      }
    }
    return false;
  }

  /**
   * Get scaling history
   */
  getScalingHistory(limit: number = 50) {
    return this.scalingHistory.slice(-limit);
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(): string[] {
    const recommendations: string[] = [];
    const health = this.getSystemHealth();

    if (health.metrics.cpu > 80) {
      recommendations.push("CPU usage is high - consider scaling up");
    }

    if (health.metrics.memory > 85) {
      recommendations.push("Memory usage is high - consider scaling up or optimizing");
    }

    if (health.metrics.errorRate > 2) {
      recommendations.push("Error rate is elevated - investigate errors or scale up");
    }

    if (health.metrics.responseTime > 500) {
      recommendations.push("Response times are slow - check for bottlenecks or scale up");
    }

    // Check for scaling down opportunities
    const avgCpu = this.metrics
      .filter((m) => m.type === "cpu")
      .slice(-10)
      .reduce((sum, m) => sum + m.value, 0) / Math.max(1, 10);

    if (avgCpu < 30) {
      recommendations.push("Low CPU usage - consider scaling down to save costs");
    }

    return recommendations;
  }

  /**
   * Predict future load
   */
  predictLoad(
    metric: MetricType,
    minutesAhead: number = 5
  ): { timestamp: number; predictedValue: number } {
    const trend = this.getMetricTrend(metric, 1800000); // Last 30 minutes
    if (trend.length < 2) {
      return {
        timestamp: Date.now() + minutesAhead * 60 * 1000,
        predictedValue: 0,
      };
    }

    // Simple linear regression
    const n = trend.length;
    const xValues = trend.map((_, i) => i);
    const yValues = trend.map((t) => t.value);

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    const slope =
      xValues.reduce(
        (sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean),
        0
      ) /
      xValues.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 0;

    const intercept = yMean - slope * xMean;

    // Predict value at minutesAhead
    const futureX = n + (minutesAhead * 60 * 1000) / 30000; // 30-second intervals
    const predictedValue = Math.max(0, slope * futureX + intercept);

    return {
      timestamp: Date.now() + minutesAhead * 60 * 1000,
      predictedValue,
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const health = this.getSystemHealth();
    const activeAlerts = this.getActiveAlerts();
    const recommendations = this.getScalingRecommendations();

    return {
      timestamp: Date.now(),
      systemStatus: this.systemHealth.status,
      metrics: health.metrics,
      activeAlertCount: activeAlerts.length,
      topAlerts: activeAlerts.slice(0, 5),
      recommendations,
      scalingHistory: this.scalingHistory.slice(-10),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = [];
    this.alerts.clear();
    this.scalingHistory = [];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const metricTypes: MetricType[] = [
      "cpu",
      "memory",
      "disk",
      "network",
      "requests",
      "responseTime",
      "errorRate",
      "connections",
    ];

    const stats: Record<string, any> = {};

    for (const type of metricTypes) {
      const typeMetrics = this.metrics.filter((m) => m.type === type);
      if (typeMetrics.length === 0) continue;

      const values = typeMetrics.map((m) => m.value);
      const sorted = values.sort((a, b) => a - b);

      stats[type] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    return stats;
  }
}

/**
 * Singleton instance
 */
let monitoringEngine: MonitoringAndAutoScalingEngine | null = null;

export function getMonitoringAndAutoScalingEngine(): MonitoringAndAutoScalingEngine {
  if (!monitoringEngine) {
    monitoringEngine = new MonitoringAndAutoScalingEngine();
  }
  return monitoringEngine;
}

export function resetMonitoringAndAutoScalingEngine(): void {
  monitoringEngine = null;
}

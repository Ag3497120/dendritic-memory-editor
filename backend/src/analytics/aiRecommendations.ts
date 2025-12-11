/**
 * AI Recommendation Engine
 *
 * Analyzes analytics data and provides intelligent recommendations
 * for performance optimization and user experience improvements
 */

import { getEventTracker } from "./eventTracker";
import {
  getDomainPerformance,
  getErrorAnalysis,
  getPerformanceTrend,
} from "../graphql/analyticsResolvers";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  affectedDomain?: string;
  estimatedImpact: string;
  actionItems: string[];
  createdAt: number;
}

export interface AnalysisResult {
  summary: string;
  recommendations: Recommendation[];
  insights: string[];
  nextSteps: string[];
}

/**
 * Analyze analytics and generate recommendations
 */
export function analyzeAndRecommend(
  domain?: string,
  days: number = 7
): AnalysisResult {
  const recommendations: Recommendation[] = [];
  const insights: string[] = [];
  const nextSteps: string[] = [];

  // Performance analysis
  const performanceIssues = analyzePerformance(domain, days);
  recommendations.push(...performanceIssues);

  // Error analysis
  const errorIssues = analyzeErrors(domain, days);
  recommendations.push(...errorIssues);

  // User behavior analysis
  const behaviorIssues = analyzeUserBehavior(domain, days);
  recommendations.push(...behaviorIssues);

  // Cache efficiency analysis
  const cacheIssues = analyzeCacheEfficiency(domain, days);
  recommendations.push(...cacheIssues);

  // Generate insights
  if (performanceIssues.length > 0) {
    insights.push(
      `Found ${performanceIssues.length} performance issues requiring attention`
    );
  }

  if (errorIssues.length > 0) {
    insights.push(
      `Error rate exceeds acceptable threshold. ${errorIssues.length} error patterns identified`
    );
  }

  if (behaviorIssues.length > 0) {
    insights.push(
      `User engagement patterns suggest ${behaviorIssues.length} improvement opportunities`
    );
  }

  // Generate next steps
  const criticalRecs = recommendations.filter((r) => r.severity === "critical");
  if (criticalRecs.length > 0) {
    nextSteps.push(
      `Address ${criticalRecs.length} critical issues immediately`
    );
  }

  nextSteps.push("Review performance trends and establish baselines");
  nextSteps.push("Monitor implementation of recommendations");

  // Sort recommendations by severity
  recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    summary: `Analysis of ${domain || "all domains"} over the last ${days} days. Found ${recommendations.length} actionable recommendations.`,
    recommendations: recommendations.slice(0, 20), // Top 20
    insights,
    nextSteps,
  };
}

/**
 * Analyze performance metrics
 */
function analyzePerformance(domain?: string, days: number = 7): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const perf = getDomainPerformance(domain || "all", days);

  // Slow response time analysis
  if (perf.avgDuration > 2000) {
    recommendations.push({
      id: `perf-slow-${Date.now()}`,
      title: "High Average Response Time",
      description: `Average API response time is ${perf.avgDuration.toFixed(0)}ms, which may impact user experience.`,
      severity: perf.avgDuration > 5000 ? "critical" : "high",
      category: "performance",
      affectedDomain: domain,
      estimatedImpact:
        "Reducing response time by 20% could improve user satisfaction by 15-20%",
      actionItems: [
        "Profile slow API endpoints to identify bottlenecks",
        "Implement response caching for frequently accessed data",
        "Optimize database queries and add appropriate indexes",
        "Consider implementing pagination for large result sets",
      ],
      createdAt: Date.now(),
    });
  }

  // Slow query analysis
  if (perf.slowQueryCount > 5) {
    recommendations.push({
      id: `perf-slowqueries-${Date.now()}`,
      title: "High Number of Slow Queries",
      description: `${perf.slowQueryCount} queries exceeded the 1000ms threshold in the last ${days} days.`,
      severity: "high",
      category: "performance",
      affectedDomain: domain,
      estimatedImpact: "Optimizing slow queries could reduce p95 latency by 30%",
      actionItems: [
        "Review execution plans for slow queries",
        "Add missing database indexes",
        "Consider denormalizing heavily-joined data",
        "Implement query result caching",
      ],
      createdAt: Date.now(),
    });
  }

  return recommendations;
}

/**
 * Analyze error patterns
 */
function analyzeErrors(domain?: string, days: number = 7): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const errors = getErrorAnalysis(domain, 100);

  // High error rate
  if (errors.totalErrors > 10) {
    const errorRate = (errors.totalErrors / 100) * 100;

    recommendations.push({
      id: `error-highrate-${Date.now()}`,
      title: "Elevated Error Rate",
      description: `${errors.totalErrors} errors detected in the last ${days} days. Error rate: ${errorRate.toFixed(1)}%`,
      severity: errorRate > 10 ? "critical" : "high",
      category: "reliability",
      affectedDomain: domain,
      estimatedImpact:
        "Reducing error rate to <1% would improve system reliability by 10x",
      actionItems: [
        "Investigate and fix the most common error types",
        "Implement better input validation",
        "Add comprehensive error logging and monitoring",
        "Increase test coverage for error scenarios",
      ],
      createdAt: Date.now(),
    });
  }

  // Specific error patterns
  const topErrors = Object.entries(errors.errorTypes).slice(0, 3);
  for (const [errorMsg, count] of topErrors) {
    if (count > 3) {
      recommendations.push({
        id: `error-pattern-${Date.now()}`,
        title: `Recurring Error: ${errorMsg}`,
        description: `This error occurred ${count} times. It's a pattern that should be addressed.`,
        severity: count > 10 ? "high" : "medium",
        category: "reliability",
        affectedDomain: domain,
        estimatedImpact: "Fixing this error could reduce support tickets by 5-10%",
        actionItems: [
          `Root cause analysis for: "${errorMsg}"`,
          "Implement preventive measures",
          "Add specific error handling",
          "Monitor fix effectiveness",
        ],
        createdAt: Date.now(),
      });
    }
  }

  return recommendations;
}

/**
 * Analyze user behavior patterns
 */
function analyzeUserBehavior(domain?: string, days: number = 7): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const tracker = getEventTracker();
  const events = tracker.getEventsByTimeRange(
    Date.now() - days * 24 * 60 * 60 * 1000,
    Date.now()
  );

  if (domain) {
    events.filter((e) => e.domain === domain);
  }

  // Analyze engagement
  const uniqueUsers = new Set(events.map((e) => e.userId)).size;
  const avgEventsPerUser = events.length / Math.max(uniqueUsers, 1);

  if (avgEventsPerUser < 5) {
    recommendations.push({
      id: `behavior-loweng-${Date.now()}`,
      title: "Low User Engagement",
      description: `Users are averaging only ${avgEventsPerUser.toFixed(1)} events each. This indicates low engagement.`,
      severity: "medium",
      category: "engagement",
      affectedDomain: domain,
      estimatedImpact:
        "Improving engagement by 20% could increase feature adoption",
      actionItems: [
        "Analyze user journeys to identify friction points",
        "Implement onboarding improvements",
        "Add feature discoverability enhancements",
        "Create targeted tutorials for key features",
      ],
      createdAt: Date.now(),
    });
  }

  // Analyze feature usage
  const eventTypes = tracker.calculateStatistics(events).eventTypes;
  const unusedFeatures = Object.entries(eventTypes).filter(
    ([, count]) => count < 5
  );

  if (unusedFeatures.length > 0) {
    recommendations.push({
      id: `behavior-unusedfeatures-${Date.now()}`,
      title: "Underutilized Features",
      description: `${unusedFeatures.length} features have low usage (<5 uses in ${days} days).`,
      severity: "low",
      category: "engagement",
      affectedDomain: domain,
      estimatedImpact:
        "Better feature promotion could increase adoption by 25-50%",
      actionItems: [
        "Review feature visibility and discoverability",
        "Add contextual help and tooltips",
        "Consider feature placement optimization",
        "Gather user feedback on unused features",
      ],
      createdAt: Date.now(),
    });
  }

  return recommendations;
}

/**
 * Analyze cache efficiency
 */
function analyzeCacheEfficiency(
  domain?: string,
  days: number = 7
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const tracker = getEventTracker();
  const events = tracker.getEventsByTimeRange(
    Date.now() - days * 24 * 60 * 60 * 1000,
    Date.now()
  );

  let cacheMetrics = events
    .flatMap((e) => tracker.getMetricsForEvent(e.id))
    .filter((m) => m.metric === "cache_hit_rate");

  if (cacheMetrics.length > 0) {
    const avgHitRate =
      cacheMetrics.reduce((sum, m) => sum + m.value, 0) / cacheMetrics.length;

    if (avgHitRate < 50) {
      recommendations.push({
        id: `cache-low-${Date.now()}`,
        title: "Low Cache Hit Rate",
        description: `Cache hit rate is only ${avgHitRate.toFixed(1)}%. There's significant room for improvement.`,
        severity: avgHitRate < 30 ? "high" : "medium",
        category: "performance",
        affectedDomain: domain,
        estimatedImpact:
          "Improving cache hit rate to 80% could reduce latency by 40%",
        actionItems: [
          "Review cache key generation strategy",
          "Extend cache TTLs for stable data",
          "Implement cache warming for popular queries",
          "Monitor cache invalidation patterns",
        ],
        createdAt: Date.now(),
      });
    }
  }

  return recommendations;
}

/**
 * Generate executive summary
 */
export function generateExecutiveSummary(analysis: AnalysisResult): string {
  const criticalCount = analysis.recommendations.filter(
    (r) => r.severity === "critical"
  ).length;
  const highCount = analysis.recommendations.filter(
    (r) => r.severity === "high"
  ).length;

  let summary = `## Performance Analysis Report\n\n`;
  summary += `### Summary\n${analysis.summary}\n\n`;

  if (criticalCount > 0) {
    summary += `⚠️ **${criticalCount} Critical Issues** requiring immediate attention\n`;
  }

  if (highCount > 0) {
    summary += `⚠️ **${highCount} High Priority Issues** to address soon\n`;
  }

  summary += `\n### Key Insights\n`;
  analysis.insights.forEach((insight) => {
    summary += `- ${insight}\n`;
  });

  summary += `\n### Recommended Next Steps\n`;
  analysis.nextSteps.forEach((step) => {
    summary += `- ${step}\n`;
  });

  return summary;
}

/**
 * Track recommendation implementation
 */
export function trackRecommendationImplementation(
  recommendationId: string,
  status: "pending" | "in_progress" | "completed" | "dismissed",
  notes?: string
) {
  const tracker = getEventTracker();

  tracker.trackEvent(
    "system",
    "api_call",
    `recommendation_${status}`,
    {
      recommendationId,
      status,
      notes,
    },
    0,
    true
  );
}

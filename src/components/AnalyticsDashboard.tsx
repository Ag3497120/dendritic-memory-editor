/**
 * Analytics Dashboard Component
 *
 * Displays comprehensive analytics and metrics:
 * - User activity summary
 * - Performance metrics
 * - Event type distribution
 * - Domain-specific analytics
 * - Slow queries and failed operations
 * - Time-range filtering
 */

import { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useGraphQL } from "../hooks/useGraphQL";

interface AnalyticsData {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  successRate: number;
  errorRate: number;
  avgDuration: number;
  uniqueUsers: number;
  eventTypes: Record<string, number>;
  domains: Record<string, number>;
}

interface SlowQuery {
  id: string;
  action: string;
  duration: number;
  timestamp: number;
}

interface FailedOperation {
  id: string;
  action: string;
  errorMessage: string;
  timestamp: number;
}

interface TimeRange {
  startTime: number;
  endTime: number;
}

const ANALYTICS_QUERY = `
  query GetAnalytics($startTime: Int!, $endTime: Int!) {
    analytics(startTime: $startTime, endTime: $endTime) {
      summary {
        totalEvents
        successfulEvents
        failedEvents
        successRate
        errorRate
        avgDuration
        uniqueUsers
      }
      eventTypes
      domains
      slowQueries {
        id
        action
        duration
        timestamp
      }
      failedOperations {
        id
        action
        errorMessage
        timestamp
      }
    }
  }
`;

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const endTime = Date.now();
    const startTime = endTime - 24 * 60 * 60 * 1000; // Last 24 hours
    return { startTime, endTime };
  });

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [failedOps, setFailedOps] = useState<FailedOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const { query } = useGraphQL();

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const result = await query(ANALYTICS_QUERY, {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
      });

      if (result.data?.analytics) {
        const { summary, slowQueries, failedOperations } = result.data.analytics;
        setAnalytics(summary);
        setSlowQueries(slowQueries || []);
        setFailedOps(failedOperations || []);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleTimeRangeChange = (days: number) => {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    setTimeRange({ startTime, endTime });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <ChartBarIcon className="w-8 h-8 text-blue-600" />
          Analytics Dashboard
        </h1>

        {/* Time Range Selector */}
        <div className="flex gap-2 flex-wrap">
          {[1, 7, 30].map((days) => (
            <button
              key={days}
              onClick={() => handleTimeRangeChange(days)}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange.endTime - timeRange.startTime ===
                days * 24 * 60 * 60 * 1000
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Last {days} day{days > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {analytics.totalEvents.toLocaleString()}
              </p>
            </div>
            <ChartBarIcon className="w-12 h-12 text-blue-100" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {analytics.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.successfulEvents} successful
              </p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-100" />
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Error Rate</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {analytics.errorRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.failedEvents} failed
              </p>
            </div>
            <ExclamationTriangleIcon className="w-12 h-12 text-red-100" />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Avg Duration
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {analytics.avgDuration.toFixed(0)}ms
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.uniqueUsers} unique users
              </p>
            </div>
            <ClockIcon className="w-12 h-12 text-purple-100" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Types Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            Event Types Distribution
          </h2>

          <div className="space-y-3">
            {Object.entries(analytics.eventTypes).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {type}
                  </span>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (count / analytics.totalEvents) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domains Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-green-600" />
            Activity by Domain
          </h2>

          <div className="space-y-2">
            {Object.entries(analytics.domains).map(([domain, count]) => (
              <div
                key={domain}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  selectedDomain === domain
                    ? "bg-green-100 border-2 border-green-500"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() =>
                  setSelectedDomain(
                    selectedDomain === domain ? null : domain
                  )
                }
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{domain}</span>
                  <span className="text-sm text-gray-600">{count} events</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slow Queries */}
      {slowQueries.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-yellow-600" />
            Slow Queries (Last 20)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((query) => (
                  <tr
                    key={query.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">
                      {query.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {query.duration.toFixed(0)}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(query.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed Operations */}
      {failedOps.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            Failed Operations (Last 50)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Error Message
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {failedOps.map((op) => (
                  <tr
                    key={op.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">{op.action}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium truncate">
                        {op.errorMessage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>
    </div>
  );
}

# Phase 4: Analytics & Monitoring Implementation

**Status**: ✅ Complete
**Date**: December 2024
**Version**: 1.0

## Overview

Phase 4 implements a comprehensive analytics and monitoring system for the dendritic-memory-editor. This phase includes user behavior tracking, performance metrics collection, analytics dashboard, error tracking with Sentry, AI-powered recommendations, and Web Vitals monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ANALYTICS LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend                    │          Backend               │
│  ──────────────────────────────────────────────────────────  │
│  - Web Vitals Monitor        │  - EventTracker               │
│  - Custom Metrics            │  - PerformanceMetrics         │
│  - Error Tracking            │  - AI Recommendations         │
│  - Analytics Dashboard       │  - Sentry Integration         │
│                              │  - GraphQL Analytics API      │
│                                                              │
│  Data Flow: Frontend → Backend → Analytics DB → Dashboard   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. EventTracker (`backend/src/analytics/eventTracker.ts`)

**Purpose**: Core event tracking system for all user activities and performance metrics.

**Key Classes**:
- `EventTracker`: Main class managing event collection and analysis
- `UserEvent`: Interface for tracking user actions with metadata
- `PerformanceMetric`: Interface for performance data associated with events

**Key Methods**:
```typescript
trackEvent(userId, eventType, action, metadata, duration, success, errorMessage): string
recordMetric(eventId, metric, value, unit, threshold): void
getEventsByUser(userId, limit): UserEvent[]
getEventsByType(eventType, limit): UserEvent[]
getEventsByDomain(domain, limit): UserEvent[]
getEventsByTimeRange(startTime, endTime): UserEvent[]
calculateStatistics(events): statistics object
getSlowQueries(threshold, limit): UserEvent[]
getFailedOperations(limit): UserEvent[]
exportEvents(filters): UserEvent[]
clearOldEvents(olderThanMs): number
```

**Event Types Tracked**:
- `search`: Search query execution
- `inference`: AI inference operations
- `tile_create`: Knowledge tile creation
- `tile_update`: Knowledge tile updates
- `tile_delete`: Knowledge tile deletion
- `api_call`: General API calls
- `error`: Error events
- `page_view`: Page navigation

**Metrics Tracked**:
- `response_time`: API response duration (ms)
- `query_complexity`: GraphQL query complexity score
- `memory_usage`: Heap memory usage (MB)
- `cache_hit_rate`: Cache effectiveness (%)
- `network_latency`: Network delay (ms)

**Features**:
- In-memory storage with automatic cleanup (max 10,000 events)
- Time-range filtering and aggregation
- Slow query detection (>1000ms)
- Failure tracking and analysis
- Event export with flexible filtering
- Automatic retention policy (7-day default)
- Event grouping by type and domain
- Success/failure rate calculations

### 2. PerformanceMetrics Collector (`backend/src/analytics/metricsCollector.ts`)

**Purpose**: Middleware for automatically collecting performance metrics from APIs.

**Key Functions**:
```typescript
startMetricsCollection(eventId): MetricsContext
recordCacheHit(context): void
recordCacheMiss(context): void
updateQueryComplexity(context, complexity): void
endMetricsCollection(context): void
createMetricsMiddleware(): middleware
withMetricsTracking(resolver): wrappedResolver
calculateQueryComplexity(query): number
exportMetricsForDomain(domain, timeRange): metrics
checkPerformanceThresholds(eventId, thresholds): violations[]
```

**Middleware Features**:
- Automatic API endpoint tracking
- Memory usage monitoring
- Cache hit/miss recording
- Query complexity calculation
- Response time measurement
- Threshold violation detection

**Default Thresholds**:
- Response Time: 1000ms
- Memory Usage: 50MB
- Cache Hit Rate: 50%
- Query Complexity: 100 points

### 3. Analytics Dashboard (`src/components/AnalyticsDashboard.tsx`)

**Purpose**: Real-time visualization of analytics and performance metrics.

**Features**:
- Summary cards (Total Events, Success Rate, Error Rate, Avg Duration)
- Event type distribution visualization
- Domain activity breakdown
- Slow queries tracking
- Failed operations reporting
- Time-range filtering (1, 7, 30 days)
- Real-time data refresh

**Data Displayed**:
- 4 key metrics (total events, success rate, error rate, avg duration)
- Event distribution by type
- Activity breakdown by domain
- Slow queries (>1000ms) - last 20
- Failed operations - last 50
- Performance trend analysis

### 4. GraphQL Analytics Queries (`backend/src/graphql/schema.graphql` & `analyticsResolvers.ts`)

**New Query Types**:
```graphql
type AnalyticsSummary {
  totalEvents: Int!
  successfulEvents: Int!
  failedEvents: Int!
  successRate: Float!
  errorRate: Float!
  avgDuration: Float!
  uniqueUsers: Int!
}

type EventAnalytics {
  id: String!
  userId: String!
  eventType: String!
  action: String!
  domain: String
  duration: Int
  success: Boolean!
  errorMessage: String
  timestamp: Int!
}

type PerformanceMetric {
  id: String!
  eventId: String!
  metric: String!
  value: Float!
  unit: String!
  threshold: Int
  exceeded: Boolean!
  timestamp: Int!
}
```

**New Queries**:
```graphql
analytics(startTime: Int!, endTime: Int!, domain: String): AnalyticsData!
eventsByUser(userId: String!, limit: Int): [EventAnalytics!]!
slowQueries(threshold: Int, limit: Int): [EventAnalytics!]!
failedOperations(limit: Int): [EventAnalytics!]!
performanceMetrics(eventId: String!): [PerformanceMetric!]!
```

**Resolver Functions** (`backend/src/graphql/analyticsResolvers.ts`):
```typescript
getDomainPerformance(domain, days): performance metrics
getUserActivitySummary(userId): activity summary
getPerformanceTrend(domain, intervalDays): trend analysis
getErrorAnalysis(domain, limit): error patterns
getCacheStatistics(): cache effectiveness
```

### 5. Error Tracking with Sentry (`backend/src/analytics/sentryIntegration.ts`)

**Purpose**: Centralized error tracking, monitoring, and alerting.

**Key Functions**:
```typescript
initializeSentry(environment): void
sentryMiddleware(): middleware
captureException(error, context): void
captureMessage(message, level, context): void
setSentryUser(userId, userInfo): void
addBreadcrumb(message, category, level, data): void
createSentryGraphQLErrorHandler(): handler
monitorPerformance(operationName, fn, context): result
setupErrorRateAlert(threshold, checkInterval): void
setupMemoryMonitoring(threshold): void
```

**Features**:
- Automatic exception capturing
- Breadcrumb tracking for debugging
- User context association
- Performance transaction tracking
- Error rate alerting (>5% default)
- Memory leak detection (>500MB default)
- GraphQL error handling integration
- Production-safe error reporting

**Configuration**:
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 6. Web Vitals Monitoring (`src/utils/webVitals.ts`)

**Purpose**: Track Core Web Vitals and custom performance metrics.

**Metrics Tracked**:
- **LCP** (Largest Contentful Paint): ≤2.5s (good), ≤4s (needs improvement)
- **CLS** (Cumulative Layout Shift): ≤0.1 (good), ≤0.25 (needs improvement)
- **FID** (First Input Delay): ≤100ms (good), ≤300ms (needs improvement)
- **INP** (Interaction to Next Paint): ≤200ms (good), ≤500ms (needs improvement)
- **TTFB** (Time to First Byte): ≤600ms (good), ≤1.8s (needs improvement)

**Custom Metrics**:
- Page load time
- Memory usage
- Network type and changes
- Custom business metrics

**Key Functions**:
```typescript
initializeWebVitals(onMetric, onCustomMetric): void
useWebVitals(): hook
trackLCP(callback): void
trackCLS(callback): void
trackFID(callback): void
trackINP(callback): void
trackTTFB(callback): void
getWebVitalRecommendations(vital): recommendations[]
```

**Recommendations Provided**:
- LCP improvements (image optimization, lazy loading, CDN usage)
- CLS fixes (explicit dimensions, avoid layout shifts)
- FID optimizations (break up tasks, defer JS, Web Workers)
- INP enhancements (event handler optimization)
- TTFB improvements (caching, CDN, query optimization)

### 7. AI Recommendation Engine (`backend/src/analytics/aiRecommendations.ts`)

**Purpose**: Analyze analytics data and provide intelligent recommendations.

**Analysis Categories**:
1. **Performance Analysis**
   - High average response time (>2s)
   - Slow query detection (>1s)
   - Query optimization recommendations

2. **Error Analysis**
   - Error rate monitoring
   - Recurring error pattern detection
   - Root cause analysis suggestions

3. **User Behavior Analysis**
   - Engagement metrics (events per user)
   - Feature usage patterns
   - Underutilized features identification

4. **Cache Efficiency Analysis**
   - Cache hit rate optimization
   - Cache invalidation patterns
   - Caching strategy improvements

**Key Functions**:
```typescript
analyzeAndRecommend(domain, days): AnalysisResult
generateExecutiveSummary(analysis): string
trackRecommendationImplementation(id, status, notes): void
```

**Recommendation Structure**:
```typescript
interface Recommendation {
  id: string
  title: string
  description: string
  severity: "critical" | "high" | "medium" | "low"
  category: string
  affectedDomain?: string
  estimatedImpact: string
  actionItems: string[]
  createdAt: number
}
```

**Severity Levels**:
- **Critical**: Immediate action required (e.g., error rate >10%)
- **High**: Address soon (e.g., slow queries >5, avg response time >5s)
- **Medium**: Plan for near term (e.g., low cache hit rate)
- **Low**: Consider for improvement (e.g., underutilized features)

## Integration Points

### Backend Integration

**1. Hono Server** (`backend/src/index.ts`):
```typescript
import { createMetricsMiddleware } from "./analytics/metricsCollector";
import { sentryMiddleware, initializeSentry } from "./analytics/sentryIntegration";

// Initialize Sentry
initializeSentry(process.env.NODE_ENV || "development");

// Add middleware to Hono app
app.use(sentryMiddleware());
app.use(createMetricsMiddleware());
```

**2. GraphQL Resolvers** (`backend/src/graphql/resolvers.ts`):
```typescript
import { analyticsResolvers } from "./analyticsResolvers";
import { withMetricsTracking } from "../analytics/metricsCollector";

// Merge analytics resolvers
const resolvers = {
  ...existingResolvers,
  ...analyticsResolvers,
};

// Wrap resolvers with metrics tracking
export const wrappedResolvers = {
  Query: {
    tiles: withMetricsTracking(resolvers.Query.tiles),
    // ... other resolvers
  },
};
```

**3. Error Handlers**:
```typescript
import { createSentryGraphQLErrorHandler } from "./analytics/sentryIntegration";

const errorHandler = createSentryGraphQLErrorHandler();
```

### Frontend Integration

**1. Root App** (`src/App.tsx`):
```typescript
import { useWebVitals } from "./utils/webVitals";

function App() {
  const { initializeWebVitals } = useWebVitals();

  useEffect(() => {
    initializeWebVitals();
  }, []);

  return <MCPDashboard />;
}
```

**2. Analytics Page** (`src/pages/AnalyticsPage.tsx`):
```typescript
import AnalyticsDashboard from "../components/AnalyticsDashboard";

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

**3. Recommendations Page** (`src/pages/RecommendationsPage.tsx`):
```typescript
// Component to display recommendations from AI engine
```

## Data Flow

### Event Tracking Flow
```
User Action
    ↓
EventTracker.trackEvent()
    ↓
Event stored in memory (Map)
    ↓
(Optional) Export to database for long-term storage
    ↓
GraphQL analytics queries retrieve data
    ↓
Dashboard visualizes metrics
```

### Metrics Collection Flow
```
API Request
    ↓
startMetricsCollection()
    ↓
[Request processing]
    ↓
endMetricsCollection()
    ↓
recordMetric() for each metric
    ↓
Threshold checking (exceeded?)
    ↓
Store in PerformanceMetric Map
```

### Error Tracking Flow
```
Exception/Error
    ↓
Sentry.captureException()
    ↓
[Send to Sentry servers]
    ↓
EventTracker.trackEvent() with error=true
    ↓
setupErrorRateAlert() checks for threshold
    ↓
Alert if error rate > 5%
```

### Recommendation Generation Flow
```
Analytics Data
    ↓
analyzeAndRecommend()
    ↓
[Run 4 analysis functions]
    ↓
Generate Recommendation objects
    ↓
Sort by severity
    ↓
Display in dashboard
    ↓
trackRecommendationImplementation()
```

## API Examples

### Track User Event
```typescript
const tracker = getEventTracker();

const eventId = tracker.trackEvent(
  userId,
  "search",
  "domain_search",
  {
    domain: "Medical",
    query: "heart disease",
  },
  250, // duration in ms
  true // success
);
```

### Record Performance Metric
```typescript
tracker.recordMetric(
  eventId,
  "response_time",
  250,
  "ms",
  1000 // threshold
);
```

### Query Analytics
```graphql
query GetAnalytics {
  analytics(startTime: 1702300800000, endTime: 1702387200000, domain: "Medical") {
    summary {
      totalEvents
      successRate
      errorRate
      avgDuration
    }
    slowQueries {
      id
      action
      duration
    }
  }
}
```

### Get Recommendations
```typescript
import { analyzeAndRecommend } from "./aiRecommendations";

const analysis = analyzeAndRecommend("Medical", 7);
// Returns: {
//   summary: string,
//   recommendations: Recommendation[],
//   insights: string[],
//   nextSteps: string[]
// }
```

### Initialize Web Vitals
```typescript
import { useWebVitals } from "./utils/webVitals";

const { initializeWebVitals, trackWebVital } = useWebVitals();

useEffect(() => {
  initializeWebVitals();
}, []);
```

## Database Schema (for persistence)

### Events Table
```sql
CREATE TABLE events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(255) NOT NULL,
  domain VARCHAR(100),
  metadata JSON,
  duration INT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_domain (domain),
  INDEX idx_timestamp (timestamp)
);
```

### Metrics Table
```sql
CREATE TABLE performance_metrics (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  threshold DECIMAL(10,2),
  exceeded BOOLEAN DEFAULT false,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  INDEX idx_event_id (event_id),
  INDEX idx_metric (metric)
);
```

## Monitoring & Alerts

### Default Alerts
1. **Error Rate Alert**: Triggered when error rate > 5% in 5-minute window
2. **Performance Alert**: Triggered when avg response time > 5000ms
3. **Memory Alert**: Triggered when heap usage > 500MB
4. **Cache Hit Rate Alert**: Triggered when cache hit rate < 30%

### Alert Configuration
```typescript
// Set up error rate alert
setupErrorRateAlert(0.05, 300000); // 5%, check every 5 minutes

// Set up memory monitoring
setupMemoryMonitoring(500); // 500MB threshold
```

## Performance Considerations

### Memory Management
- EventTracker maintains max 10,000 events in memory
- Old events automatically cleaned up after 7 days
- Export events to database for long-term storage
- Metrics are aggregated in batch operations

### Query Optimization
- Time-range queries optimized with O(n) iteration
- Domain filtering implemented efficiently
- User filtering uses Set for O(1) lookups
- Statistics calculations cached where possible

### Network Optimization
- Web Vitals data sent asynchronously
- Batch metric exports to reduce overhead
- GraphQL queries support filtering to minimize data transfer
- Sentry configured with 10% sampling in production

## Testing

### Unit Tests
- EventTracker event creation and filtering
- Metrics collection and threshold checking
- Recommendation generation logic
- Web Vitals rating calculation

### Integration Tests
- Analytics GraphQL queries
- Middleware middleware tracking
- Sentry error capturing
- End-to-end tracking flow

### Performance Tests
- EventTracker performance with large datasets
- Dashboard rendering with 10k+ events
- Metrics calculation performance
- Web Vitals observer performance

## Future Enhancements

1. **Machine Learning**
   - Anomaly detection in performance metrics
   - Predictive performance analysis
   - User churn prediction

2. **Advanced Visualizations**
   - Custom chart builders
   - Heat maps for performance bottlenecks
   - Timeline visualization of events

3. **Real-time Alerting**
   - Slack/Teams integration
   - SMS alerts for critical issues
   - Email digest reports

4. **A/B Testing Framework**
   - Event-based A/B testing
   - Statistical significance calculation
   - Variant performance tracking

5. **Advanced Caching**
   - Redis integration for distributed caching
   - Cache warming strategies
   - Cache consistency management

## Files Created

### Backend Files
- `backend/src/analytics/eventTracker.ts` (350 LOC)
- `backend/src/analytics/metricsCollector.ts` (300 LOC)
- `backend/src/analytics/sentryIntegration.ts` (350 LOC)
- `backend/src/analytics/aiRecommendations.ts` (400 LOC)
- `backend/src/graphql/analyticsResolvers.ts` (250 LOC)

### Frontend Files
- `src/components/AnalyticsDashboard.tsx` (350 LOC)
- `src/utils/webVitals.ts` (500 LOC)

### Modified Files
- `backend/src/graphql/schema.graphql` (added analytics types and queries)

**Total Implementation**: ~2,500 lines of code

## Dependencies

### New Backend Dependencies
```json
{
  "@sentry/node": "^7.80.0"
}
```

### New Frontend Dependencies
```json
{
  "@sentry/react": "^7.80.0"
}
```

### Existing Dependencies Used
- `@apollo/client`: GraphQL client
- `react`: UI framework
- `typescript`: Type safety
- `hono`: Web framework

## Deployment Checklist

- [ ] Set Sentry DSN in environment variables
- [ ] Configure error rate alert threshold
- [ ] Set up database for event persistence
- [ ] Configure event retention policy
- [ ] Enable Web Vitals monitoring in production
- [ ] Set up analytics dashboard access control
- [ ] Configure alert notification channels
- [ ] Test recommendation engine with sample data
- [ ] Validate GraphQL analytics queries
- [ ] Monitor initial data collection

## Conclusion

Phase 4 provides a comprehensive, production-ready analytics and monitoring infrastructure for dendritic-memory-editor. The system tracks all user activities, monitors performance metrics, provides intelligent recommendations, and integrates error tracking with Sentry. The flexible architecture allows for easy extension and customization to meet specific business needs.

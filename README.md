# CVPlus Analytics Module

Advanced analytics, revenue tracking, and business intelligence for the CVPlus platform.

## Features

- **Revenue Analytics**: Track and analyze revenue metrics, growth patterns, and forecasting
- **Cohort Analysis**: User retention and lifecycle analysis with advanced segmentation
- **Business Intelligence**: Key performance indicators and dashboard analytics
- **Real-time Metrics**: Live tracking of user engagement and platform usage
- **Custom Reports**: Flexible reporting system with multiple output formats

## Installation

```bash
npm install @cvplus/analytics
```

## Usage

```typescript
import { AnalyticsService, RevenueAnalytics, CohortAnalysis } from '@cvplus/analytics';

// Initialize the analytics service
await AnalyticsService.initialize({
  trackingEnabled: true,
  dataRetentionDays: 365
});

// Track revenue metrics
const revenueAnalytics = new RevenueAnalytics();
const metrics = await revenueAnalytics.getRevenueMetrics({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Perform cohort analysis
const cohortAnalysis = new CohortAnalysis();
const cohorts = await cohortAnalysis.analyzeCohorts({
  period: 'monthly',
  retentionPeriods: 12
});
```

## Services

### RevenueAnalytics
Comprehensive revenue tracking and analysis:
- Monthly/yearly revenue metrics
- Revenue growth analysis
- Customer lifetime value calculations
- Revenue forecasting

### CohortAnalysis  
User retention and behavior analysis:
- Cohort-based retention tracking
- Churn analysis and predictions
- User lifecycle insights
- Segmentation analytics

## API Reference

### Revenue Metrics
```typescript
interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  averageRevenuePerUser: number;
  monthlyRecurringRevenue: number;
  revenueGrowthRate: number;
}
```

### Cohort Metrics
```typescript
interface CohortAnalysis {
  cohortId: string;
  totalUsers: number;
  retentionRate: number;
  churnRate: number;
  averageLifetimeValue: number;
}
```

## Configuration

```typescript
const config = {
  trackingEnabled: true,
  dataRetentionDays: 365,
  batchSize: 100,
  flushInterval: 30000,
  endpoints: {
    events: '/api/analytics/events',
    metrics: '/api/analytics/metrics',
    reports: '/api/analytics/reports'
  }
};
```

## License

MIT
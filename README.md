# CVPlus Analytics Platform

A comprehensive, privacy-first analytics platform for CVPlus with advanced business intelligence, A/B testing, and GDPR/CCPA compliance.

## 🚀 Features

### 📊 **Comprehensive Event Tracking**
- Privacy-compliant event collection and processing
- Real-time and batch event processing
- Automatic page view, click, error, and performance tracking
- CVPlus-specific event taxonomy
- Offline event storage with automatic sync

### 🔒 **Privacy & Compliance (GDPR/CCPA)**
- Granular consent management with audit trails
- Data subject rights handling (Access, Erasure, Portability)
- Privacy by design architecture
- Cookie compliance management
- Data breach notification system
- Automated compliance monitoring

### 🧪 **A/B Testing & Experimentation**
- Complete experimentation platform
- Statistical significance testing
- Feature flag management
- Traffic allocation and variant assignment
- Real-time results analysis
- Multivariate testing support

### 📈 **Business Intelligence & Dashboards**
- Executive and operational dashboards
- Custom metrics and KPI tracking
- Advanced reporting with scheduling
- Predictive analytics (churn, LTV, conversion)
- Real-time alerts and notifications
- Data export capabilities

## 📦 Installation

```bash
npm install @cvplus/analytics
```

## 🏁 Quick Start

```typescript
import { AnalyticsService } from '@cvplus/analytics';

// Initialize the analytics platform
await AnalyticsService.initialize({
  apiKey: 'your-api-key',
  environment: 'production',
  privacy: {
    gdprEnabled: true,
    ccpaEnabled: true,
    consentRequired: true
  },
  autoTracking: {
    pageViews: true,
    clicks: true,
    errors: true,
    performance: true
  }
});

// Track events
await AnalyticsService.track('cv_generation_started', {
  cv: {
    templateId: 'modern_template',
    generationStep: 'personal_info'
  }
});

// Track page views
await AnalyticsService.page('dashboard', 'Dashboard Home');

// Identify users
await AnalyticsService.identify('user_123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium'
});

// Get A/B test variant
const variant = await AnalyticsService.getVariant('experiment_123', 'user_123');
```

## 🔧 Configuration

### Basic Configuration

```typescript
const config = {
  apiKey: 'your-api-key',
  environment: 'development', // 'development' | 'staging' | 'production'
  
  // Privacy settings
  privacy: {
    gdprEnabled: true,
    ccpaEnabled: true,
    consentRequired: true
  },
  
  // Automatic tracking
  autoTracking: {
    pageViews: true,
    clicks: true,
    errors: true,
    performance: true
  }
};

await AnalyticsService.initialize(config);
```

### Advanced Configuration

```typescript
import { CVPlusAnalyticsSDK, ConsentCategory } from '@cvplus/analytics';

const advancedConfig = {
  apiKey: 'your-api-key',
  environment: 'production',
  userId: 'current-user-id',
  anonymousId: 'anonymous-id',
  
  // Auto-tracking configuration
  autoTrackPageViews: true,
  autoTrackClicks: true,
  autoTrackErrors: true,
  autoTrackPerformance: true,
  
  // Privacy configuration
  privacy: {
    gdprEnabled: true,
    ccpaEnabled: true,
    anonymizeIP: true,
    respectDoNotTrack: true,
    consentRequired: true,
    defaultConsent: [ConsentCategory.NECESSARY]
  },
  
  // Event queue configuration
  queue: {
    maxSize: 1000,
    flushInterval: 5000,
    flushBatchSize: 50,
    retryAttempts: 3,
    retryDelay: 1000,
    offlineStorage: true
  },
  
  // Transport configuration
  transport: {
    endpoint: '/api/analytics/events',
    apiKey: 'your-api-key',
    timeout: 10000,
    compression: true,
    batchingEnabled: true,
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxDelay: 10000
    }
  },
  
  // Development settings
  debug: true,
  logLevel: 'info',
  validateEvents: true,
  
  // Third-party integrations
  integrations: {
    googleAnalytics: { trackingId: 'GA-TRACKING-ID' },
    mixpanel: { token: 'MIXPANEL-TOKEN' }
  }
};

const sdk = new CVPlusAnalyticsSDK(advancedConfig);
await sdk.initialize();
```

## 📊 Event Tracking

### Basic Event Tracking

```typescript
// Track custom events
await AnalyticsService.track('button_clicked', {
  action: {
    category: 'ui_interaction',
    label: 'sign_up_button',
    value: 1
  },
  element: {
    text: 'Sign Up Now',
    location: 'header'
  }
});

// Track page views
await AnalyticsService.page('pricing', 'Pricing Page', {
  page: {
    category: 'marketing',
    section: 'pricing'
  }
});

// Identify users
await AnalyticsService.identify('user_123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
  signupDate: new Date(),
  company: 'Acme Corp'
});
```

### CVPlus-Specific Events

```typescript
import { CVPlusEvents } from '@cvplus/analytics';

// CV generation events
await AnalyticsService.track(CVPlusEvents.CV_GENERATION_STARTED, {
  cv: {
    templateId: 'modern_template',
    generationStep: 'personal_info'
  }
});

await AnalyticsService.track(CVPlusEvents.CV_GENERATION_COMPLETED, {
  cv: {
    templateId: 'modern_template',
    exportFormat: 'pdf',
    processingTime: 2500
  }
});

// Premium feature events
await AnalyticsService.track(CVPlusEvents.PREMIUM_FEATURE_ACCESSED, {
  premium: {
    featureId: 'advanced_templates',
    tier: 'premium',
    usage: 1
  }
});

// User journey events
await AnalyticsService.track(CVPlusEvents.USER_REGISTERED, {
  user: {
    source: 'organic',
    referrer: 'google.com'
  }
});
```

## 🔒 Privacy & Consent Management

### Consent Management

```typescript
import { ConsentCategory } from '@cvplus/analytics';

// Update user consent
await AnalyticsService.updateConsent({
  [ConsentCategory.NECESSARY]: true,
  [ConsentCategory.ANALYTICS]: true,
  [ConsentCategory.MARKETING]: false,
  [ConsentCategory.PERSONALIZATION]: true,
  [ConsentCategory.FUNCTIONAL]: true
});

// Get privacy service
const privacyService = AnalyticsService.getPrivacyService();

// Handle data access request (GDPR Article 15)
const accessRequest = await privacyService.handleDataAccessRequest({
  userId: 'user_123',
  email: 'user@example.com',
  requestedData: ['profile', 'analytics', 'preferences'],
  verificationMethod: 'email'
});

// Handle data deletion request (GDPR Article 17)
const deletionRequest = await privacyService.handleDataDeletionRequest({
  userId: 'user_123',
  email: 'user@example.com',
  reason: 'no_longer_consent',
  deletionScope: 'all'
});

// Handle data portability request (GDPR Article 20)
const portabilityRequest = await privacyService.handleDataPortabilityRequest({
  userId: 'user_123',
  email: 'user@example.com',
  format: 'json',
  includeCategories: ['profile', 'preferences']
});
```

### Cookie Consent

```typescript
// Get current cookie consent
const cookieConsent = await privacyService.getCookieConsent('user_123');

// Set cookie consent
await privacyService.setCookieConsent('user_123', {
  necessary: true,
  analytics: true,
  marketing: false,
  functional: true
});
```

## 🧪 A/B Testing & Experimentation

### Create and Run Experiments

```typescript
const abTestingService = AnalyticsService.getABTestingService();

// Create experiment
const experiment = await abTestingService.createExperiment({
  name: 'CV Template Comparison',
  description: 'Testing new template design',
  hypothesis: 'New template will increase completion rates by 15%',
  type: 'ab_test',
  variants: [
    {
      name: 'Control',
      description: 'Current template',
      isControl: true,
      trafficPercentage: 50,
      configuration: { templateId: 'current' }
    },
    {
      name: 'Treatment',
      description: 'New template',
      isControl: false,
      trafficPercentage: 50,
      configuration: { templateId: 'new' }
    }
  ],
  goals: [
    {
      name: 'CV Completion Rate',
      description: 'Users who complete CV generation',
      type: 'conversion',
      isPrimary: true,
      eventName: 'cv_generation_completed',
      aggregation: 'count',
      successCriteria: {
        direction: 'increase',
        minimumDetectableEffect: 0.15
      },
      statistical: {
        significanceLevel: 0.05,
        power: 0.8,
        method: 'frequentist'
      }
    }
  ],
  trafficAllocation: 'random',
  totalTrafficPercentage: 100,
  owner: 'product_team'
});

// Start experiment
await abTestingService.startExperiment(experiment.experimentId);

// Get variant assignment
const assignment = await abTestingService.getVariantAssignment(
  experiment.experimentId,
  'user_123'
);

// Track conversion
await abTestingService.trackConversion(
  experiment.experimentId,
  'user_123',
  'goal_123',
  100 // value
);

// Get results
const results = await abTestingService.getExperimentResults(experiment.experimentId);
```

### Feature Flags

```typescript
// Create feature flag
const flag = await abTestingService.createFeatureFlag({
  name: 'New Dashboard',
  description: 'Enable new dashboard design',
  key: 'new_dashboard_enabled',
  variations: [
    { name: 'Disabled', value: false, description: 'Old dashboard', trafficPercentage: 50 },
    { name: 'Enabled', value: true, description: 'New dashboard', trafficPercentage: 50 }
  ],
  defaultVariation: 'Disabled',
  environment: 'production'
});

// Get feature flag value
const isEnabled = await abTestingService.getFeatureFlagValue(
  'new_dashboard_enabled',
  'user_123',
  { userSegment: 'premium' }
);

// Update rollout
await abTestingService.updateFeatureFlagRollout(flag.flagId, 25); // 25%
```

## 📈 Business Intelligence & Dashboards

### Create Dashboards

```typescript
const biService = AnalyticsService.getBIService();

// Create executive dashboard
const dashboard = await biService.createExecutiveDashboard('owner_123');

// Create custom dashboard
const customDashboard = await biService.createDashboard({
  name: 'Product Analytics',
  description: 'Key product metrics and KPIs',
  type: 'product',
  ownerId: 'product_manager',
  visibility: 'team'
});

// Add widget to dashboard
await biService.addWidgetToDashboard(dashboard.dashboardId, {
  title: 'Daily Active Users',
  type: 'line_chart',
  layout: { x: 0, y: 0, width: 6, height: 3 },
  dataConfig: {
    dataSource: 'users',
    query: {
      from: 'users',
      select: [{ field: 'id', aggregation: 'unique', alias: 'dau' }],
      groupBy: ['date'],
      timeRange: { type: 'relative', relative: { period: 'day', count: 30 } }
    },
    timeRange: { type: 'relative', relative: { period: 'day', count: 30 } },
    aggregation: { period: 'day', timezone: 'UTC' }
  },
  visualization: {
    chartConfig: {
      xAxis: { field: 'date', title: 'Date' },
      yAxis: { field: 'dau', title: 'Daily Active Users' },
      series: [{ name: 'DAU', field: 'dau', type: 'line', showInLegend: true }],
      colors: ['#3b82f6'],
      legend: { enabled: true, position: 'top' }
    }
  },
  interactions: { drillDown: { enabled: false, levels: [] } }
}, 'user_123');
```

### Custom Metrics and Reports

```typescript
// Create business metric
const metric = await biService.createBusinessMetric({
  name: 'CV Completion Rate',
  description: 'Percentage of users who complete CV generation',
  category: 'conversion',
  calculation: {
    type: 'percentage',
    formula: '(completed_cvs / started_cvs) * 100',
    dataSource: 'analytics_events'
  },
  targets: {
    good: 80,
    warning: 60,
    critical: 40
  },
  createdBy: 'product_team'
});

// Calculate metric
const metricValue = await biService.calculateMetric(metric.metricId, {
  type: 'relative',
  relative: { period: 'day', count: 30 }
});

// Create report
const report = await biService.createReport({
  name: 'Monthly Business Review',
  description: 'Comprehensive monthly business metrics',
  category: 'executive',
  sections: [
    {
      sectionId: 'revenue',
      title: 'Revenue Metrics',
      type: 'metrics',
      content: {
        metrics: {
          metricIds: ['mrr', 'arr', 'churn_rate'],
          layout: 'grid'
        }
      },
      order: 1
    }
  ],
  schedule: {
    enabled: true,
    frequency: 'monthly',
    dayOfMonth: 1,
    time: '09:00'
  },
  distribution: {
    email: {
      enabled: true,
      recipients: ['executives@company.com'],
      subject: 'Monthly Business Review'
    }
  },
  createdBy: 'analytics_team'
});
```

### Predictive Analytics

```typescript
// Predict churn risk
const churnRisk = await biService.predictChurnRisk('user_123');
console.log({
  probability: churnRisk.churnProbability,
  risk: churnRisk.risk, // 'low' | 'medium' | 'high'
  factors: churnRisk.factors
});

// Create predictive model
const model = await biService.createPredictiveModel({
  name: 'Customer Lifetime Value',
  type: 'ltv_prediction',
  algorithm: 'xgboost',
  features: [
    { name: 'days_active', type: 'numerical', source: 'user_activity.days_active' },
    { name: 'cv_generations', type: 'numerical', source: 'user_activity.cv_count' },
    { name: 'plan_type', type: 'categorical', source: 'users.plan' }
  ],
  target: 'lifetime_value'
});

// Get prediction
const prediction = await biService.getPrediction(model.modelId, {
  days_active: 30,
  cv_generations: 5,
  plan_type: 'premium'
});
```

## 🔧 Advanced Usage

### Custom Event Validation

```typescript
import { EventType, EventValidationResult } from '@cvplus/analytics';

// Custom event validation
const sdk = AnalyticsService.getSDK();
const event = await sdk.buildEvent({
  eventName: 'custom_event',
  eventType: EventType.TRACK,
  properties: { custom: 'data' }
});

// Validate before tracking
const validation: EventValidationResult = await sdk.validateEvent(event);
if (validation.valid) {
  await sdk.enqueueEvent(validation.enriched);
}
```

### Direct Service Access

```typescript
// Access services directly
const sdk = AnalyticsService.getSDK();
const privacyService = AnalyticsService.getPrivacyService();
const abTestingService = AnalyticsService.getABTestingService();
const biService = AnalyticsService.getBIService();

// Check service status
const status = AnalyticsService.getStatus();
console.log(status);
```

### Error Handling

```typescript
try {
  await AnalyticsService.initialize({
    apiKey: 'invalid-key'
  });
} catch (error) {
  console.error('Analytics initialization failed:', error);
}

// Graceful degradation
if (AnalyticsService.isInitialized()) {
  await AnalyticsService.track('event', {});
} else {
  console.warn('Analytics not available, event not tracked');
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Coverage Report

```bash
npm run test:coverage
```

## 📚 API Reference

### Core Classes

- **`AnalyticsService`** - Main service class for initialization and convenience methods
- **`CVPlusAnalyticsSDK`** - Core analytics SDK with event tracking and session management
- **`PrivacyComplianceService`** - GDPR/CCPA compliance and consent management
- **`ABTestingService`** - A/B testing and experimentation platform
- **`BusinessIntelligenceService`** - Business intelligence, dashboards, and reporting

### Key Types

- **Event Tracking**: `AnalyticsEvent`, `EventProperties`, `EventContext`, `SessionInfo`
- **Privacy**: `ConsentRecord`, `PrivacySettings`, `DataSubjectRequest`, `ConsentCategory`
- **A/B Testing**: `Experiment`, `VariantAssignment`, `ExperimentResults`, `FeatureFlag`
- **Business Intelligence**: `Dashboard`, `Report`, `BusinessMetric`, `PredictiveModel`

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Analytics API key |
| `environment` | string | 'development' | Environment: development, staging, production |
| `autoTrackPageViews` | boolean | true | Automatically track page views |
| `autoTrackClicks` | boolean | true | Automatically track click events |
| `autoTrackErrors` | boolean | true | Automatically track JavaScript errors |
| `autoTrackPerformance` | boolean | true | Automatically track performance metrics |
| `privacy.gdprEnabled` | boolean | true | Enable GDPR compliance features |
| `privacy.ccpaEnabled` | boolean | true | Enable CCPA compliance features |
| `privacy.consentRequired` | boolean | true | Require user consent for tracking |
| `queue.maxSize` | number | 1000 | Maximum events in queue |
| `queue.flushInterval` | number | 5000 | Auto-flush interval (ms) |
| `queue.flushBatchSize` | number | 50 | Events per batch |
| `transport.timeout` | number | 10000 | Request timeout (ms) |
| `debug` | boolean | false | Enable debug logging |
| `validateEvents` | boolean | true | Validate events before sending |

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### Architecture

The CVPlus Analytics Platform follows a modular architecture:

```
packages/analytics/
├── src/
│   ├── services/           # Core service implementations
│   │   ├── analytics-sdk.service.ts
│   │   ├── privacy-compliance.service.ts
│   │   ├── ab-testing.service.ts
│   │   └── business-intelligence.service.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── tracking.types.ts
│   │   ├── privacy.types.ts
│   │   ├── ab-testing.types.ts
│   │   └── business-intelligence.types.ts
│   ├── constants/          # Constants and configurations
│   ├── utils/              # Utility functions
│   └── __tests__/          # Test suites
└── README.md
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For questions or support:
- Create an issue on GitHub
- Contact the development team
- Check the documentation at [docs.cvplus.com](https://docs.cvplus.com)

---

**CVPlus Analytics Platform** - Privacy-first analytics with comprehensive business intelligence and experimentation capabilities.
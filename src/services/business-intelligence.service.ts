/**
 * CVPlus Analytics - Business Intelligence Service
 * Main service file that delegates to modular BI components
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

// Import the complete BI service from the modular implementation
export {
  BusinessIntelligenceService as default,
  BusinessIntelligenceService,
  DashboardManager,
  ReportingEngine,
  MetricsEngine,
  AlertManager,
  PredictiveAnalytics
} from './business-intelligence/index';
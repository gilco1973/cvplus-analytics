/**
 * User Outcomes Types - Stub implementation
 * Note: These types should be moved to analytics module
 */

export interface UserOutcome {
  userId: string;
  outcomeType: string;
  timestamp: Date;
  metrics?: Record<string, any>;
}

// Additional exports required by phase2 types
export interface OutcomeEvent {
  eventType: string;
  userId: string;
  timestamp: Date;
  outcome: UserOutcome;
  metadata?: Record<string, any>;
}
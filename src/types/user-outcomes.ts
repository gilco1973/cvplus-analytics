/**
 * User Outcomes Types
 * Extracted from phase2-models.ts for better modularity
 * 
 * User outcome tracking, events, and success measurement.
 */

// ===============================
// USER OUTCOME TRACKING MODELS
// ===============================

export interface UserOutcome {
  outcomeId: string;
  userId: string;
  jobId: string;
  outcomeType: 'interview_scheduled' | 'interview_completed' | 'offer_received' | 'offer_accepted' | 'hired' | 'rejected' | 'no_response';
  
  // Timeline
  dateOccurred: Date;
  daysSinceApplication?: number;
  timeline?: OutcomeEvent[];
  
  // Context
  jobDetails: {
    company: string;
    position: string;
    industry: string;
    location: string;
    salaryOffered?: number;
    salaryAccepted?: number;
  };
  
  // Source tracking
  applicationSource: 'direct' | 'job_board' | 'referral' | 'recruiter' | 'social_media';
  cvVersion: string; // Which version of CV was used
  
  // Application and CV data
  applicationData?: {
    applicationMethod?: string;
    applicationDate?: Date;
    responseTime?: number;
    applicationNotes?: string;
    applicationSource?: string;
    companySize?: string;
    jobLevel?: string;
    requirements?: string[];
    company?: string;
    jobTitle?: string;
    industry?: string;
    location?: string;
    jobDescription?: string;
    salaryPosted?: number;
  };
  
  cvData?: {
    skillsMatch?: number;
    experienceMatch?: number;
    educationMatch?: number;
    locationMatch?: number;
    industryExperience?: number;
    keywordsMatch?: number;
    cvVersion?: string;
    atsScore?: number;
    optimizationsApplied?: string[];
    predictedSuccess?: number;
  };
  
  // Final result tracking
  finalResult?: {
    outcome: 'hired' | 'rejected' | 'withdrawn' | 'no_response' | 'pending';
    status?: 'hired' | 'rejected' | 'withdrawn' | 'no_response' | 'pending'; // Alternative field name
    reason?: string;
    feedback?: string;
    salaryOffered?: number;
    negotiatedSalary?: number;
    finalDate?: Date; // Add finalDate property
    timeToResult?: number; // Add timeToResult property
  };
  
  // User feedback
  userRating?: number; // 1-5 stars
  userFeedback?: string;
  improvementSuggestions?: string[];
  
  // Prediction accuracy (if we had predictions for this outcome)
  predictionAccuracy?: {
    hadPrediction: boolean;
    predictedProbability?: number;
    actualOutcome: boolean;
    accuracyScore?: number;
  };
  
  // Additional metadata
  metadata?: {
    interviewType?: 'phone' | 'video' | 'in_person' | 'panel' | 'technical';
    numberOfRounds?: number;
    negotiationRounds?: number;
    competitorsCount?: number;
  };
  
  // Data version for schema evolution
  dataVersion?: string;
  
  // Timestamps
  updatedAt?: Date;
  createdAt?: Date;
}

export interface OutcomeEvent {
  eventId: string;
  userId: string;
  jobId: string;
  outcomeId: string;
  
  // Event details
  eventType: 'application_sent' | 'response_received' | 'interview_scheduled' | 'feedback_received' | 'decision_made' | 'no_response';
  eventData: Record<string, any>;
  timestamp: Date;
  date: Date; // Additional date field for compatibility
  stage?: string; // Event stage for compatibility
  details?: string; // Event details for compatibility
  
  // Context
  source: 'user_input' | 'email_tracking' | 'calendar_integration' | 'manual_entry' | 'automated_system';
  confidence: number; // How confident are we in this data
  
  // Related entities
  relatedEvents?: string[]; // Other event IDs related to this one
  parentOutcomeId?: string; // If this is a sub-event of a larger outcome
}
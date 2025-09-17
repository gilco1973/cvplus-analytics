/**
 * User Outcome Tracking Functions
 * 
 * Collects and processes user job application outcomes for ML training
 * and analytics. Implements automated follow-up and data validation.
*/

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { UserOutcome, OutcomeEvent } from '../../types/user-outcomes';
import { AnalyticsEvent } from '../../types/analytics';
import { CallableRequest } from 'firebase-functions/v2/https';
import { corsOptions } from '../../config/cors';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Track user job application outcome
*/
export const trackUserOutcome = onCall(
  { ...corsOptions, timeoutSeconds: 60 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const outcomeData = data as Partial<UserOutcome>;
      
      // Validate required fields
      if (!outcomeData.jobId || !outcomeData.applicationData?.company) {
        throw new HttpsError('invalid-argument', 'Missing required application data');
      }

      // Sanitize and enrich data
      const sanitizedOutcome: UserOutcome = {
        outcomeId: `${auth.uid}_${outcomeData.jobId}_${Date.now()}`,
        userId: auth.uid,
        jobId: outcomeData.jobId,
        outcomeType: 'no_response', // Default to no_response as initial state
        dateOccurred: new Date(),
        jobDetails: {
          company: outcomeData.applicationData.company,
          position: outcomeData.applicationData.jobTitle || 'Unknown Position',
          industry: outcomeData.applicationData.industry || 'General',
          location: outcomeData.applicationData.location || 'Remote'
        },
        applicationSource: 'direct', // Default value
        cvVersion: outcomeData.cvData?.cvVersion || 'unknown',
        
        applicationData: {
          applicationDate: new Date(outcomeData.applicationData.applicationDate || Date.now()),
          applicationMethod: outcomeData.applicationData.applicationMethod || 'direct',
          jobTitle: outcomeData.applicationData.jobTitle || 'Unknown Position',
          company: outcomeData.applicationData.company,
          industry: outcomeData.applicationData.industry || 'General',
          location: outcomeData.applicationData.location || 'Remote',
          jobDescription: outcomeData.applicationData.jobDescription,
          salaryPosted: outcomeData.applicationData.salaryPosted
        },
        
        cvData: {
          cvVersion: outcomeData.cvData?.cvVersion || 'unknown',
          atsScore: outcomeData.cvData?.atsScore || 0,
          optimizationsApplied: outcomeData.cvData?.optimizationsApplied || [],
          predictedSuccess: outcomeData.cvData?.predictedSuccess
        },
        
        timeline: outcomeData.timeline || [{
          eventId: `initial_${Date.now()}`,
          userId: auth.uid,
          jobId: outcomeData.jobId,
          outcomeId: `${auth.uid}_${outcomeData.jobId}_${Date.now()}`,
          eventType: 'application_sent',
          eventData: { stage: 'application', details: 'Application submitted through CVPlus' },
          timestamp: new Date(),
          date: new Date(),
          stage: 'application',
          details: 'Application submitted through CVPlus',
          source: 'user_input',
          confidence: 1.0
        }],
        
        finalResult: {
          outcome: 'pending',
          status: 'pending'
        },
        
        userFeedback: outcomeData.userFeedback,
        createdAt: new Date(),
        updatedAt: new Date(),
        dataVersion: '2.0'
      };

      // Store in Firestore
      await db.collection('user_outcomes').doc(sanitizedOutcome.outcomeId).set(sanitizedOutcome);
      
      // Track analytics event
      await trackAnalyticsEvent({
        eventId: `outcome_tracked_${Date.now()}`,
        userId: auth.uid,
        eventType: 'outcome_reported',
        eventCategory: 'user_action',
        eventData: {
          action: 'outcome_tracked',
          properties: {
            industry: outcomeData.applicationData.industry,
            applicationMethod: outcomeData.applicationData.applicationMethod,
            atsScore: outcomeData.cvData?.atsScore,
            feature: 'outcome_tracking',
            device: 'desktop'
          }
        },
        timestamp: new Date(),
        sessionId: data.sessionId || 'unknown'
      });
      
      // Schedule follow-up reminders
      if (sanitizedOutcome.applicationData?.applicationDate) {
        await scheduleFollowUps(sanitizedOutcome.outcomeId, sanitizedOutcome.applicationData.applicationDate);
      }
      
      // Update user statistics
      await updateUserOutcomeStats(auth.uid, sanitizedOutcome);
      
      return {
        success: true,
        outcomeId: sanitizedOutcome.outcomeId,
        message: 'Outcome tracked successfully'
      };
      
    } catch (error) {
      throw new HttpsError('internal', 'Failed to track outcome');
    }
  }
);

/**
 * Update existing outcome with new events
*/
export const updateUserOutcome = onCall(
  { ...corsOptions, timeoutSeconds: 30 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const { outcomeId, event, finalResult } = data;
      
      if (!outcomeId) {
        throw new HttpsError('invalid-argument', 'Missing outcomeId');
      }

      const outcomeRef = db.collection('user_outcomes').doc(outcomeId);
      const outcomeDoc = await outcomeRef.get();
      
      if (!outcomeDoc.exists) {
        throw new HttpsError('not-found', 'Outcome record not found');
      }

      const currentOutcome = outcomeDoc.data() as UserOutcome;
      
      // Verify ownership
      if (currentOutcome.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      const updateData: Partial<UserOutcome> = {
        updatedAt: new Date()
      };

      // Add new timeline event if provided
      if (event) {
        const newEvent: OutcomeEvent = {
          eventId: `event_${Date.now()}`,
          userId: auth.uid,
          jobId: currentOutcome.jobId,
          outcomeId: outcomeId,
          eventType: event.eventType,
          eventData: event.eventData || { stage: event.stage, details: event.details },
          timestamp: new Date(event.date || Date.now()),
          date: new Date(event.date || Date.now()),
          stage: event.stage,
          details: event.details,
          source: 'user_input',
          confidence: 0.9
        };
        
        updateData.timeline = [...(currentOutcome.timeline || []), newEvent];
      }

      // Update final result if provided
      if (finalResult) {
        updateData.finalResult = {
          outcome: finalResult.status,
          status: finalResult.status,
          finalDate: finalResult.finalDate ? new Date(finalResult.finalDate) : new Date(),
          timeToResult: finalResult.timeToResult || (currentOutcome.applicationData?.applicationDate ? calculateDaysFromApplication(currentOutcome.applicationData.applicationDate) : 0),
          reason: finalResult.rejectionDetails || finalResult.reason,
          feedback: finalResult.feedback,
          salaryOffered: finalResult.offerDetails?.salaryOffered,
          negotiatedSalary: finalResult.offerDetails?.negotiatedSalary
        };
        
        // Cancel future follow-ups if outcome is final
        if (['hired', 'rejected', 'withdrawn'].includes(finalResult.status)) {
          await cancelScheduledFollowUps(outcomeId);
        }
      }

      await outcomeRef.update(updateData);

      // Track analytics event
      await trackAnalyticsEvent({
        eventId: `outcome_updated_${Date.now()}`,
        userId: auth.uid,
        eventType: 'outcome_reported',
        eventCategory: 'user_action',
        eventData: {
          action: 'outcome_updated',
          properties: {
            outcomeId,
            eventType: event?.eventType,
            finalStatus: finalResult?.status,
            feature: 'outcome_tracking'
          }
        },
        timestamp: new Date(),
        sessionId: data.sessionId || 'unknown'
      });

      return {
        success: true,
        message: 'Outcome updated successfully'
      };
      
    } catch (error) {
      throw new HttpsError('internal', 'Failed to update outcome');
    }
  }
);

/**
 * Get user's outcome statistics
*/
export const getUserOutcomeStats = onCall(
  { ...corsOptions, timeoutSeconds: 30 },
  async (request: CallableRequest) => {
    const { auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const outcomesSnapshot = await db
        .collection('user_outcomes')
        .where('userId', '==', auth.uid)
        .get();

      const outcomes = outcomesSnapshot.docs.map(doc => doc.data() as UserOutcome);
      
      const stats = {
        totalApplications: outcomes.length,
        hired: outcomes.filter(o => o.finalResult?.status === 'hired').length,
        rejected: outcomes.filter(o => o.finalResult?.status === 'rejected').length,
        pending: outcomes.filter(o => o.finalResult?.status === 'pending').length,
        noResponse: outcomes.filter(o => o.finalResult?.status === 'no_response').length,
        
        averageTimeToResult: calculateAverageTimeToResult(outcomes),
        successRate: outcomes.length > 0 ? 
          outcomes.filter(o => o.finalResult?.status === 'hired').length / outcomes.length : 0,
        
        industryBreakdown: calculateIndustryBreakdown(outcomes),
        applicationMethods: calculateApplicationMethods(outcomes),
        
        averageAtsScore: outcomes.length > 0 ?
          outcomes.reduce((sum, o) => sum + (o.cvData?.atsScore || 0), 0) / outcomes.length : 0,
        
        lastUpdated: new Date()
      };

      return { success: true, data: stats };
      
    } catch (error) {
      throw new HttpsError('internal', 'Failed to get outcome statistics');
    }
  }
);

/**
 * Automated follow-up scheduler
*/
export const sendFollowUpReminders = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'America/New_York' }, // Daily at 10 AM ET
  async () => {
    try {
      
      const now = new Date();
      const reminderThresholds = [7, 14, 30]; // days
      
      for (const days of reminderThresholds) {
        const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        const outcomesSnapshot = await db
          .collection('user_outcomes')
          .where('finalResult.status', '==', 'pending')
          .where('applicationData.applicationDate', '<=', targetDate)
          .get();

        for (const doc of outcomesSnapshot.docs) {
          const outcome = doc.data() as UserOutcome;
          
          // Check if reminder already sent for this threshold
          const reminderKey = `reminder_${days}d`;
          if (!outcome.timeline?.some(e => e.details?.includes(reminderKey))) {
            await sendFollowUpNotification(outcome, days);
          }
        }
      }
      
      
    } catch (error) {
    }
  }
);

/**
 * Process outcome data for ML training
*/
export const processOutcomeForML = onDocumentCreated(
  'user_outcomes/{outcomeId}',
  async (event) => {
    try {
      const outcome = event.data?.data() as UserOutcome;
      if (!outcome) return;

      // Extract features for ML training
      const features = await extractMLFeatures(outcome);
      
      // Store in ML training dataset
      await db.collection('ml_training_data').doc(outcome.outcomeId).set({
        outcomeId: outcome.outcomeId,
        userId: outcome.userId,
        features,
        label: outcome.finalResult?.status || 'pending',
        createdAt: new Date(),
        ready: outcome.finalResult?.status !== 'pending' // Only use completed outcomes for training
      });
      
      // Check if we should trigger model retraining
      await checkModelRetrainingThreshold();
      
    } catch (error) {
    }
  }
);

// Helper functions
async function scheduleFollowUps(outcomeId: string, applicationDate: Date): Promise<void> {
  const followUpDates = [7, 14, 30].map(days => 
    new Date(applicationDate.getTime() + (days * 24 * 60 * 60 * 1000))
  );
  
  await db.collection('scheduled_followups').doc(outcomeId).set({
    outcomeId,
    scheduledDates: followUpDates,
    completed: false,
    createdAt: new Date()
  });
}

async function cancelScheduledFollowUps(outcomeId: string): Promise<void> {
  await db.collection('scheduled_followups').doc(outcomeId).update({
    completed: true,
    cancelledAt: new Date()
  });
}

async function sendFollowUpNotification(outcome: UserOutcome, daysSince: number): Promise<void> {
  // Implementation would integrate with notification service
  
  // Add reminder event to timeline
  const reminderEvent: OutcomeEvent = {
    eventId: `reminder_${daysSince}d_${Date.now()}`,
    userId: outcome.userId,
    jobId: outcome.jobId,
    outcomeId: outcome.outcomeId,
    eventType: 'no_response',
    eventData: { stage: 'application', daysSince, reminderType: `${daysSince}d_followup` },
    timestamp: new Date(),
    date: new Date(),
    stage: 'application',
    details: `reminder_${daysSince}d sent - no response after ${daysSince} days`,
    source: 'automated_system',
    confidence: 1.0
  };
  
  await db.collection('user_outcomes').doc(outcome.outcomeId).update({
    timeline: admin.firestore.FieldValue.arrayUnion(reminderEvent),
    updatedAt: new Date()
  });
}

async function updateUserOutcomeStats(userId: string, outcome: UserOutcome): Promise<void> {
  const statsRef = db.collection('user_stats').doc(userId);
  
  await statsRef.set({
    totalApplications: admin.firestore.FieldValue.increment(1),
    lastApplicationDate: outcome.applicationData?.applicationDate,
    averageAtsScore: outcome.cvData?.atsScore,
    updatedAt: new Date()
  }, { merge: true });
}

async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  await db.collection('analytics_events').add(event);
}

async function extractMLFeatures(outcome: UserOutcome): Promise<any> {
  return {
    // CV features
    atsScore: outcome.cvData?.atsScore || 0,
    optimizationsCount: outcome.cvData?.optimizationsApplied?.length || 0,
    
    // Application features
    industry: outcome.applicationData?.industry,
    applicationMethod: outcome.applicationData?.applicationMethod,
    hasJobDescription: !!outcome.applicationData?.jobDescription,
    hasSalaryPosted: !!outcome.applicationData?.salaryPosted,
    
    // Timeline features
    timelineEvents: outcome.timeline?.length || 0,
    responseTime: outcome.timeline ? calculateResponseTime(outcome.timeline) : 0,
    
    // Context features
    applicationDate: outcome.applicationData?.applicationDate,
    location: outcome.applicationData?.location
  };
}

function calculateDaysFromApplication(applicationDate: Date): number {
  return Math.floor((Date.now() - applicationDate.getTime()) / (24 * 60 * 60 * 1000));
}

function calculateAverageTimeToResult(outcomes: UserOutcome[]): number {
  const completedOutcomes = outcomes.filter(o => 
    o.finalResult?.timeToResult && o.finalResult?.status !== 'pending'
  );
  
  if (completedOutcomes.length === 0) return 0;
  
  return completedOutcomes.reduce((sum, o) => sum + (o.finalResult?.timeToResult || 0), 0) / completedOutcomes.length;
}

function calculateIndustryBreakdown(outcomes: UserOutcome[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  outcomes.forEach(outcome => {
    const industry = outcome.applicationData?.industry;
    if (industry) {
      breakdown[industry] = (breakdown[industry] || 0) + 1;
    }
  });
  return breakdown;
}

function calculateApplicationMethods(outcomes: UserOutcome[]): Record<string, number> {
  const methods: Record<string, number> = {};
  outcomes.forEach(outcome => {
    const method = outcome.applicationData?.applicationMethod;
    if (method) {
      methods[method] = (methods[method] || 0) + 1;
    }
  });
  return methods;
}

function calculateResponseTime(timeline: OutcomeEvent[]): number {
  if (timeline.length < 2) return 0;
  
  const firstEvent = timeline[0];
  const responseEvent = timeline.find(e => e.eventType !== 'application_sent');
  
  if (!responseEvent) return 0;
  
  return Math.floor((responseEvent.date.getTime() - firstEvent.date.getTime()) / (24 * 60 * 60 * 1000));
}

async function checkModelRetrainingThreshold(): Promise<void> {
  const trainingDataSnapshot = await db
    .collection('ml_training_data')
    .where('ready', '==', true)
    .count()
    .get();
  
  const readyCount = trainingDataSnapshot.data().count;
  const threshold = 1000; // Retrain every 1000 new completed outcomes
  
  if (readyCount % threshold === 0 && readyCount > 0) {
    // Trigger model retraining
    await db.collection('ml_jobs').add({
      type: 'retrain_model',
      dataCount: readyCount,
      status: 'pending',
      createdAt: new Date()
    });
    
  }
}
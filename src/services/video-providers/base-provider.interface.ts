/**
 * Base Video Provider Interface
 * 
 * Common interface for video analytics providers.
 * Used for tracking video performance across different providers.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface VideoProviderMetrics {
  providerId: string;
  totalVideos: number;
  totalViews: number;
  averageViewDuration: number;
  completionRate: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface VideoAnalytics {
  videoId: string;
  providerId: string;
  views: number;
  duration: number;
  completionRate: number;
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  performance: {
    loadTime: number;
    bufferingEvents: number;
    errorCount: number;
  };
  timestamp: Date;
}

export interface BaseVideoProvider {
  providerId: string;
  name: string;
  getMetrics(): Promise<VideoProviderMetrics>;
  getVideoAnalytics(videoId: string): Promise<VideoAnalytics>;
  trackEvent(event: VideoEvent): Promise<void>;
}

export interface VideoEvent {
  eventType: 'view' | 'play' | 'pause' | 'complete' | 'error';
  videoId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface VideoGenerationResult {
  success: boolean;
  videoId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface VideoGenerationOptions {
  userId: string;
  template?: string;
  quality?: 'low' | 'medium' | 'high';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ProviderPerformanceMetrics {
  responseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  availability: number;
}
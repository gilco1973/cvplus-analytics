// Type declarations for @cvplus/analytics
declare module '@cvplus/analytics' {
  export interface AnalyticsEvent { [key: string]: any; }
  export interface AnalyticsMetrics { [key: string]: any; }
  export interface AnalyticsTypes { [key: string]: any; }
  export interface AllAnalyticsTypes { [key: string]: any; }
  export const VERSION: string;
  export const AnalyticsService: any;
}
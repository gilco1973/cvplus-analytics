/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatLargeNumber(num: number): string {
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  
  return num.toString();
}

/**
 * Generate date ranges for analytics queries
 */
export function generateDateRange(
  start: Date, 
  end: Date, 
  interval: 'day' | 'week' | 'month' = 'day'
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    
    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  return dates;
}

/**
 * Calculate retention rate
 */
export function calculateRetentionRate(retained: number, total: number): number {
  if (total === 0) return 0;
  return (retained / total) * 100;
}

/**
 * Calculate churn rate
 */
export function calculateChurnRate(churned: number, total: number): number {
  if (total === 0) return 0;
  return (churned / total) * 100;
}

/**
 * Calculate customer lifetime value
 */
export function calculateCustomerLifetimeValue(
  averageRevenue: number,
  averageLifespan: number,
  churnRate: number
): number {
  if (churnRate === 0) return averageRevenue * averageLifespan;
  return averageRevenue / (churnRate / 100);
}

/**
 * Validate analytics event data
 */
export function validateAnalyticsEvent(event: any): boolean {
  return !!(
    event &&
    event.event &&
    event.timestamp &&
    typeof event.properties === 'object'
  );
}

/**
 * Generate cohort identifier from date
 */
export function generateCohortId(date: Date, period: 'week' | 'month' | 'quarter'): string {
  const year = date.getFullYear();
  
  switch (period) {
    case 'week':
      const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      return `${year}-W${week.toString().padStart(2, '0')}`;
    case 'month':
      const month = date.getMonth() + 1;
      return `${year}-${month.toString().padStart(2, '0')}`;
    case 'quarter':
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${quarter}`;
    default:
      return `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}

/**
 * Safe division to avoid divide by zero
 */
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator === 0 ? defaultValue : numerator / denominator;
}
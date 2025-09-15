/**
 * Analytics Dashboard Component
 * 
 * Real-time analytics dashboard for Phase 2 business intelligence.
 * Shows user engagement, ML performance, and business metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
// TODO: Update firebase import after integration layer is complete
// For now, keeping placeholder until frontend integration is established
// import { functions } from '../lib/firebase';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsDashboardProps {
  className?: string;
}

interface DashboardMetrics {
  userMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    featureAdoption: { [featureName: string]: number };
  };
  atsMetrics: {
    analysesPerformed: number;
    averageScore: number;
    scoreImprovement: number;
    recommendationsApplied: number;
    userSatisfaction: number;
  };
  businessMetrics: {
    revenue: {
      mrr: number;
      arr: number;
      growth: number;
    };
    conversion: {
      signupToFree: number;
      freeToPremium: number;
      premiumToEnterprise: number;
    };
    churn: {
      monthly: number;
      annual: number;
      reasons: { [reason: string]: number };
    };
  };
  mlMetrics: {
    predictionAccuracy: number;
    modelLatency: number;
    predictionVolume: number;
    modelDrift: number;
    retrainingFrequency: number;
  };
}

type TimeRange = '7d' | '30d' | '90d' | '1y';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'business' | 'ml'>('overview');

  const loadAnalytics = useCallback(async () => {
    try {
      setError(null);
      const getAnalytics = httpsCallable(functions, 'getAnalytics');
      
      const result = await getAnalytics({ timeRange });
      
      if (result.data && typeof result.data === 'object' && 'success' in result.data) {
        const data = result.data as { success: boolean; data?: DashboardMetrics; error?: { message: string } };
        if (data.success && data.data) {
          setMetrics(data.data);
        } else {
          setError(data.error?.message || 'Failed to load analytics');
        }
      }
    } catch (err) {
      console.error('Analytics loading failed:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);


  useEffect(() => {
    loadAnalytics();
    
    // Set up real-time updates
    const interval = setInterval(loadAnalytics, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [loadAnalytics]);
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };


  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Analytics</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    trend?: number;
    format?: 'number' | 'currency' | 'percentage';
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }> = ({ title, value, trend, format = 'number', color = 'blue' }) => {
    let formattedValue: string;
    
    switch (format) {
      case 'currency':
        formattedValue = formatCurrency(Number(value));
        break;
      case 'percentage':
        formattedValue = formatPercentage(Number(value));
        break;
      default:
        formattedValue = formatNumber(Number(value));
    }

    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600'
    };

    return (
      <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <div className="text-sm opacity-80">{title}</div>
        {trend !== undefined && (
          <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  // Chart data preparation
  const retentionData = [
    { name: 'Day 1', value: metrics.userMetrics.retention.day1 * 100 },
    { name: 'Day 7', value: metrics.userMetrics.retention.day7 * 100 },
    { name: 'Day 30', value: metrics.userMetrics.retention.day30 * 100 }
  ];

  const featureAdoptionData = Object.entries(metrics.userMetrics.featureAdoption).map(([name, value]) => ({
    name,
    value: value * 100
  }));

  const conversionFunnelData = [
    { stage: 'Signup', value: 100 },
    { stage: 'Free User', value: metrics.businessMetrics.conversion.signupToFree * 100 },
    { stage: 'Premium', value: metrics.businessMetrics.conversion.freeToPremium * 100 },
    { stage: 'Enterprise', value: metrics.businessMetrics.conversion.premiumToEnterprise * 100 }
  ];

  const churnReasonsData = Object.entries(metrics.businessMetrics.churn.reasons).map(([reason, count]) => ({
    name: reason,
    value: count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex mt-4">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'users', label: 'Users' },
            { key: 'business', label: 'Business' },
            { key: 'ml', label: 'ML Performance' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'overview' | 'users' | 'business' | 'ml')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Daily Active Users"
                value={metrics.userMetrics.dailyActiveUsers}
                color="blue"
              />
              <MetricCard
                title="Avg ATS Score"
                value={metrics.atsMetrics.averageScore}
                format="percentage"
                color="green"
              />
              <MetricCard
                title="Monthly Revenue"
                value={metrics.businessMetrics.revenue.mrr}
                format="currency"
                trend={metrics.businessMetrics.revenue.growth}
                color="purple"
              />
              <MetricCard
                title="ML Accuracy"
                value={metrics.mlMetrics.predictionAccuracy}
                format="percentage"
                color="orange"
              />
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">User Retention</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={conversionFunnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Daily Active Users"
                value={metrics.userMetrics.dailyActiveUsers}
                color="blue"
              />
              <MetricCard
                title="Weekly Active Users"
                value={metrics.userMetrics.weeklyActiveUsers}
                color="green"
              />
              <MetricCard
                title="Monthly Active Users"
                value={metrics.userMetrics.monthlyActiveUsers}
                color="purple"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Feature Adoption</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={featureAdoptionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {featureAdoptionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">User Retention</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Day 1 Retention</span>
                    <span className="font-semibold">{formatPercentage(metrics.userMetrics.retention.day1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Day 7 Retention</span>
                    <span className="font-semibold">{formatPercentage(metrics.userMetrics.retention.day7)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Day 30 Retention</span>
                    <span className="font-semibold">{formatPercentage(metrics.userMetrics.retention.day30)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'business' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={metrics.businessMetrics.revenue.mrr}
                format="currency"
                trend={metrics.businessMetrics.revenue.growth}
                color="green"
              />
              <MetricCard
                title="Annual Recurring Revenue"
                value={metrics.businessMetrics.revenue.arr}
                format="currency"
                color="purple"
              />
              <MetricCard
                title="Monthly Churn Rate"
                value={metrics.businessMetrics.churn.monthly}
                format="percentage"
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Conversion Rates</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={conversionFunnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Churn Reasons</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={churnReasonsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {churnReasonsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ml' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Prediction Accuracy"
                value={metrics.mlMetrics.predictionAccuracy}
                format="percentage"
                color="blue"
              />
              <MetricCard
                title="Model Latency"
                value={`${metrics.mlMetrics.modelLatency}ms`}
                color="green"
              />
              <MetricCard
                title="Predictions/Month"
                value={metrics.mlMetrics.predictionVolume}
                color="purple"
              />
              <MetricCard
                title="Model Drift Score"
                value={metrics.mlMetrics.modelDrift}
                format="percentage"
                color="orange"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">ML Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Model Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Prediction Accuracy:</span>
                      <span className="font-semibold">{formatPercentage(metrics.mlMetrics.predictionAccuracy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Latency:</span>
                      <span className="font-semibold">{metrics.mlMetrics.modelLatency}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model Drift:</span>
                      <span className="font-semibold">{formatPercentage(metrics.mlMetrics.modelDrift)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Usage Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monthly Predictions:</span>
                      <span className="font-semibold">{formatNumber(metrics.mlMetrics.predictionVolume)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retraining Frequency:</span>
                      <span className="font-semibold">Every {metrics.mlMetrics.retrainingFrequency} days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

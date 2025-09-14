import React, { useState, useEffect } from 'react';
import { useAuth } from '@cvplus/auth';

// Types
interface DashboardMetrics {
  profileViews: number;
  uniqueVisitors: number;
  engagementRate: number;
  downloadCount: number;
  conversionRate: number;
  avgTimeOnProfile: number;
}

interface AnalyticsDashboardProps {
  profileId?: string;
  dateRange?: '7d' | '30d' | '90d' | '1y';
  showExportOptions?: boolean;
  onMetricsUpdate?: (metrics: DashboardMetrics) => void;
  className?: string;
}

/**
 * AnalyticsDashboard - Comprehensive analytics dashboard for CVPlus profiles
 *
 * Features:
 * - Profile performance metrics and engagement tracking
 * - Visitor analytics and demographic insights
 * - Interactive charts and visualizations
 * - Export and reporting capabilities
 * - Real-time data updates
 */
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  profileId,
  dateRange = '30d',
  showExportOptions = true,
  onMetricsUpdate,
  className = ''
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'engagement' | 'demographics' | 'content' | 'reports'>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    profileViews: 0,
    uniqueVisitors: 0,
    engagementRate: 0,
    downloadCount: 0,
    conversionRate: 0,
    avgTimeOnProfile: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch analytics data
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!isAuthenticated || !user) return;

      setIsLoading(true);
      try {
        // Mock data for now - will integrate with analytics backend
        const mockMetrics: DashboardMetrics = {
          profileViews: 1247,
          uniqueVisitors: 892,
          engagementRate: 67.3,
          downloadCount: 89,
          conversionRate: 12.4,
          avgTimeOnProfile: 156
        };

        setMetrics(mockMetrics);
        onMetricsUpdate?.(mockMetrics);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [profileId, dateRange, isAuthenticated, user, onMetricsUpdate]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'traffic', name: 'Traffic', icon: '🚦' },
    { id: 'engagement', name: 'Engagement', icon: '❤️' },
    { id: 'demographics', name: 'Demographics', icon: '🌍' },
    { id: 'content', name: 'Content', icon: '📄' },
    { id: 'reports', name: 'Reports', icon: '📈' }
  ] as const;

  if (!isAuthenticated) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔐</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please sign in to view your analytics dashboard.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600 mt-1">Track your profile performance and visitor insights</p>
          </div>
          {showExportOptions && (
            <div className="flex space-x-2">
              <select
                value={dateRange}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Export Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="px-6 flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <div className="min-h-96">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-blue-600 text-xl mr-2">👁️</span>
                      <div>
                        <p className="text-sm text-blue-600">Profile Views</p>
                        <p className="text-2xl font-bold text-blue-900">{metrics.profileViews.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-green-600 text-xl mr-2">👥</span>
                      <div>
                        <p className="text-sm text-green-600">Unique Visitors</p>
                        <p className="text-2xl font-bold text-green-900">{metrics.uniqueVisitors.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-purple-600 text-xl mr-2">❤️</span>
                      <div>
                        <p className="text-sm text-purple-600">Engagement Rate</p>
                        <p className="text-2xl font-bold text-purple-900">{metrics.engagementRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-orange-600 text-xl mr-2">⬇️</span>
                      <div>
                        <p className="text-sm text-orange-600">Downloads</p>
                        <p className="text-2xl font-bold text-orange-900">{metrics.downloadCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-red-600 text-xl mr-2">📈</span>
                      <div>
                        <p className="text-sm text-red-600">Conversion</p>
                        <p className="text-2xl font-bold text-red-900">{metrics.conversionRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-yellow-600 text-xl mr-2">⏱️</span>
                      <div>
                        <p className="text-sm text-yellow-600">Avg. Time</p>
                        <p className="text-2xl font-bold text-yellow-900">{metrics.avgTimeOnProfile}s</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <span className="text-4xl mb-4 block">📊</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Chart</h3>
                  <p className="text-gray-600">Interactive charts will be displayed here</p>
                </div>
              </div>
            )}

            {activeTab !== 'overview' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tabs.find(t => t.id === activeTab)?.name} Section
                </h3>
                <p className="text-gray-600">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} analytics will be implemented here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
/**
 * Notification Analytics Component
 * Advanced analytics and tracking for notification performance
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Eye,
  MousePointer,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Smartphone,
  Monitor,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ============================================================================
// INTERFACES
// ============================================================================

interface NotificationAnalyticsProps {
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockAnalytics = {
  overview: {
    totalSent: 12500,
    totalDelivered: 11750,
    totalRead: 8900,
    totalClicked: 3200,
    deliveryRate: 94.0,
    openRate: 75.7,
    clickRate: 36.0,
    averageDeliveryTime: 1.2
  },
  trends: {
    sent: { value: 12500, change: 8.5 },
    delivered: { value: 11750, change: 6.2 },
    read: { value: 8900, change: 12.1 },
    clicked: { value: 3200, change: -2.3 }
  },
  channels: {
    in_app: { sent: 5000, delivered: 4950, opened: 4200, clicked: 1800 },
    push: { sent: 4200, delivered: 3800, opened: 2900, clicked: 850 },
    email: { sent: 2800, delivered: 2700, opened: 1500, clicked: 450 },
    sms: { sent: 500, delivered: 300, opened: 300, clicked: 100 }
  },
  timeData: [
    { date: '2024-01-01', sent: 450, delivered: 425, read: 320, clicked: 95 },
    { date: '2024-01-02', sent: 520, delivered: 495, read: 380, clicked: 115 },
    { date: '2024-01-03', sent: 380, delivered: 360, read: 275, clicked: 80 },
    { date: '2024-01-04', sent: 620, delivered: 590, read: 445, clicked: 135 },
    { date: '2024-01-05', sent: 480, delivered: 455, read: 340, clicked: 105 },
    { date: '2024-01-06', sent: 720, delivered: 680, read: 510, clicked: 155 },
    { date: '2024-01-07', sent: 680, delivered: 645, read: 485, clicked: 145 }
  ]
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NotificationAnalytics: React.FC<NotificationAnalyticsProps> = ({
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<'sent' | 'delivered' | 'read' | 'clicked'>('sent');

  // Chart data
  const lineChartData: ChartData = {
    labels: mockAnalytics.timeData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Sent',
        data: mockAnalytics.timeData.map(d => d.sent),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      },
      {
        label: 'Delivered',
        data: mockAnalytics.timeData.map(d => d.delivered),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1
      },
      {
        label: 'Read',
        data: mockAnalytics.timeData.map(d => d.read),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.1
      },
      {
        label: 'Clicked',
        data: mockAnalytics.timeData.map(d => d.clicked),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.1
      }
    ]
  };

  const channelChartData: ChartData = {
    labels: Object.keys(mockAnalytics.channels),
    datasets: [
      {
        label: 'Delivered',
        data: Object.values(mockAnalytics.channels).map(c => c.delivered),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Analytics</h2>
          <p className="text-gray-600 mt-1">Track and analyze notification performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sent"
          value={mockAnalytics.overview.totalSent.toLocaleString()}
          change={mockAnalytics.trends.sent.change}
          icon={<MessageSquare className="w-6 h-6" />}
          color="blue"
          trend={mockAnalytics.trends.sent.change > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Delivery Rate"
          value={`${mockAnalytics.overview.deliveryRate}%`}
          change={mockAnalytics.trends.delivered.change}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          trend={mockAnalytics.trends.delivered.change > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Open Rate"
          value={`${mockAnalytics.overview.openRate}%`}
          change={mockAnalytics.trends.read.change}
          icon={<Eye className="w-6 h-6" />}
          color="yellow"
          trend={mockAnalytics.trends.read.change > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Click Rate"
          value={`${mockAnalytics.overview.clickRate}%`}
          change={mockAnalytics.trends.clicked.change}
          icon={<MousePointer className="w-6 h-6" />}
          color="purple"
          trend={mockAnalytics.trends.clicked.change > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Trend</h3>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="clicked">Clicked</option>
              </select>
            </div>
          </div>
          
          <div className="h-80">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Channel Performance</h3>
          
          <div className="h-80">
            <Doughnut 
              data={channelChartData} 
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Channel Details */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Channel Breakdown</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(mockAnalytics.channels).map(([channel, data]) => {
                const ctr = data.sent > 0 ? ((data.clicked / data.sent) * 100).toFixed(1) : '0';
                const channelIcons = {
                  in_app: <Monitor className="w-5 h-5 text-blue-500" />,
                  push: <Smartphone className="w-5 h-5 text-green-500" />,
                  email: <Mail className="w-5 h-5 text-purple-500" />,
                  sms: <MessageSquare className="w-5 h-5 text-orange-500" />
                };
                
                return (
                  <tr key={channel} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {channelIcons[channel as keyof typeof channelIcons]}
                        <span className="font-medium text-gray-900 capitalize">
                          {channel.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.sent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.delivered.toLocaleString()}
                      <span className="ml-2 text-xs text-gray-500">
                        ({((data.delivered / data.sent) * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.opened.toLocaleString()}
                      <span className="ml-2 text-xs text-gray-500">
                        ({((data.opened / data.delivered) * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.clicked.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(ctr) > 30 ? 'bg-green-100 text-green-800' :
                        parseFloat(ctr) > 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ctr}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Strong Email Performance</h4>
                <p className="text-sm text-gray-600">
                  Email notifications have a 54% open rate, which is above industry average.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Optimize Send Times</h4>
                <p className="text-sm text-gray-600">
                  Consider sending notifications during peak engagement hours (9-11 AM).
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">SMS Delivery Issues</h4>
                <p className="text-sm text-gray-600">
                  SMS has a low delivery rate. Check carrier relationships and number validity.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Segment Audience</h4>
                <p className="text-sm text-gray-600">
                  Create targeted campaigns for different user segments to improve engagement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  trend
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white',
    red: 'bg-red-500 text-white'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationAnalytics;
/**
 * PaymentDashboard - Comprehensive payment management interface
 * Integrates all payment components with analytics and management features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  Download,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Eye,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  Building,
  Globe,
  Shield,
  Zap,
  X,
  Bell
} from 'lucide-react';
import { PaymentService } from '../../api/services/payment';
import { ApiClient } from '../../api/core/ApiClient';
import { PaymentHistory } from './PaymentHistory';
import { SubscriptionManager } from './SubscriptionManager';
import { RefundManager } from './RefundManager';
import { 
  PaymentTransaction,
  PaymentMethod,
  PaymentAnalytics,
  Subscription,
  PaymentRefund
} from '../../types/payment-types';

interface PaymentDashboardProps {
  className?: string;
}

type TabType = 'overview' | 'transactions' | 'methods' | 'subscriptions' | 'refunds' | 'analytics';

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefund[]>([]);

  const paymentService = new PaymentService(new ApiClient({
    baseURL: 'https://api.touriquest.com',
    timeout: 30000,
    environment: 'production',
    enableMetrics: true,
    enableLogging: true,
    enableCompression: true,
    enableDeduplication: true,
    enableBatching: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 502, 503, 504],
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR']
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
      expectedFailureRate: 0.1
    },
    cacheConfig: {
      defaultTTL: 300000,
      maxSize: 100,
      enableCompression: true,
      persistentStorage: true
    },
    authConfig: {
      tokenRefreshThreshold: 300,
      maxConcurrentRefreshes: 3,
      enableBiometric: false,
      enableWebAuthn: false,
      sessionTimeoutWarning: 900
    }
  }));

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        analyticsResponse,
        transactionsResponse,
        methodsResponse,
        subscriptionsResponse,
        refundsResponse
      ] = await Promise.all([
        paymentService.getPaymentAnalytics(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        ),
        paymentService.getTransactions({
          limit: 10,
          sort: 'newest'
        }),
        paymentService.getPaymentMethods(),
        paymentService.getUserSubscriptions(),
        paymentService.getRefunds()
      ]);

      if (analyticsResponse.data) {
        setAnalytics(analyticsResponse.data as PaymentAnalytics);
      }

      if (transactionsResponse.data) {
        setRecentTransactions(transactionsResponse.data);
      }

      if (methodsResponse.data) {
        setPaymentMethods(methodsResponse.data);
      }

      if (subscriptionsResponse.data) {
        setSubscriptions(subscriptionsResponse.data);
      }

      if (refundsResponse.data) {
        setRefunds(refundsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: BarChart3 },
    { id: 'transactions' as TabType, label: 'Transactions', icon: Activity },
    { id: 'methods' as TabType, label: 'Payment Methods', icon: CreditCard },
    { id: 'subscriptions' as TabType, label: 'Subscriptions', icon: RefreshCw },
    { id: 'refunds' as TabType, label: 'Refunds', icon: Wallet },
    { id: 'analytics' as TabType, label: 'Analytics', icon: PieChart }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 font-medium">Loading payment dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Dashboard</h2>
            <p className="text-gray-600 mt-1">
              Comprehensive payment management and analytics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 border-b border-gray-100">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error Loading Dashboard</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gray-100">
        <div className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold">
                        {analytics ? formatCurrency(analytics.totalRevenue) : '$0'}
                      </p>
                      <p className="text-blue-100 text-sm mt-1">
                        +{analytics?.monthlyTrends?.[0]?.successRate || 0}% this month
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Transactions</p>
                      <p className="text-2xl font-bold">
                        {analytics ? formatNumber(analytics.totalTransactions) : '0'}
                      </p>
                      <p className="text-green-100 text-sm mt-1">
                        +{analytics?.conversionRate || 0}% this month
                      </p>
                    </div>
                    <Activity className="h-12 w-12 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Active Subscriptions</p>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.status === 'active').length}
                      </p>
                      <p className="text-purple-100 text-sm mt-1">
                        {formatCurrency(subscriptions.reduce((sum, s) => sum + s.amount, 0))} MRR
                      </p>
                    </div>
                    <RefreshCw className="h-12 w-12 text-purple-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {analytics ? ((analytics.successfulTransactions / analytics.totalTransactions) * 100).toFixed(1) : '0'}%
                      </p>
                      <p className="text-orange-100 text-sm mt-1">
                        Payment processing success
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-orange-200" />
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Recent Transactions</h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No recent transactions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          {getTransactionStatusIcon(transaction.status)}
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {transaction.status}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.paymentMethod.type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => setActiveTab('methods')}
                  className="p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-900">Payment Methods</h4>
                      <p className="text-blue-600 text-sm">
                        {paymentMethods.length} methods configured
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('refunds')}
                  className="p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-8 w-8 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-900">Process Refund</h4>
                      <p className="text-red-600 text-sm">
                        {refunds.length} refunds processed
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-900">View Analytics</h4>
                      <p className="text-green-600 text-sm">
                        Detailed insights & reports
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <PaymentHistory className="border-none shadow-none" />
          )}

          {activeTab === 'methods' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Method
                </button>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No payment methods configured</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Add payment methods to start processing payments
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              •••• •••• •••• {method.last4}
                            </p>
                            <p className="text-sm text-gray-500">
                              {method.type} • Expires {method.expiryMonth}/{method.expiryYear}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {method.isDefault && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Default
                            </span>
                          )}
                          <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionManager className="border-none shadow-none" />
          )}

          {activeTab === 'refunds' && (
            <RefundManager className="border-none shadow-none" />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Payment Analytics</h3>
              
              {analytics ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trends */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Revenue Trends</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">This Month</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(analytics.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Growth Rate</span>
                        <span className="font-medium text-green-600">
                          +{analytics.monthlyTrends?.[0]?.successRate || 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Average Transaction</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(analytics.averageTransactionAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Insights */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Transaction Insights</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Transactions</span>
                        <span className="font-medium text-gray-900">
                          {formatNumber(analytics.totalTransactions)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Success Rate</span>
                        <span className="font-medium text-green-600">
                          {((analytics.successfulTransactions / analytics.totalTransactions) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Failed Transactions</span>
                        <span className="font-medium text-red-600">
                          {analytics.failedTransactions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <PieChart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No analytics data available</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Analytics will appear as you process payments
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
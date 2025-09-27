/**
 * RefundManager - Interface for processing and managing payment refunds
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Calendar,
  CreditCard,
  X,
  Send,
  Eye,
  RotateCcw
} from 'lucide-react';
import { PaymentService } from '../../api/services/payment';
import { ApiClient } from '../../api/core/ApiClient';
import { 
  PaymentTransaction,
  PaymentRefund,
  RefundRequest,
  ApiResponse
} from '../../types/payment-types';

interface RefundManagerProps {
  transactionId?: string;
  className?: string;
  onClose?: () => void;
}

export const RefundManager: React.FC<RefundManagerProps> = ({ 
  transactionId, 
  className = '', 
  onClose 
}) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefund[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);

  const [refundForm, setRefundForm] = useState({
    transactionId: '',
    amount: '',
    reason: '',
    refundMethod: 'original' as 'original' | 'credit'
  });

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
    loadData();
    if (transactionId) {
      loadTransactionDetails(transactionId);
    }
  }, [transactionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [transactionsResponse, refundsResponse] = await Promise.all([
        paymentService.getTransactions({
          status: ['completed'],
          sort: 'newest',
          limit: 50
        }),
        paymentService.getRefunds()
      ]);

      if (transactionsResponse.data) {
        setTransactions(transactionsResponse.data);
      }

      if (refundsResponse.data) {
        setRefunds(refundsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetails = async (id: string) => {
    try {
      const response = await paymentService.getTransaction(id);
      if (response.data) {
        setSelectedTransaction(response.data);
        setRefundForm(prev => ({
          ...prev,
          transactionId: id,
          amount: response.data.amount.toString()
        }));
      }
    } catch (error) {
      console.error('Failed to load transaction details:', error);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!refundForm.transactionId || !refundForm.amount || !refundForm.reason) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setProcessingRefund(true);
      setError(null);

      const refundRequest: RefundRequest = {
        transactionId: refundForm.transactionId,
        amount: parseFloat(refundForm.amount),
        reason: refundForm.reason,
        refundMethod: refundForm.refundMethod
      };

      const response = await paymentService.requestRefund(refundRequest);

      if (response.data) {
        setShowRefundModal(false);
        setRefundForm({
          transactionId: '',
          amount: '',
          reason: '',
          refundMethod: 'original'
        });
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const getRefundStatus = (refund: PaymentRefund) => {
    switch (refund.status) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          color: 'bg-green-100 text-green-800'
        };
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          color: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-400" />,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.id.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading refund data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900">Refund Management</h3>
              <p className="text-gray-600 text-sm mt-1">
                Process refunds and manage refund requests
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRefundModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Process Refund
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 border-b border-gray-100">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Refunds Summary */}
      <div className="p-6 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Refunds</p>
                <p className="text-xl font-bold text-blue-900">
                  {refunds.length}
                </p>
              </div>
              <RotateCcw className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Completed</p>
                <p className="text-xl font-bold text-green-900">
                  {refunds.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total Amount</p>
                <p className="text-xl font-bold text-orange-900">
                  {formatCurrency(
                    refunds
                      .filter(r => r.status === 'completed')
                      .reduce((sum, r) => sum + r.amount, 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Refunds */}
      <div className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recent Refunds</h4>
        
        {refunds.length === 0 ? (
          <div className="text-center py-8">
            <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No refunds processed</p>
            <p className="text-gray-400 text-sm mt-1">
              Refund history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.slice(0, 10).map((refund) => {
              const status = getRefundStatus(refund);
              return (
                <div
                  key={refund.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {status.icon}
                    <div>
                      <div className="flex items-center space-x-3">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(refund.amount, refund.currency)}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {refund.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{formatDate(refund.createdAt)}</span>
                        <span>•</span>
                        <span>Reason: {refund.reason}</span>
                      </div>
                    </div>
                  </div>

                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eligible Transactions for Refund */}
      {!transactionId && (
        <div className="p-6 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-4">Eligible for Refund</h4>
          
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No eligible transactions</p>
              <p className="text-gray-400 text-sm mt-1">
                Only completed transactions can be refunded
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.createdAt)} • {transaction.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setRefundForm(prev => ({
                        ...prev,
                        transactionId: transaction.id,
                        amount: transaction.amount.toString()
                      }));
                      setShowRefundModal(true);
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Refund
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refund Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRefundModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Process Refund</h3>
                  <button
                    onClick={() => setShowRefundModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleRefundSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={refundForm.transactionId}
                      onChange={(e) => setRefundForm(prev => ({ ...prev, transactionId: e.target.value }))}
                      placeholder="Enter transaction ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundForm.amount}
                      onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Refund
                    </label>
                    <select
                      value={refundForm.reason}
                      onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select reason</option>
                      <option value="duplicate_payment">Duplicate Payment</option>
                      <option value="fraudulent">Fraudulent Transaction</option>
                      <option value="customer_request">Customer Request</option>
                      <option value="service_not_provided">Service Not Provided</option>
                      <option value="billing_error">Billing Error</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Method
                    </label>
                    <select
                      value={refundForm.refundMethod}
                      onChange={(e) => setRefundForm(prev => ({ ...prev, refundMethod: e.target.value as 'original' | 'credit' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="original">Original Payment Method</option>
                      <option value="credit">Account Credit</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRefundModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processingRefund}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRefund ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Process Refund
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
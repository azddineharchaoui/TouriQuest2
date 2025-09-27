/**
 * PaymentHistory - Comprehensive payment transaction history and management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Download,
  Search,
  Filter,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Mail
} from 'lucide-react';
import { PaymentService } from '../../api/services/payment';
import { ApiClient } from '../../api/core/ApiClient';
import { 
  PaymentTransaction, 
  PaymentHistory as PaymentHistoryType,
  PaymentFilters,
  CurrencyRate
} from '../../types/payment-types';

interface PaymentHistoryProps {
  className?: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ className = '' }) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [currencyRates, setCurrencyRates] = useState<Record<string, CurrencyRate>>({});
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const [filters, setFilters] = useState<PaymentFilters>({
    status: [],
    type: [],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    sort: 'newest',
    page: 1,
    limit: 20
  });

  const paymentService = new PaymentService(new ApiClient());

  useEffect(() => {
    loadPaymentHistory();
    loadCurrencyRates();
  }, [filters]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [historyResponse, transactionsResponse] = await Promise.all([
        paymentService.getPaymentHistory(filters),
        paymentService.getTransactions(filters)
      ]);

      if (historyResponse.success) {
        setPaymentHistory(historyResponse.data);
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrencyRates = async () => {
    try {
      const response = await paymentService.getCurrencyRates();
      if (response.success) {
        setCurrencyRates(response.data);
      }
    } catch (error) {
      console.error('Failed to load currency rates:', error);
    }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    try {
      const response = await paymentService.downloadReceipt(transactionId);
      if (response.success) {
        // Create download link
        const url = window.URL.createObjectURL(response.data as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${transactionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  const handleEmailReceipt = async (transactionId: string) => {
    try {
      // Implementation for emailing receipt
      console.log('Email receipt for transaction:', transactionId);
    } catch (error) {
      console.error('Failed to email receipt:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'partially_refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const convertAmount = (amount: number, currency: string) => {
    if (currency === selectedCurrency || !currencyRates[selectedCurrency]) {
      return amount;
    }
    return amount * currencyRates[selectedCurrency].rate;
  };

  const formatCurrency = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency);
    return convertedAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: selectedCurrency
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
        transaction.amount.toString().includes(searchLower) ||
        transaction.paymentMethod.brand?.toLowerCase().includes(searchLower) ||
        transaction.paymentMethod.last4?.includes(searchTerm)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading payment history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center p-12">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="ml-3">
            <p className="text-red-600 font-medium">Failed to load payment history</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <button
              onClick={loadPaymentHistory}
              className="mt-3 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
            <p className="text-gray-600 text-sm mt-1">
              Track all your payments and transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPaymentHistory}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search and Currency Selection */}
        <div className="flex flex-col sm:flex-row gap-4">
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
          {Object.keys(currencyRates).length > 1 && (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.keys(currencyRates).map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      status: e.target.value ? [e.target.value] : []
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={filters.sort || 'newest'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_asc">Amount (Low to High)</option>
                    <option value="amount_desc">Amount (High to Low)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Cards */}
      {paymentHistory && (
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Spent</p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(paymentHistory.totalSpent, 'USD')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Successful</p>
                  <p className="text-xl font-bold text-green-900">
                    {paymentHistory.transactions.filter(t => t.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Refunded</p>
                  <p className="text-xl font-bold text-orange-900">
                    {formatCurrency(paymentHistory.totalRefunded, 'USD')}
                  </p>
                </div>
                <ArrowDownRight className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Average</p>
                  <p className="text-xl font-bold text-purple-900">
                    {formatCurrency(paymentHistory.averageTransactionAmount, 'USD')}
                  </p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="p-6">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No transactions found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Your payment history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </p>
                        <p className="text-sm text-gray-500">
                          •••• {transaction.paymentMethod.last4} • {transaction.paymentMethod.brand}
                        </p>
                        <p className="text-sm text-gray-500">
                          ID: {transaction.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {transaction.status === 'completed' && transaction.receipt && (
                      <button
                        onClick={() => handleDownloadReceipt(transaction.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Download Receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Transaction Details */}
                {transaction.refunds && transaction.refunds.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Refunds:</p>
                    <div className="space-y-2">
                      {transaction.refunds.map((refund) => (
                        <div key={refund.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            {formatDate(refund.createdAt)} - {refund.reason}
                          </span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(refund.amount, refund.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Transaction ID</p>
                        <p className="font-medium text-gray-900">{selectedTransaction.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                          {selectedTransaction.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(selectedTransaction.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedTransaction.paymentMethod && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              •••• •••• •••• {selectedTransaction.paymentMethod.last4}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedTransaction.paymentMethod.brand} • 
                              Expires {selectedTransaction.paymentMethod.expiryMonth}/{selectedTransaction.paymentMethod.expiryYear}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTransaction.fees && selectedTransaction.fees.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Fees</h4>
                      <div className="space-y-2">
                        {selectedTransaction.fees.map((fee, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{fee.description}</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(fee.amount, fee.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                  {selectedTransaction.status === 'completed' && selectedTransaction.receipt && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadReceipt(selectedTransaction.id)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleEmailReceipt(selectedTransaction.id)}
                        className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
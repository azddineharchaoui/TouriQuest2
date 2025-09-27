/**
 * PaymentMethodManager - Component for managing saved payment methods
 * Features adding, editing, deleting, and setting default payment methods
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Star,
  StarOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader,
  Calendar,
  User,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { PaymentMethod } from '../../types/payment-types';

interface PaymentMethodManagerProps {
  onClose?: () => void;
  className?: string;
}

export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({
  onClose,
  className = ''
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);

  // New card form state
  const [cardData, setCardData] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    holderName: '',
    isDefault: false
  });

  // Edit form state
  const [editData, setEditData] = useState({
    holderName: '',
    isDefault: false
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getPaymentMethods();
      if (response.success && response.paymentMethods) {
        setPaymentMethods(response.paymentMethods);
      } else {
        setError('Failed to load payment methods');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const validateCardForm = (): boolean => {
    setError(null);

    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number');
      return false;
    }

    if (!cardData.holderName.trim()) {
      setError('Please enter the cardholder name');
      return false;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expiryMonth = parseInt(cardData.expiryMonth);
    const expiryYear = parseInt(cardData.expiryYear);

    if (!expiryMonth || expiryMonth < 1 || expiryMonth > 12) {
      setError('Please enter a valid expiry month');
      return false;
    }

    if (!expiryYear || expiryYear < currentYear || 
        (expiryYear === currentYear && expiryMonth < currentMonth)) {
      setError('Please enter a valid expiry year');
      return false;
    }

    if (!cardData.cvc || cardData.cvc.length < 3) {
      setError('Please enter a valid CVC');
      return false;
    }

    return true;
  };

  const handleAddPaymentMethod = async () => {
    if (!validateCardForm()) return;

    try {
      setLoading(true);
      setError(null);

      const newMethod: Partial<PaymentMethod> = {
        type: 'card',
        last4: cardData.number.replace(/\s/g, '').slice(-4),
        brand: getCardBrand(cardData.number),
        expiryMonth: parseInt(cardData.expiryMonth),
        expiryYear: parseInt(cardData.expiryYear),
        holderName: cardData.holderName,
        isDefault: cardData.isDefault
      };

      const response = await paymentService.addPaymentMethod(newMethod);

      if (response.success && response.paymentMethod) {
        setPaymentMethods(prev => [...prev, response.paymentMethod!]);
        setSuccess('Payment method added successfully');
        setShowAddForm(false);
        resetCardForm();
      } else {
        setError(response.error || 'Failed to add payment method');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!editingMethod) return;

    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.updatePaymentMethod(editingMethod.id, editData);

      if (response.success && response.paymentMethod) {
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === editingMethod.id ? response.paymentMethod! : method
          )
        );
        setSuccess('Payment method updated successfully');
        setEditingMethod(null);
      } else {
        setError(response.error || 'Failed to update payment method');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.deletePaymentMethod(methodId);

      if (response.success) {
        setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
        setSuccess('Payment method deleted successfully');
      } else {
        setError(response.error || 'Failed to delete payment method');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.setDefaultPaymentMethod(methodId);

      if (response.success) {
        setPaymentMethods(prev => 
          prev.map(method => ({
            ...method,
            isDefault: method.id === methodId
          }))
        );
        setSuccess('Default payment method updated');
      } else {
        setError(response.error || 'Failed to set default payment method');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to set default payment method');
    } finally {
      setLoading(false);
    }
  };

  const getCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s+/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6/.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  };

  const resetCardForm = () => {
    setCardData({
      number: '',
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      holderName: '',
      isDefault: false
    });
  };

  const isCardExpired = (method: PaymentMethod): boolean => {
    if (method.type !== 'card' || !method.expiryMonth || !method.expiryYear) {
      return false;
    }

    const now = new Date();
    const expiry = new Date(method.expiryYear, method.expiryMonth - 1);
    return expiry < now;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard size={24} />
              Payment Methods
            </h2>
            <p className="text-blue-100 mt-1">Manage your saved payment methods</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors font-medium"
          >
            <Plus size={16} />
            Add New
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading payment methods...</p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={16} />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={16} />
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Payment Methods List */}
        {!loading && paymentMethods.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="text-gray-400 mx-auto mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payment Methods</h3>
            <p className="text-gray-600 mb-4">Add a payment method to make bookings easier</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Payment Method
            </button>
          </div>
        )}

        {!loading && paymentMethods.length > 0 && (
          <div className="grid gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`border-2 rounded-lg p-4 ${
                  method.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                } ${isCardExpired(method) ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">
                        {paymentService.getPaymentMethodIcon(method.type)}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {paymentService.formatPaymentMethod(method)}
                        </h3>
                        {method.isDefault && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
                            Default
                          </span>
                        )}
                        {isCardExpired(method) && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                            Expired
                          </span>
                        )}
                      </div>
                      
                      {method.type === 'card' && (
                        <div className="text-sm text-gray-600 mt-1">
                          <p>Cardholder: {method.holderName}</p>
                          {method.expiryMonth && method.expiryYear && (
                            <p>
                              Expires: {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Added: {new Date(method.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="p-2 text-gray-600 hover:text-yellow-600 transition-colors"
                        title="Set as default"
                      >
                        <StarOff size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setEditingMethod(method);
                        setEditData({
                          holderName: method.holderName || '',
                          isDefault: method.isDefault
                        });
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    
                    <button
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Payment Method Modal */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Add Payment Method</h3>
                  
                  <div className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={19}
                      />
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        value={cardData.holderName}
                        onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Expiry and CVC */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Month *
                        </label>
                        <input
                          type="text"
                          value={cardData.expiryMonth}
                          onChange={(e) => setCardData(prev => ({ ...prev, expiryMonth: e.target.value.replace(/[^0-9]/g, '').substring(0, 2) }))}
                          placeholder="MM"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year *
                        </label>
                        <input
                          type="text"
                          value={cardData.expiryYear}
                          onChange={(e) => setCardData(prev => ({ ...prev, expiryYear: e.target.value.replace(/[^0-9]/g, '').substring(0, 4) }))}
                          placeholder="YYYY"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVC *
                        </label>
                        <div className="relative">
                          <input
                            type={showCardDetails ? 'text' : 'password'}
                            value={cardData.cvc}
                            onChange={(e) => setCardData(prev => ({ ...prev, cvc: e.target.value.replace(/[^0-9]/g, '').substring(0, 4) }))}
                            placeholder="123"
                            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            maxLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCardDetails(!showCardDetails)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCardDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Default Option */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="defaultMethod"
                        checked={cardData.isDefault}
                        onChange={(e) => setCardData(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <label htmlFor="defaultMethod" className="text-sm text-gray-700">
                        Set as default payment method
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        resetCardForm();
                        setError(null);
                      }}
                      className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPaymentMethod}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Add Method
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Payment Method Modal */}
        <AnimatePresence>
          {editingMethod && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Payment Method</h3>
                  
                  <div className="space-y-4">
                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={editData.holderName}
                        onChange={(e) => setEditData(prev => ({ ...prev, holderName: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Default Option */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editDefaultMethod"
                        checked={editData.isDefault}
                        onChange={(e) => setEditData(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <label htmlFor="editDefaultMethod" className="text-sm text-gray-700">
                        Set as default payment method
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setEditingMethod(null);
                        setError(null);
                      }}
                      className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdatePaymentMethod}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Security & Privacy</p>
              <p>
                Your payment information is encrypted and stored securely. We never store your complete 
                card details and use industry-standard security measures to protect your data.
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodManager;
/**
 * BookingCancellation - Component for canceling bookings
 * Features refund calculation, cancellation policies, and confirmation flow
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  AlertTriangle,
  DollarSign,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  Loader,
  RefreshCw,
  CreditCard,
  FileText
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types/booking-types';

interface BookingCancellationProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
  className?: string;
}

interface CancellationDetails {
  canCancel: boolean;
  refundAmount: number;
  cancellationFee: number;
  refundPercentage: number;
  deadline: string | null;
  policy: string;
  processingTime: string;
}

export const BookingCancellation: React.FC<BookingCancellationProps> = ({
  booking,
  onClose,
  onSuccess,
  className = ''
}) => {
  const [step, setStep] = useState<'policy' | 'reason' | 'confirm' | 'success'>('policy');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cancellationDetails, setCancellationDetails] = useState<CancellationDetails | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [refundResult, setRefundResult] = useState<{ refundAmount: number; cancellationFee: number } | null>(null);

  const cancellationReasons = [
    'Change in travel plans',
    'Emergency situation',
    'Found better accommodation',
    'Property not as described',
    'Host communication issues',
    'Safety concerns',
    'Weather/natural disaster',
    'Health reasons',
    'Work/business conflict',
    'Other (please specify)'
  ];

  useEffect(() => {
    calculateCancellationDetails();
  }, []);

  const calculateCancellationDetails = () => {
    setLoading(true);
    
    // Simulate API call to get cancellation details
    setTimeout(() => {
      const checkInDate = new Date(booking.checkInDate);
      const now = new Date();
      const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      let refundPercentage = 0;
      let cancellationFee = 0;
      let policy = '';
      let deadline = null;
      
      // Mock cancellation policy logic
      if (hoursUntilCheckIn > 168) { // More than 7 days
        refundPercentage = 100;
        policy = 'Free cancellation - Full refund';
      } else if (hoursUntilCheckIn > 48) { // 2-7 days
        refundPercentage = 50;
        cancellationFee = booking.totalAmount * 0.1; // 10% cancellation fee
        policy = 'Partial refund - 50% of booking amount minus cancellation fee';
      } else if (hoursUntilCheckIn > 24) { // 1-2 days
        refundPercentage = 25;
        cancellationFee = booking.totalAmount * 0.15; // 15% cancellation fee
        policy = 'Limited refund - 25% of booking amount minus cancellation fee';
      } else { // Less than 24 hours
        refundPercentage = 0;
        cancellationFee = 0;
        policy = 'No refund - Within 24 hours of check-in';
      }
      
      const baseRefund = booking.totalAmount * (refundPercentage / 100);
      const finalRefund = Math.max(0, baseRefund - cancellationFee);
      
      setCancellationDetails({
        canCancel: bookingService.canCancelBooking(booking),
        refundAmount: finalRefund,
        cancellationFee,
        refundPercentage,
        deadline: hoursUntilCheckIn > 24 ? checkInDate.toISOString() : null,
        policy,
        processingTime: '3-5 business days'
      });
      
      setLoading(false);
    }, 1000);
  };

  const handleCancellation = async () => {
    if (!selectedReason || (selectedReason === 'Other (please specify)' && !customReason.trim())) {
      setError('Please select a reason for cancellation');
      return;
    }

    if (!agreedToPolicy) {
      setError('Please agree to the cancellation policy');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const reason = selectedReason === 'Other (please specify)' ? customReason : selectedReason;
      const response = await bookingService.cancelBooking(booking.id, reason);

      if (response.success) {
        setRefundResult(response.data);
        setStep('success');
      } else {
        setError(response.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while canceling the booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getRefundColor = (amount: number) => {
    if (amount === booking.totalAmount) return 'text-green-600';
    if (amount > booking.totalAmount * 0.5) return 'text-yellow-600';
    if (amount > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <XCircle size={24} />
                Cancel Booking
              </h2>
              <p className="text-red-100 mt-1">{booking.itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-red-600" size={32} />
              <span className="ml-3 text-lg text-gray-600">Calculating refund...</span>
            </div>
          ) : step === 'policy' && cancellationDetails ? (
            <div className="p-6 space-y-6">
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Check-in:</span>
                    <p className="font-medium">{formatDate(booking.checkInDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-out:</span>
                    <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Confirmation:</span>
                    <p className="font-medium">{booking.confirmationCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Paid:</span>
                    <p className="font-medium">${booking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Cancellation Policy</h3>
                </div>
                <p className="text-gray-700 mb-4">{cancellationDetails.policy}</p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <DollarSign className={`mx-auto mb-2 ${getRefundColor(cancellationDetails.refundAmount)}`} size={24} />
                      <p className="text-sm text-gray-600">Refund Amount</p>
                      <p className={`text-lg font-bold ${getRefundColor(cancellationDetails.refundAmount)}`}>
                        ${cancellationDetails.refundAmount.toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <Clock className="mx-auto text-purple-600 mb-2" size={24} />
                      <p className="text-sm text-gray-600">Processing Time</p>
                      <p className="text-lg font-bold text-purple-600">{cancellationDetails.processingTime}</p>
                    </div>
                    
                    <div>
                      <CreditCard className="mx-auto text-green-600 mb-2" size={24} />
                      <p className="text-sm text-gray-600">Refund Method</p>
                      <p className="text-lg font-bold text-green-600">Original Payment</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {(cancellationDetails.cancellationFee > 0 || cancellationDetails.refundPercentage < 100) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-3">Refund Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Original booking amount:</span>
                      <span className="font-medium">${booking.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Refund percentage:</span>
                      <span className="font-medium">{cancellationDetails.refundPercentage}%</span>
                    </div>
                    {cancellationDetails.cancellationFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Cancellation fee:</span>
                        <span className="font-medium text-red-600">
                          -${cancellationDetails.cancellationFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total refund:</span>
                      <span className={getRefundColor(cancellationDetails.refundAmount)}>
                        ${cancellationDetails.refundAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Important Notes */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-2">Important Information:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cancellation is final and cannot be undone</li>
                      <li>Refunds are processed to your original payment method</li>
                      <li>Processing time may vary depending on your bank</li>
                      <li>You will receive a cancellation confirmation email</li>
                      {cancellationDetails.deadline && (
                        <li>Free cancellation deadline: {formatDate(cancellationDetails.deadline)}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {!cancellationDetails.canCancel && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                  <XCircle className="mx-auto text-gray-500 mb-2" size={32} />
                  <h4 className="font-semibold text-gray-700 mb-2">Cancellation Not Available</h4>
                  <p className="text-gray-600">
                    This booking cannot be cancelled at this time. Please contact support for assistance.
                  </p>
                </div>
              )}
            </div>
          ) : step === 'reason' ? (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Why are you cancelling this booking?
                </h3>
                <p className="text-gray-600 mb-6">
                  Please help us understand your reason for cancellation. This information helps us improve our service.
                </p>
              </div>

              <div className="space-y-3">
                {cancellationReasons.map((reason) => (
                  <label key={reason} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="flex-1">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other (please specify)' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify your reason:
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Please provide more details..."
                  />
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreedToPolicy}
                    onChange={(e) => setAgreedToPolicy(e.target.checked)}
                    className="mt-1 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">
                    I understand and agree to the cancellation policy and refund terms outlined above. 
                    I acknowledge that this cancellation is final and cannot be reversed.
                  </span>
                </label>
              </div>
            </div>
          ) : step === 'confirm' ? (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Cancellation</h3>
                <p className="text-gray-600">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Cancellation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking:</span>
                    <span className="font-medium">{booking.itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmation Code:</span>
                    <span className="font-medium">{booking.confirmationCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reason:</span>
                    <span className="font-medium">
                      {selectedReason === 'Other (please specify)' ? customReason : selectedReason}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refund Amount:</span>
                    <span className={`font-bold ${getRefundColor(cancellationDetails?.refundAmount || 0)}`}>
                      ${cancellationDetails?.refundAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : step === 'success' && refundResult ? (
            <div className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Cancelled Successfully</h3>
                <p className="text-gray-600">
                  Your booking has been cancelled and a refund of ${refundResult.refundAmount.toLocaleString()} 
                  has been initiated.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• You'll receive a cancellation confirmation email</p>
                  <p>• Refund will be processed within 3-5 business days</p>
                  <p>• The booking will be removed from your dashboard</p>
                  <p>• Your host will be notified of the cancellation</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.open('/support', '_blank')}
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  Contact Support
                </button>
                <button
                  onClick={onSuccess}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {step !== 'success' && !loading && (
          <div className="border-t border-gray-200 p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={step === 'policy' ? onClose : () => setStep(step === 'confirm' ? 'reason' : 'policy')}
                className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {step === 'policy' ? 'Keep Booking' : 'Back'}
              </button>
              
              {cancellationDetails?.canCancel && (
                <button
                  onClick={() => {
                    if (step === 'policy') setStep('reason');
                    else if (step === 'reason') setStep('confirm');
                    else handleCancellation();
                  }}
                  disabled={
                    (step === 'reason' && (!selectedReason || (selectedReason === 'Other (please specify)' && !customReason.trim()) || !agreedToPolicy)) ||
                    submitting
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting && <Loader className="animate-spin" size={16} />}
                  {step === 'policy' ? 'Continue to Cancel' : 
                   step === 'reason' ? 'Review Cancellation' : 
                   'Confirm Cancellation'}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default BookingCancellation;
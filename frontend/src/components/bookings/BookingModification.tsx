/**
 * BookingModification - Component for modifying existing bookings
 * Features date changes, guest count updates, and cost calculations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  Info,
  Loader,
  ArrowRight,
  Edit3,
  Save,
  RefreshCw
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingModification as BookingMod } from '../../types/booking-types';

interface BookingModificationProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
  className?: string;
}

interface ModificationCosts {
  originalAmount: number;
  newAmount: number;
  difference: number;
  additionalFees: number;
  refundAmount: number;
  isUpgrade: boolean;
}

export const BookingModification: React.FC<BookingModificationProps> = ({
  booking,
  onClose,
  onSuccess,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'modify' | 'review' | 'confirm'>('modify');

  // Form state
  const [newCheckInDate, setNewCheckInDate] = useState(booking.checkInDate.split('T')[0]);
  const [newCheckOutDate, setNewCheckOutDate] = useState(booking.checkOutDate.split('T')[0]);
  const [newAdults, setNewAdults] = useState(booking.guests.adults);
  const [newChildren, setNewChildren] = useState(booking.guests.children);
  const [newInfants, setNewInfants] = useState(booking.guests.infants || 0);
  const [newSpecialRequests, setNewSpecialRequests] = useState(booking.specialRequests || '');
  const [reason, setReason] = useState('');
  
  // Cost calculation
  const [modificationCosts, setModificationCosts] = useState<ModificationCosts | null>(null);
  const [calculatingCosts, setCalculatingCosts] = useState(false);

  // Validation
  const [dateError, setDateError] = useState<string | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    validateDates();
  }, [newCheckInDate, newCheckOutDate]);

  useEffect(() => {
    validateGuests();
  }, [newAdults, newChildren, newInfants]);

  useEffect(() => {
    if (hasChanges() && !dateError && !guestError) {
      calculateModificationCosts();
    }
  }, [newCheckInDate, newCheckOutDate, newAdults, newChildren, newInfants]);

  const validateDates = () => {
    const checkIn = new Date(newCheckInDate);
    const checkOut = new Date(newCheckOutDate);
    const today = new Date();
    
    if (checkIn < today) {
      setDateError('Check-in date cannot be in the past');
      return;
    }
    
    if (checkOut <= checkIn) {
      setDateError('Check-out date must be after check-in date');
      return;
    }

    // Check minimum stay (assuming 1 night minimum)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      setDateError('Minimum stay is 1 night');
      return;
    }

    setDateError(null);
  };

  const validateGuests = () => {
    if (newAdults < 1) {
      setGuestError('At least 1 adult is required');
      return;
    }

    const totalGuests = newAdults + newChildren + newInfants;
    if (totalGuests > 10) { // Assuming max 10 guests
      setGuestError('Maximum 10 guests allowed');
      return;
    }

    setGuestError(null);
  };

  const hasChanges = () => {
    return (
      newCheckInDate !== booking.checkInDate.split('T')[0] ||
      newCheckOutDate !== booking.checkOutDate.split('T')[0] ||
      newAdults !== booking.guests.adults ||
      newChildren !== booking.guests.children ||
      newInfants !== (booking.guests.infants || 0) ||
      newSpecialRequests !== (booking.specialRequests || '')
    );
  };

  const calculateModificationCosts = async () => {
    try {
      setCalculatingCosts(true);
      
      // Simulate cost calculation (in real app, this would be an API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const originalNights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
      const newNights = Math.ceil((new Date(newCheckOutDate).getTime() - new Date(newCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
      
      const originalGuestCount = booking.guests.adults + booking.guests.children;
      const newGuestCount = newAdults + newChildren;
      
      // Mock calculation
      const baseRatePerNight = booking.baseAmount / originalNights;
      const guestMultiplier = newGuestCount / originalGuestCount;
      
      const newBaseAmount = baseRatePerNight * newNights * guestMultiplier;
      const newTotalAmount = newBaseAmount + booking.serviceFee + booking.taxes;
      
      const difference = newTotalAmount - booking.totalAmount;
      const additionalFees = Math.abs(difference) * 0.1; // 10% modification fee
      
      setModificationCosts({
        originalAmount: booking.totalAmount,
        newAmount: newTotalAmount,
        difference: Math.abs(difference),
        additionalFees,
        refundAmount: difference < 0 ? Math.abs(difference) - additionalFees : 0,
        isUpgrade: difference > 0
      });
    } catch (error) {
      console.error('Error calculating modification costs:', error);
    } finally {
      setCalculatingCosts(false);
    }
  };

  const handleSubmit = async () => {
    if (dateError || guestError || !reason.trim()) {
      setError('Please fix all errors and provide a reason for modification');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const modification: BookingMod = {
        newCheckInDate: newCheckInDate !== booking.checkInDate.split('T')[0] ? newCheckInDate : undefined,
        newCheckOutDate: newCheckOutDate !== booking.checkOutDate.split('T')[0] ? newCheckOutDate : undefined,
        newGuests: (newAdults !== booking.guests.adults || newChildren !== booking.guests.children || newInfants !== (booking.guests.infants || 0)) 
          ? { adults: newAdults, children: newChildren, infants: newInfants }
          : undefined,
        newSpecialRequests: newSpecialRequests !== (booking.specialRequests || '') ? newSpecialRequests : undefined,
        reason,
        additionalFees: modificationCosts?.additionalFees
      };

      const response = await bookingService.modifyBooking(booking.id, modification);
      
      if (response.success) {
        onSuccess();
      } else {
        setError(response.message || 'Failed to modify booking');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while modifying the booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return nights;
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
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Edit3 size={24} />
                Modify Booking
              </h2>
              <p className="text-orange-100 mt-1">{booking.itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[
              { id: 'modify', label: 'Modify Details' },
              { id: 'review', label: 'Review Changes' },
              { id: 'confirm', label: 'Confirm' }
            ].map((stepItem, index) => (
              <div key={stepItem.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepItem.id
                    ? 'bg-orange-500 text-white'
                    : step === 'review' && stepItem.id === 'modify'
                    ? 'bg-green-500 text-white'
                    : step === 'confirm' && (stepItem.id === 'modify' || stepItem.id === 'review')
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step === 'review' && stepItem.id === 'modify' ? '✓' :
                   step === 'confirm' && (stepItem.id === 'modify' || stepItem.id === 'review') ? '✓' :
                   index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step === stepItem.id ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {stepItem.label}
                </span>
                {index < 2 && (
                  <ArrowRight className="mx-4 text-gray-400" size={16} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'modify' && (
            <div className="p-6 space-y-6">
              {/* Current booking info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Current Booking</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Check-in:</span>
                    <p className="font-medium">{formatDate(booking.checkInDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-out:</span>
                    <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Guests:</span>
                    <p className="font-medium">
                      {booking.guests.adults} adults, {booking.guests.children} children
                      {booking.guests.infants ? `, ${booking.guests.infants} infants` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <p className="font-medium">${booking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Modification form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">New Details</h3>
                
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} className="inline mr-1" />
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={newCheckInDate}
                      onChange={(e) => setNewCheckInDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} className="inline mr-1" />
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      value={newCheckOutDate}
                      onChange={(e) => setNewCheckOutDate(e.target.value)}
                      min={newCheckInDate}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {dateError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">{dateError}</span>
                    </div>
                  </div>
                )}

                {/* Guests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users size={16} className="inline mr-1" />
                    Guests
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Adults</label>
                      <select
                        value={newAdults}
                        onChange={(e) => setNewAdults(parseInt(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Children (2-12)</label>
                      <select
                        value={newChildren}
                        onChange={(e) => setNewChildren(parseInt(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {[0, 1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Infants (Under 2)</label>
                      <select
                        value={newInfants}
                        onChange={(e) => setNewInfants(parseInt(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {[0, 1, 2, 3].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {guestError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">{guestError}</span>
                    </div>
                  </div>
                )}

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={newSpecialRequests}
                    onChange={(e) => setNewSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Any special requests or notes..."
                  />
                </div>

                {/* Reason for modification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Modification *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Please explain why you need to modify this booking..."
                  />
                </div>

                {/* Cost calculation */}
                {hasChanges() && !dateError && !guestError && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="text-blue-600" size={20} />
                      <h4 className="font-semibold text-blue-900">Cost Calculation</h4>
                    </div>
                    
                    {calculatingCosts ? (
                      <div className="flex items-center gap-2 text-blue-700">
                        <Loader className="animate-spin" size={16} />
                        <span>Calculating costs...</span>
                      </div>
                    ) : modificationCosts && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Original booking amount:</span>
                          <span className="font-medium">${modificationCosts.originalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>New booking amount:</span>
                          <span className="font-medium">${modificationCosts.newAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Modification fee:</span>
                          <span className="font-medium">${modificationCosts.additionalFees.toLocaleString()}</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between text-base font-bold">
                          {modificationCosts.isUpgrade ? (
                            <>
                              <span className="text-red-700">Additional payment:</span>
                              <span className="text-red-700">
                                +${(modificationCosts.difference + modificationCosts.additionalFees).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-green-700">Refund amount:</span>
                              <span className="text-green-700">
                                ${modificationCosts.refundAmount.toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'review' && modificationCosts && (
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Your Changes</h3>
              
              {/* Changes summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Summary of Changes</h4>
                
                {newCheckInDate !== booking.checkInDate.split('T')[0] && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-in date:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-gray-500">{formatDate(booking.checkInDate)}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-medium">{formatDate(newCheckInDate)}</span>
                    </div>
                  </div>
                )}
                
                {newCheckOutDate !== booking.checkOutDate.split('T')[0] && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-out date:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-gray-500">{formatDate(booking.checkOutDate)}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-medium">{formatDate(newCheckOutDate)}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-500">
                      {calculateNights(booking.checkInDate, booking.checkOutDate)} nights
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span className="font-medium">
                      {calculateNights(newCheckInDate, newCheckOutDate)} nights
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-500">
                      {booking.guests.adults + booking.guests.children} guests
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span className="font-medium">
                      {newAdults + newChildren} guests
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Financial Impact</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original total:</span>
                    <span>${modificationCosts.originalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New total:</span>
                    <span>${modificationCosts.newAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modification fee:</span>
                    <span>${modificationCosts.additionalFees.toLocaleString()}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-base font-bold">
                    {modificationCosts.isUpgrade ? (
                      <>
                        <span className="text-red-700">You pay:</span>
                        <span className="text-red-700">
                          +${(modificationCosts.difference + modificationCosts.additionalFees).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-700">You receive:</span>
                        <span className="text-green-700">
                          ${modificationCosts.refundAmount.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Important notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Changes are subject to availability</li>
                      <li>Modification fees are non-refundable</li>
                      <li>You may modify your booking up to 48 hours before check-in</li>
                      <li>Payment/refund will be processed within 3-5 business days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Modification Submitted!</h3>
                <p className="text-gray-600">
                  Your booking modification request has been submitted successfully. 
                  You will receive a confirmation email shortly.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Your host will review and confirm the changes</p>
                  <p>• You'll receive email notifications about the status</p>
                  <p>• Payment/refund will be processed automatically once approved</p>
                  <p>• Updated booking details will appear in your dashboard</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
              onClick={onClose}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              {step === 'confirm' ? 'Close' : 'Cancel'}
            </button>
            
            {step !== 'confirm' && (
              <div className="flex gap-3">
                {step === 'review' && (
                  <button
                    onClick={() => setStep('modify')}
                    className="px-6 py-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors font-medium"
                  >
                    Back to Edit
                  </button>
                )}
                
                <button
                  onClick={step === 'modify' ? () => setStep('review') : handleSubmit}
                  disabled={
                    (step === 'modify' && (!hasChanges() || !!dateError || !!guestError || !reason.trim())) ||
                    submitting
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting && <Loader className="animate-spin" size={16} />}
                  {step === 'modify' ? 'Review Changes' : 'Confirm Modification'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingModification;
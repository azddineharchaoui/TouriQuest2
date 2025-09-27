/**
 * BookingForm - Comprehensive booking form for property reservations
 * Connected to POST /api/v1/properties/{id}/book
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import {
  X,
  CreditCard,
  Shield,
  Users,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Star,
  Phone,
  Mail,
  User,
  FileText,
  Lock
} from 'lucide-react';

interface BookingFormProps {
  property: Property;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  onClose: () => void;
  onBookingComplete: (booking: any) => void;
}

interface BookingData {
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    specialRequests?: string;
  };
  paymentDetails: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    billingAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  agreementAccepted: boolean;
  cancellationPolicyAccepted: boolean;
}

interface PricingBreakdown {
  basePrice: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  property,
  checkIn,
  checkOut,
  guests,
  onClose,
  onBookingComplete
}) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  
  const [bookingData, setBookingData] = useState<BookingData>({
    guestDetails: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      specialRequests: ''
    },
    paymentDetails: {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      }
    },
    agreementAccepted: false,
    cancellationPolicyAccepted: false
  });

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    fetchPricing();
  }, [property.id, checkIn, checkOut, guests]);

  const fetchPricing = async () => {
    try {
      const response = await propertyService.getPropertyPricing(property.id, {
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests
      });
      
      const pricingData = response.data;
      setPricing({
        basePrice: pricingData.basePrice || property.pricing.basePrice,
        nights,
        subtotal: (pricingData.basePrice || property.pricing.basePrice) * nights,
        cleaningFee: pricingData.cleaningFee || property.pricing.cleaningFee || 0,
        serviceFee: pricingData.serviceFee || property.pricing.serviceFee || 0,
        taxes: pricingData.taxes || property.pricing.taxes || 0,
        total: pricingData.total || 0
      });
    } catch (err: any) {
      // Fallback pricing calculation
      const basePrice = property.pricing.basePrice;
      const subtotal = basePrice * nights;
      const cleaningFee = property.pricing.cleaningFee || 0;
      const serviceFee = property.pricing.serviceFee || Math.round(subtotal * 0.1);
      const taxes = property.pricing.taxes || Math.round(subtotal * 0.08);
      const total = subtotal + cleaningFee + serviceFee + taxes;
      
      setPricing({
        basePrice,
        nights,
        subtotal,
        cleaningFee,
        serviceFee,
        taxes,
        total
      });
    }
  };

  const updateGuestDetails = (field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      guestDetails: {
        ...prev.guestDetails,
        [field]: value
      }
    }));
  };

  const updatePaymentDetails = (field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        [field]: value
      }
    }));
  };

  const updateBillingAddress = (field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        billingAddress: {
          ...prev.paymentDetails.billingAddress,
          [field]: value
        }
      }
    }));
  };

  const validateGuestDetails = () => {
    const { firstName, lastName, email, phone, country } = bookingData.guestDetails;
    return firstName && lastName && email && phone && country;
  };

  const validatePaymentDetails = () => {
    const { cardNumber, expiryDate, cvv, cardholderName, billingAddress } = bookingData.paymentDetails;
    return (
      cardNumber.length >= 16 &&
      expiryDate &&
      cvv.length >= 3 &&
      cardholderName &&
      billingAddress.street &&
      billingAddress.city &&
      billingAddress.postalCode &&
      billingAddress.country
    );
  };

  const handleNextStep = () => {
    if (currentStep === 'details' && validateGuestDetails()) {
      setCurrentStep('payment');
    } else if (currentStep === 'payment' && validatePaymentDetails() && bookingData.agreementAccepted) {
      handleSubmitBooking();
    }
  };

  const handleSubmitBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const bookingRequest = {
        propertyId: property.id,
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests,
        guestDetails: bookingData.guestDetails,
        paymentDetails: {
          // In real implementation, this would be tokenized
          cardNumber: bookingData.paymentDetails.cardNumber.slice(-4),
          cardholderName: bookingData.paymentDetails.cardholderName
        },
        totalAmount: pricing?.total || 0,
        currency: property.pricing.currency
      };
      
      const response = await propertyService.bookProperty(property.id, bookingRequest);
      
      setCurrentStep('confirmation');
      
      // Simulate delay for confirmation
      setTimeout(() => {
        onBookingComplete(response.data);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: property.pricing.currency || 'USD'
    }).format(amount);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {currentStep === 'details' && 'Guest Details'}
              {currentStep === 'payment' && 'Payment Information'}
              {currentStep === 'confirmation' && 'Booking Confirmation'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Details Step */}
            {currentStep === 'details' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Guest Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={bookingData.guestDetails.firstName}
                      onChange={(e) => updateGuestDetails('firstName', e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={bookingData.guestDetails.lastName}
                      onChange={(e) => updateGuestDetails('lastName', e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={bookingData.guestDetails.email}
                      onChange={(e) => updateGuestDetails('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={bookingData.guestDetails.phone}
                      onChange={(e) => updateGuestDetails('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={bookingData.guestDetails.country}
                    onChange={(e) => updateGuestDetails('country', e.target.value)}
                    placeholder="Enter country"
                  />
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
                  <Textarea
                    id="specialRequests"
                    value={bookingData.guestDetails.specialRequests}
                    onChange={(e) => updateGuestDetails('specialRequests', e.target.value)}
                    placeholder="Any special requests or requirements..."
                    rows={3}
                  />
                </div>
              </Card>
            )}

            {/* Payment Details Step */}
            {currentStep === 'payment' && (
              <div className="space-y-6">
                {/* Payment Information */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number *</Label>
                      <Input
                        id="cardNumber"
                        value={bookingData.paymentDetails.cardNumber}
                        onChange={(e) => updatePaymentDetails('cardNumber', formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="cardholderName">Cardholder Name *</Label>
                        <Input
                          id="cardholderName"
                          value={bookingData.paymentDetails.cardholderName}
                          onChange={(e) => updatePaymentDetails('cardholderName', e.target.value)}
                          placeholder="Full name on card"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiryDate">Expiry *</Label>
                        <Input
                          id="expiryDate"
                          value={bookingData.paymentDetails.expiryDate}
                          onChange={(e) => updatePaymentDetails('expiryDate', e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          value={bookingData.paymentDetails.cvv}
                          onChange={(e) => updatePaymentDetails('cvv', e.target.value)}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Billing Address */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={bookingData.paymentDetails.billingAddress.street}
                        onChange={(e) => updateBillingAddress('street', e.target.value)}
                        placeholder="Enter street address"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={bookingData.paymentDetails.billingAddress.city}
                          onChange={(e) => updateBillingAddress('city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={bookingData.paymentDetails.billingAddress.state}
                          onChange={(e) => updateBillingAddress('state', e.target.value)}
                          placeholder="Enter state"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={bookingData.paymentDetails.billingAddress.postalCode}
                          onChange={(e) => updateBillingAddress('postalCode', e.target.value)}
                          placeholder="Enter postal code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingCountry">Country *</Label>
                        <Input
                          id="billingCountry"
                          value={bookingData.paymentDetails.billingAddress.country}
                          onChange={(e) => updateBillingAddress('country', e.target.value)}
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Agreements */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Terms & Agreements</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={bookingData.cancellationPolicyAccepted}
                        onChange={(e) => setBookingData(prev => ({ ...prev, cancellationPolicyAccepted: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <span className="font-medium">Cancellation Policy:</span>
                        <p className="text-muted-foreground mt-1">
                          {property.policies.cancellation.description}
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={bookingData.agreementAccepted}
                        onChange={(e) => setBookingData(prev => ({ ...prev, agreementAccepted: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <span className="font-medium">Terms of Service:</span>
                        <p className="text-muted-foreground mt-1">
                          I agree to the Terms of Service and acknowledge that I have read the House Rules and Cancellation Policy.
                        </p>
                      </div>
                    </label>
                  </div>
                </Card>
              </div>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirmation' && (
              <Card className="p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
                <p className="text-muted-foreground mb-4">
                  Your reservation has been successfully processed. You will receive a confirmation email shortly.
                </p>
                {loading && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Processing booking...</span>
                  </div>
                )}
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
          </div>

          {/* Booking Summary Sidebar */}
          <div className="space-y-6">
            {/* Property Info */}
            <Card className="p-4">
              <div className="flex space-x-3">
                {property.photos && property.photos.length > 0 ? (
                  <img
                    src={property.photos[0].url}
                    alt={property.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{property.title}</h4>
                  <div className="flex items-center mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs ml-1">{property.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({property.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Booking Details */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Booking Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Check-in</span>
                  </div>
                  <span>{checkIn.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Check-out</span>
                  </div>
                  <span>{checkOut.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Duration</span>
                  </div>
                  <span>{nights} nights</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Guests</span>
                  </div>
                  <span>{guests} guests</span>
                </div>
              </div>
            </Card>

            {/* Price Breakdown */}
            {pricing && (
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Price Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{formatCurrency(pricing.basePrice)} × {nights} nights</span>
                    <span>{formatCurrency(pricing.subtotal)}</span>
                  </div>
                  {pricing.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span>{formatCurrency(pricing.cleaningFee)}</span>
                    </div>
                  )}
                  {pricing.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span>Service fee</span>
                      <span>{formatCurrency(pricing.serviceFee)}</span>
                    </div>
                  )}
                  {pricing.taxes > 0 && (
                    <div className="flex justify-between">
                      <span>Taxes</span>
                      <span>{formatCurrency(pricing.taxes)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Security Badge */}
            <Card className="p-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center space-x-2">
            {currentStep === 'payment' && (
              <Button variant="outline" onClick={() => setCurrentStep('details')}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {currentStep !== 'confirmation' && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={
                    loading ||
                    (currentStep === 'details' && !validateGuestDetails()) ||
                    (currentStep === 'payment' && (!validatePaymentDetails() || !bookingData.agreementAccepted))
                  }
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {currentStep === 'details' ? 'Continue to Payment' : 'Confirm Booking'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;
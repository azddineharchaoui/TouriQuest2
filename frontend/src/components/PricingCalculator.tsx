/**
 * PricingCalculator - Real-time pricing calculator with dynamic updates
 * Connected to GET /api/v1/properties/{id}/pricing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { propertyService } from '../services/propertyService';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Calculator,
  Calendar,
  Users,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Percent,
  CreditCard,
  Shield
} from 'lucide-react';

interface PricingCalculatorProps {
  property: Property;
  onDateChange?: (checkIn: Date, checkOut: Date) => void;
  onGuestChange?: (guests: number) => void;
  onPricingUpdate?: (pricing: PricingBreakdown) => void;
}

interface PricingBreakdown {
  basePrice: number;
  nights: number;
  subtotal: number;
  discounts: {
    weeklyDiscount: number;
    monthlyDiscount: number;
    earlyBirdDiscount: number;
    lastMinuteDiscount: number;
  };
  fees: {
    cleaningFee: number;
    serviceFee: number;
    petFee: number;
    extraGuestFee: number;
  };
  taxes: {
    occupancyTax: number;
    cityTax: number;
    vat: number;
  };
  total: number;
  averageNightlyRate: number;
}

interface SeasonalPricing {
  season: string;
  multiplier: number;
  description: string;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  property,
  onDateChange,
  onGuestChange,
  onPricingUpdate
}) => {
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');
  const [guests, setGuests] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [seasonalInfo, setSeasonalInfo] = useState<SeasonalPricing | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate nights between dates
  const calculateNights = useCallback((start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  const nights = calculateNights(checkIn, checkOut);

  // Debounced pricing calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (checkIn && checkOut && nights > 0) {
        calculatePricing();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [checkIn, checkOut, guests, nights]);

  const calculatePricing = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await propertyService.getPropertyPricing(property.id, {
        checkIn,
        checkOut,
        guests
      });

      const pricingData = response.data;
      
      const calculatedPricing: PricingBreakdown = {
        basePrice: pricingData.basePrice || property.pricing.basePrice,
        nights,
        subtotal: (pricingData.basePrice || property.pricing.basePrice) * nights,
        discounts: {
          weeklyDiscount: pricingData.discounts?.weeklyDiscount || 0,
          monthlyDiscount: pricingData.discounts?.monthlyDiscount || 0,
          earlyBirdDiscount: pricingData.discounts?.earlyBirdDiscount || 0,
          lastMinuteDiscount: pricingData.discounts?.lastMinuteDiscount || 0
        },
        fees: {
          cleaningFee: pricingData.fees?.cleaningFee || property.pricing.cleaningFee || 0,
          serviceFee: pricingData.fees?.serviceFee || property.pricing.serviceFee || 0,
          petFee: pricingData.fees?.petFee || 0,
          extraGuestFee: pricingData.fees?.extraGuestFee || 0
        },
        taxes: {
          occupancyTax: pricingData.taxes?.occupancyTax || 0,
          cityTax: pricingData.taxes?.cityTax || 0,
          vat: pricingData.taxes?.vat || 0
        },
        total: 0,
        averageNightlyRate: 0
      };

      // Calculate totals
      const totalDiscounts = Object.values(calculatedPricing.discounts).reduce((sum, discount) => sum + discount, 0);
      const totalFees = Object.values(calculatedPricing.fees).reduce((sum, fee) => sum + fee, 0);
      const totalTaxes = Object.values(calculatedPricing.taxes).reduce((sum, tax) => sum + tax, 0);
      
      calculatedPricing.total = calculatedPricing.subtotal - totalDiscounts + totalFees + totalTaxes;
      calculatedPricing.averageNightlyRate = calculatedPricing.total / nights;

      setPricing(calculatedPricing);
      
      // Set seasonal info
      if (pricingData.seasonalInfo) {
        setSeasonalInfo(pricingData.seasonalInfo);
      } else {
        // Mock seasonal info based on dates
        const month = new Date(checkIn).getMonth();
        if (month >= 5 && month <= 8) {
          setSeasonalInfo({
            season: 'Summer Peak',
            multiplier: 1.3,
            description: 'High demand period with premium pricing'
          });
        } else if (month >= 11 || month <= 2) {
          setSeasonalInfo({
            season: 'Winter Off-Season',
            multiplier: 0.8,
            description: 'Lower demand period with discounted pricing'
          });
        } else {
          setSeasonalInfo({
            season: 'Standard Season',
            multiplier: 1.0,
            description: 'Regular pricing period'
          });
        }
      }

      onPricingUpdate?.(calculatedPricing);

    } catch (err: any) {
      setError('Unable to calculate pricing. Please try again.');
      
      // Fallback calculation
      const basePrice = property.pricing.basePrice;
      const subtotal = basePrice * nights;
      const serviceFee = Math.round(subtotal * 0.1);
      const cleaningFee = property.pricing.cleaningFee || 0;
      const taxes = Math.round(subtotal * 0.08);
      const total = subtotal + serviceFee + cleaningFee + taxes;

      const fallbackPricing: PricingBreakdown = {
        basePrice,
        nights,
        subtotal,
        discounts: {
          weeklyDiscount: nights >= 7 ? Math.round(subtotal * 0.1) : 0,
          monthlyDiscount: nights >= 28 ? Math.round(subtotal * 0.2) : 0,
          earlyBirdDiscount: 0,
          lastMinuteDiscount: 0
        },
        fees: {
          cleaningFee,
          serviceFee,
          petFee: 0,
          extraGuestFee: guests > property.maxGuests ? (guests - property.maxGuests) * 25 : 0
        },
        taxes: {
          occupancyTax: Math.round(subtotal * 0.05),
          cityTax: Math.round(subtotal * 0.02),
          vat: Math.round(subtotal * 0.01)
        },
        total,
        averageNightlyRate: total / nights
      };

      setPricing(fallbackPricing);
      onPricingUpdate?.(fallbackPricing);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (checkIn && checkOut && onDateChange) {
      onDateChange(new Date(checkIn), new Date(checkOut));
    }
  };

  const handleGuestChange = (newGuests: number) => {
    setGuests(Math.max(1, Math.min(newGuests, property.maxGuests + 5)));
    onGuestChange?.(newGuests);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: property.pricing.currency || 'USD'
    }).format(amount);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Pricing Calculator
          </h3>
          {pricing && (
            <Badge variant="secondary" className="text-lg font-semibold">
              {formatCurrency(pricing.total)}
            </Badge>
          )}
        </div>

        {/* Date and Guest Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="checkIn" className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Check-in
            </Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                handleDateChange();
              }}
              min={getMinDate()}
              max={getMaxDate()}
            />
          </div>
          
          <div>
            <Label htmlFor="checkOut" className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Check-out
            </Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                handleDateChange();
              }}
              min={checkIn || getMinDate()}
              max={getMaxDate()}
            />
          </div>
          
          <div>
            <Label htmlFor="guests" className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Guests
            </Label>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGuestChange(guests - 1)}
                disabled={guests <= 1}
              >
                −
              </Button>
              <Input
                id="guests"
                type="number"
                value={guests}
                onChange={(e) => handleGuestChange(parseInt(e.target.value) || 1)}
                min="1"
                max={property.maxGuests + 5}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGuestChange(guests + 1)}
                disabled={guests >= property.maxGuests + 5}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {checkIn && checkOut && nights <= 0 && (
          <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-yellow-700">Check-out date must be after check-in date</span>
          </div>
        )}

        {guests > property.maxGuests && (
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <Info className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-blue-700">
              This property accommodates up to {property.maxGuests} guests. Additional guest fees may apply.
            </span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Calculating pricing...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Pricing Display */}
        {pricing && nights > 0 && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{nights}</div>
                <div className="text-sm text-muted-foreground">Nights</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(pricing.basePrice)}</div>
                <div className="text-sm text-muted-foreground">Per Night</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(pricing.averageNightlyRate)}</div>
                <div className="text-sm text-muted-foreground">Avg/Night</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(pricing.total)}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Seasonal Information */}
            {seasonalInfo && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {seasonalInfo.multiplier > 1 ? (
                      <TrendingUp className="w-5 h-5 text-red-500 mr-2" />
                    ) : seasonalInfo.multiplier < 1 ? (
                      <TrendingDown className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-500 mr-2" />
                    )}
                    <div>
                      <div className="font-medium">{seasonalInfo.season}</div>
                      <div className="text-sm text-muted-foreground">{seasonalInfo.description}</div>
                    </div>
                  </div>
                  <Badge variant={seasonalInfo.multiplier > 1 ? "destructive" : seasonalInfo.multiplier < 1 ? "default" : "secondary"}>
                    {seasonalInfo.multiplier > 1 ? '+' : ''}{((seasonalInfo.multiplier - 1) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            )}

            {/* Basic Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{formatCurrency(pricing.basePrice)} × {nights} nights</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              
              {/* Discounts */}
              {Object.entries(pricing.discounts).map(([key, value]) => {
                if (value > 0) {
                  const labels = {
                    weeklyDiscount: 'Weekly discount',
                    monthlyDiscount: 'Monthly discount',
                    earlyBirdDiscount: 'Early bird discount',
                    lastMinuteDiscount: 'Last minute discount'
                  };
                  return (
                    <div key={key} className="flex justify-between text-green-600">
                      <span>{labels[key as keyof typeof labels]}</span>
                      <span>-{formatCurrency(value)}</span>
                    </div>
                  );
                }
                return null;
              })}

              {/* Fees */}
              {Object.entries(pricing.fees).map(([key, value]) => {
                if (value > 0) {
                  const labels = {
                    cleaningFee: 'Cleaning fee',
                    serviceFee: 'Service fee',
                    petFee: 'Pet fee',
                    extraGuestFee: 'Extra guest fee'
                  };
                  return (
                    <div key={key} className="flex justify-between">
                      <span>{labels[key as keyof typeof labels]}</span>
                      <span>{formatCurrency(value)}</span>
                    </div>
                  );
                }
                return null;
              })}

              {/* Taxes */}
              {Object.entries(pricing.taxes).map(([key, value]) => {
                if (value > 0) {
                  const labels = {
                    occupancyTax: 'Occupancy tax',
                    cityTax: 'City tax',
                    vat: 'VAT'
                  };
                  return (
                    <div key={key} className="flex justify-between text-sm text-muted-foreground">
                      <span>{labels[key as keyof typeof labels]}</span>
                      <span>{formatCurrency(value)}</span>
                    </div>
                  );
                }
                return null;
              })}

              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>

            {/* Detailed Breakdown Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full"
            >
              {showBreakdown ? 'Hide' : 'Show'} Detailed Breakdown
            </Button>

            {/* Detailed Breakdown */}
            {showBreakdown && (
              <Card className="p-4 bg-gray-50">
                <h4 className="font-semibold mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Detailed Pricing Breakdown
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <h5 className="font-medium mb-2">Base Pricing</h5>
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Nightly rate</span>
                        <span>{formatCurrency(pricing.basePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Number of nights</span>
                        <span>{nights}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Subtotal</span>
                        <span>{formatCurrency(pricing.subtotal)}</span>
                      </div>
                    </div>
                  </div>

                  {Object.values(pricing.discounts).some(d => d > 0) && (
                    <div>
                      <h5 className="font-medium mb-2 text-green-600">Discounts Applied</h5>
                      <div className="pl-4 space-y-1">
                        {pricing.discounts.weeklyDiscount > 0 && (
                          <div className="flex justify-between">
                            <span>Weekly discount (7+ nights)</span>
                            <span className="text-green-600">-{formatCurrency(pricing.discounts.weeklyDiscount)}</span>
                          </div>
                        )}
                        {pricing.discounts.monthlyDiscount > 0 && (
                          <div className="flex justify-between">
                            <span>Monthly discount (28+ nights)</span>
                            <span className="text-green-600">-{formatCurrency(pricing.discounts.monthlyDiscount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h5 className="font-medium mb-2">Additional Fees</h5>
                    <div className="pl-4 space-y-1">
                      {pricing.fees.cleaningFee > 0 && (
                        <div className="flex justify-between">
                          <span>Cleaning fee</span>
                          <span>{formatCurrency(pricing.fees.cleaningFee)}</span>
                        </div>
                      )}
                      {pricing.fees.serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>Service fee</span>
                          <span>{formatCurrency(pricing.fees.serviceFee)}</span>
                        </div>
                      )}
                      {pricing.fees.extraGuestFee > 0 && (
                        <div className="flex justify-between">
                          <span>Extra guest fee</span>
                          <span>{formatCurrency(pricing.fees.extraGuestFee)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Taxes & Fees</h5>
                    <div className="pl-4 space-y-1">
                      {Object.entries(pricing.taxes).map(([key, value]) => {
                        if (value > 0) {
                          const labels = {
                            occupancyTax: 'Occupancy tax',
                            cityTax: 'City tax',
                            vat: 'VAT'
                          };
                          return (
                            <div key={key} className="flex justify-between">
                              <span>{labels[key as keyof typeof labels]}</span>
                              <span>{formatCurrency(value)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Price Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm text-blue-700">
                    Great value compared to similar properties
                  </span>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">
                    Free cancellation available
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PricingCalculator;
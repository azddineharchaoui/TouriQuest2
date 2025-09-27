/**
 * BookingManagement - Booking modification and cancellation flows
 * Handles booking status tracking, change requests, and cancellation policies
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
  Calendar,
  Clock,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Shield,
  Info,
  Download,
  Print,
  Share2,
  Star,
  MapPin,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface BookingManagementProps {
  bookingId: string;
  property: Property;
  onBookingUpdate?: (booking: Booking) => void;
}

interface Booking {
  id: string;
  propertyId: string;
  property: {
    title: string;
    address: string;
    photos: string[];
  };
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  dates: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  guests: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'modified';
  pricing: {
    basePrice: number;
    totalAmount: number;
    currency: string;
    breakdown: {
      subtotal: number;
      fees: number;
      taxes: number;
      discounts: number;
    };
  };
  payment: {
    method: string;
    status: 'paid' | 'pending' | 'refunded' | 'partial_refund';
    paidAmount: number;
    refundAmount?: number;
  };
  policies: {
    cancellation: {
      type: 'flexible' | 'moderate' | 'strict';
      description: string;
      refundPercentage: number;
      deadlineHours: number;
    };
    modification: {
      allowed: boolean;
      fee: number;
      restrictions: string[];
    };
  };
  timeline: BookingEvent[];
  createdAt: string;
  updatedAt: string;
}

interface BookingEvent {
  id: string;
  type: 'created' | 'confirmed' | 'modified' | 'cancelled' | 'completed' | 'refunded';
  timestamp: string;
  description: string;
  details?: any;
}

interface ModificationRequest {
  newCheckIn?: string;
  newCheckOut?: string;
  newGuests?: number;
  reason: string;
}

export const BookingManagement: React.FC<BookingManagementProps> = ({
  bookingId,
  property,
  onBookingUpdate
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showCancelModal, setCancelModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Form states
  const [modificationRequest, setModificationRequest] = useState<ModificationRequest>({
    reason: ''
  });
  const [cancellationReason, setCancellationReason] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: true,
    pricing: false,
    policies: false
  });

  // Loading states
  const [modifying, setModifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getBookingDetails(bookingId);
      setBooking(response.data);
      
    } catch (err: any) {
      setError('Failed to load booking details');
      
      // Mock booking data fallback
      const mockBooking: Booking = {
        id: bookingId,
        propertyId: property.id,
        property: {
          title: property.title,
          address: property.address,
          photos: property.photos || []
        },
        guestDetails: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567'
        },
        dates: {
          checkIn: '2024-03-15',
          checkOut: '2024-03-20',
          nights: 5
        },
        guests: 2,
        status: 'confirmed',
        pricing: {
          basePrice: 150,
          totalAmount: 850,
          currency: 'USD',
          breakdown: {
            subtotal: 750,
            fees: 75,
            taxes: 60,
            discounts: 35
          }
        },
        payment: {
          method: 'Credit Card',
          status: 'paid',
          paidAmount: 850
        },
        policies: {
          cancellation: {
            type: 'moderate',
            description: 'Free cancellation until 48 hours before check-in. After that, 50% refund.',
            refundPercentage: 50,
            deadlineHours: 48
          },
          modification: {
            allowed: true,
            fee: 25,
            restrictions: ['Changes must be made at least 24 hours before check-in']
          }
        },
        timeline: [
          {
            id: '1',
            type: 'created',
            timestamp: '2024-01-15T10:30:00Z',
            description: 'Booking created'
          },
          {
            id: '2',
            type: 'confirmed',
            timestamp: '2024-01-15T10:35:00Z',
            description: 'Payment processed and booking confirmed'
          }
        ],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      };
      
      setBooking(mockBooking);
    } finally {
      setLoading(false);
    }
  };

  const handleModifyBooking = async () => {
    if (!booking) return;
    
    try {
      setModifying(true);
      
      const modificationData = {
        bookingId: booking.id,
        modifications: modificationRequest
      };
      
      const response = await propertyService.modifyBooking(modificationData);
      
      setBooking(response.data);
      setShowModifyModal(false);
      setModificationRequest({ reason: '' });
      onBookingUpdate?.(response.data);
      
    } catch (err: any) {
      setError('Failed to modify booking');
    } finally {
      setModifying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    try {
      setCancelling(true);
      
      const cancellationData = {
        bookingId: booking.id,
        reason: cancellationReason
      };
      
      const response = await propertyService.cancelBooking(cancellationData);
      
      setBooking(response.data);
      setCancelModal(false);
      setCancellationReason('');
      onBookingUpdate?.(response.data);
      
    } catch (err: any) {
      setError('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const calculateRefundAmount = () => {
    if (!booking) return 0;
    
    const hoursUntilCheckIn = Math.abs(
      new Date(booking.dates.checkIn).getTime() - new Date().getTime()
    ) / (1000 * 60 * 60);
    
    if (hoursUntilCheckIn >= booking.policies.cancellation.deadlineHours) {
      return booking.pricing.totalAmount;
    } else {
      return booking.pricing.totalAmount * (booking.policies.cancellation.refundPercentage / 100);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getStatusColor = (status: Booking['status']) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      modified: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: Booking['status']) => {
    const icons = {
      confirmed: CheckCircle,
      pending: Clock,
      cancelled: XCircle,
      completed: CheckCircle,
      modified: Edit
    };
    return icons[status] || Info;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading booking details...</span>
        </div>
      </Card>
    );
  }

  if (error || !booking) {
    return (
      <Card className="p-6">
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error || 'Booking not found'}</span>
        </div>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(booking.status);

  return (
    <div className="space-y-6">
      {/* Booking Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-xl font-semibold">Booking #{booking.id.slice(-8).toUpperCase()}</h2>
              <Badge className={getStatusColor(booking.status)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Print className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Property Info */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          {booking.property.photos.length > 0 && (
            <img
              src={booking.property.photos[0]}
              alt={booking.property.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h3 className="font-semibold">{booking.property.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {booking.property.address}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Property
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      {booking.status === 'confirmed' && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => setShowModifyModal(true)}
              disabled={!booking.policies.modification.allowed}
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Edit className="w-4 h-4" />
              <span>Modify Booking</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setCancelModal(true)}
              className="flex items-center justify-center space-x-2 h-12"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Booking</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowContactModal(true)}
              className="flex items-center justify-center space-x-2 h-12"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Host</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Booking Details */}
      <Card className="p-6">
        <button
          onClick={() => toggleSection('details')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="font-semibold">Booking Details</h3>
          {expandedSections.details ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSections.details && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(booking.dates.checkIn).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(booking.dates.checkOut).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{booking.dates.nights} nights</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Guests</span>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{booking.guests} guests</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-muted-foreground block mb-1">Guest</span>
                <span>{booking.guestDetails.firstName} {booking.guestDetails.lastName}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground block mb-1">Email</span>
                <span>{booking.guestDetails.email}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground block mb-1">Phone</span>
                <span>{booking.guestDetails.phone}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground block mb-1">Payment Status</span>
                <Badge className={booking.payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {booking.payment.status.charAt(0).toUpperCase() + booking.payment.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Pricing Breakdown */}
      <Card className="p-6">
        <button
          onClick={() => toggleSection('pricing')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="font-semibold">Pricing Breakdown</h3>
          {expandedSections.pricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSections.pricing ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal ({booking.dates.nights} nights)</span>
              <span>{formatCurrency(booking.pricing.breakdown.subtotal, booking.pricing.currency)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Fees & Services</span>
              <span>{formatCurrency(booking.pricing.breakdown.fees, booking.pricing.currency)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>{formatCurrency(booking.pricing.breakdown.taxes, booking.pricing.currency)}</span>
            </div>
            
            {booking.pricing.breakdown.discounts > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discounts</span>
                <span>-{formatCurrency(booking.pricing.breakdown.discounts, booking.pricing.currency)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(booking.pricing.totalAmount, booking.pricing.currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Paid Amount</span>
              <span>{formatCurrency(booking.payment.paidAmount, booking.pricing.currency)}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between font-semibold">
            <span>Total Amount</span>
            <span>{formatCurrency(booking.pricing.totalAmount, booking.pricing.currency)}</span>
          </div>
        )}
      </Card>

      {/* Policies */}
      <Card className="p-6">
        <button
          onClick={() => toggleSection('policies')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="font-semibold">Policies & Terms</h3>
          {expandedSections.policies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSections.policies && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Cancellation Policy</h4>
              <p className="text-sm text-muted-foreground mb-2">{booking.policies.cancellation.description}</p>
              <div className="text-sm">
                <span className="font-medium">Current refund amount: </span>
                <span className="text-green-600 font-semibold">
                  {formatCurrency(calculateRefundAmount(), booking.pricing.currency)}
                </span>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Modification Policy</h4>
              {booking.policies.modification.allowed ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Modifications allowed with {formatCurrency(booking.policies.modification.fee, booking.pricing.currency)} fee</p>
                  {booking.policies.modification.restrictions.map((restriction, index) => (
                    <p key={index}>• {restriction}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Modifications not allowed for this booking</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Activity</h3>
          <Button variant="outline" size="sm" onClick={() => setShowTimelineModal(true)}>
            View Full Timeline
          </Button>
        </div>
        
        <div className="space-y-3">
          {booking.timeline.slice(-3).map((event) => (
            <div key={event.id} className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modify Booking Modal */}
      <Dialog open={showModifyModal} onOpenChange={setShowModifyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Booking</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Info className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-sm text-yellow-700">
                  Modification fee: {formatCurrency(booking.policies.modification.fee, booking.pricing.currency)}
                </span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="newCheckIn">New Check-in Date</Label>
              <Input
                id="newCheckIn"
                type="date"
                value={modificationRequest.newCheckIn}
                onChange={(e) => setModificationRequest(prev => ({ ...prev, newCheckIn: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="newCheckOut">New Check-out Date</Label>
              <Input
                id="newCheckOut"
                type="date"
                value={modificationRequest.newCheckOut}
                onChange={(e) => setModificationRequest(prev => ({ ...prev, newCheckOut: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="newGuests">Number of Guests</Label>
              <Input
                id="newGuests"
                type="number"
                min="1"
                value={modificationRequest.newGuests}
                onChange={(e) => setModificationRequest(prev => ({ ...prev, newGuests: parseInt(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label htmlFor="modificationReason">Reason for Modification</Label>
              <Textarea
                id="modificationReason"
                value={modificationRequest.reason}
                onChange={(e) => setModificationRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please explain why you need to modify your booking..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowModifyModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleModifyBooking}
                disabled={modifying || !modificationRequest.reason}
              >
                {modifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Modal */}
      <Dialog open={showCancelModal} onOpenChange={setCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm font-medium text-red-700">Cancellation Details</span>
              </div>
              <div className="text-sm text-red-700 space-y-1">
                <p>Refund amount: {formatCurrency(calculateRefundAmount(), booking.pricing.currency)}</p>
                <p>Processing time: 5-7 business days</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="cancellationReason">Reason for Cancellation</Label>
              <Textarea
                id="cancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCancelModal(false)}>
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={cancelling || !cancellationReason}
              >
                {cancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancel Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Host</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12">
                <Phone className="w-4 h-4 mr-2" />
                Call Host
              </Button>
              <Button variant="outline" className="h-12">
                <Mail className="w-4 h-4 mr-2" />
                Email Host
              </Button>
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message to the host..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowContactModal(false)}>
                Cancel
              </Button>
              <Button>
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeline Modal */}
      <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Timeline</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {booking.timeline.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{event.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  {event.details && (
                    <p className="text-sm text-gray-600 mt-1">{JSON.stringify(event.details)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
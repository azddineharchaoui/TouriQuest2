/**
 * BookingDetails - Comprehensive booking detail modal with all information
 * Features detailed view, timeline, documents, and management options
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Clock,
  Phone,
  Mail,
  Star,
  Download,
  Share2,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Navigation,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Waves,
  UtensilsCrossed,
  Shield,
  MessageSquare,
  Camera,
  FileText,
  QrCode,
  Bell,
  Info,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingStatus } from '../../types/booking-types';

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  className?: string;
}

export const BookingDetails: React.FC<BookingDetailsProps> = ({
  booking,
  onClose,
  className = ''
}) => {
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'documents' | 'host'>('details');
  const [showCheckInInfo, setShowCheckInInfo] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    loadBookingStatus();
  }, [booking.id]);

  const loadBookingStatus = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getBookingStatus(booking.id);
      if (response.success) {
        setBookingStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading booking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      await bookingService.downloadInvoice(booking.id);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi')) return <Wifi size={16} className="text-blue-500" />;
    if (amenityLower.includes('parking')) return <Car size={16} className="text-green-500" />;
    if (amenityLower.includes('coffee')) return <Coffee size={16} className="text-yellow-600" />;
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return <Dumbbell size={16} className="text-red-500" />;
    if (amenityLower.includes('pool') || amenityLower.includes('swimming')) return <Waves size={16} className="text-blue-400" />;
    if (amenityLower.includes('kitchen') || amenityLower.includes('restaurant')) return <UtensilsCrossed size={16} className="text-orange-500" />;
    return <CheckCircle size={16} className="text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const calculateNights = () => {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
        className={`bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{booking.itemName}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
              <p className="text-blue-100 mb-1">Confirmation Code: {booking.confirmationCode}</p>
              <p className="text-blue-100 text-sm">
                Booked on {new Date(booking.bookingDate).toLocaleDateString()}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {[
              { id: 'details', label: 'Details', icon: Info },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'host', label: 'Host', icon: MessageSquare }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              {/* Main Information */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Image Gallery */}
                {booking.itemImages.length > 0 && (
                  <div className="lg:col-span-1">
                    <img
                      src={booking.itemImages[0]}
                      alt={booking.itemName}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {booking.itemImages.length > 1 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {booking.itemImages.slice(1, 4).map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt=""
                            className="w-full h-16 object-cover rounded-md"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Information */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="text-blue-500" size={20} />
                        <h4 className="font-semibold text-gray-900">Check-in</h4>
                      </div>
                      <p className="text-lg font-medium">{formatDate(booking.checkInDate)}</p>
                      {booking.propertyInfo && (
                        <p className="text-sm text-gray-600">
                          After {formatTime(booking.propertyInfo.checkInTime)}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="text-red-500" size={20} />
                        <h4 className="font-semibold text-gray-900">Check-out</h4>
                      </div>
                      <p className="text-lg font-medium">{formatDate(booking.checkOutDate)}</p>
                      {booking.propertyInfo && (
                        <p className="text-sm text-gray-600">
                          Before {formatTime(booking.propertyInfo.checkOutTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <Users className="mx-auto text-blue-500 mb-2" size={24} />
                      <p className="font-semibold text-gray-900">
                        {booking.guests.adults + booking.guests.children}
                      </p>
                      <p className="text-sm text-gray-600">Guests</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <Clock className="mx-auto text-green-500 mb-2" size={24} />
                      <p className="font-semibold text-gray-900">{calculateNights()}</p>
                      <p className="text-sm text-gray-600">Nights</p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <CreditCard className="mx-auto text-purple-500 mb-2" size={24} />
                      <p className="font-semibold text-gray-900">${booking.totalAmount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{booking.currency}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              {booking.propertyInfo && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin size={20} />
                    Location & Access
                  </h4>
                  <p className="text-gray-700 mb-3">{booking.propertyInfo.address}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                      <Navigation size={14} />
                      Get Directions
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
                      <QrCode size={14} />
                      Digital Key
                    </button>
                  </div>

                  {booking.propertyInfo.checkInInstructions && (
                    <div 
                      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer"
                      onClick={() => setShowCheckInInfo(!showCheckInInfo)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Check-in Instructions</span>
                        {showCheckInInfo ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <AnimatePresence>
                        {showCheckInInfo && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 text-sm text-gray-700"
                          >
                            {booking.propertyInfo.checkInInstructions}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* Amenities */}
              {booking.propertyInfo?.amenities && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Amenities</h4>
                    {booking.propertyInfo.amenities.length > 6 && (
                      <button
                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                        className="text-blue-600 text-sm font-medium"
                      >
                        {showAllAmenities ? 'Show Less' : 'Show All'}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(showAllAmenities ? booking.propertyInfo.amenities : booking.propertyInfo.amenities.slice(0, 6))
                      .map((amenity, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                          {getAmenityIcon(amenity)}
                          <span className="text-sm font-medium text-gray-700">{amenity}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {booking.specialRequests && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Special Requests</h4>
                  <p className="text-gray-700">{booking.specialRequests}</p>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Pricing Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Base amount</span>
                    <span className="font-medium">${booking.baseAmount.toLocaleString()}</span>
                  </div>
                  {booking.cleaningFee && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Cleaning fee</span>
                      <span className="font-medium">${booking.cleaningFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-700">Service fee</span>
                    <span className="font-medium">${booking.serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Taxes</span>
                    <span className="font-medium">${booking.taxes.toLocaleString()}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${booking.totalAmount.toLocaleString()} {booking.currency}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Download size={16} />
                  Download Invoice
                </button>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <Share2 size={16} />
                  Share Booking
                </button>
                
                {bookingService.canModifyBooking(booking) && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium">
                    <Edit3 size={16} />
                    Modify Booking
                  </button>
                )}
                
                {bookingService.canCancelBooking(booking) && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                    <Trash2 size={16} />
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && bookingStatus && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Timeline</h3>
              <div className="space-y-4">
                {bookingStatus.timeline.map((update, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 capitalize">{update.status}</p>
                        <span className="text-sm text-gray-500">
                          {new Date(update.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{update.description}</p>
                      <p className="text-gray-500 text-xs">Updated by {update.updatedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents & Files</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-500" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Booking Invoice</p>
                      <p className="text-sm text-gray-600">PDF • Generated {new Date(booking.bookingDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadInvoice}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <QrCode className="text-green-500" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Digital Check-in Code</p>
                      <p className="text-sm text-gray-600">QR Code for property access</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
                    View Code
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="text-purple-500" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Terms & Conditions</p>
                      <p className="text-sm text-gray-600">Booking terms and cancellation policy</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                    Read
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'host' && booking.hostInfo && (
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-6">
                  {booking.hostInfo.avatar && (
                    <img
                      src={booking.hostInfo.avatar}
                      alt={booking.hostInfo.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{booking.hostInfo.name}</h3>
                      {booking.hostInfo.isSuperhost && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Star size={12} />
                          Superhost
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Response rate: {booking.hostInfo.responseRate}%</p>
                      <p>Typical response time: {booking.hostInfo.responseTime}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {booking.hostInfo.phone && (
                    <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Phone size={16} />
                      <span className="font-medium">Call Host</span>
                    </button>
                  )}
                  
                  {booking.hostInfo.email && (
                    <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Mail size={16} />
                      <span className="font-medium">Email Host</span>
                    </button>
                  )}
                  
                  <button className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <MessageSquare size={16} />
                    <span className="font-medium">Message</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingDetails;
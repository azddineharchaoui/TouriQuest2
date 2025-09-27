/**
 * BookingHistory - Component for displaying past bookings with reviews and insights
 * Features filtering, sorting, review submissions, and travel analytics
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Star,
  Users,
  CreditCard,
  Download,
  Share2,
  Filter,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Repeat,
  Heart,
  Camera,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Globe,
  Zap
} from 'lucide-react';
import { Booking, BookingQuickAction } from '../../types/booking-types';

interface BookingHistoryProps {
  bookings: Booking[];
  onBookingAction: (action: BookingQuickAction, booking: Booking) => void;
  className?: string;
}

interface HistoryAnalytics {
  totalTrips: number;
  totalSpent: number;
  averageTripCost: number;
  favoriteDestination: string;
  mostBookedType: 'property' | 'experience' | 'poi';
  reviewsSubmitted: number;
  reviewsPending: number;
}

export const BookingHistory: React.FC<BookingHistoryProps> = ({
  bookings,
  onBookingAction,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'rating'>('date');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filter past bookings
  const pastBookings = useMemo(() => {
    return bookings
      .filter(booking => new Date(booking.checkOutDate) < new Date())
      .filter(booking => {
        const matchesSearch = searchTerm === '' || 
          booking.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.confirmationCode.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesYear = selectedYear === 'all' || 
          new Date(booking.checkInDate).getFullYear().toString() === selectedYear;
        
        const matchesType = selectedType === 'all' || booking.type === selectedType;
        
        const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
        
        return matchesSearch && matchesYear && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
          case 'amount':
            return b.totalAmount - a.totalAmount;
          case 'rating':
            const aRating = a.review?.rating || 0;
            const bRating = b.review?.rating || 0;
            return bRating - aRating;
          default:
            return 0;
        }
      });
  }, [bookings, searchTerm, selectedYear, selectedType, selectedStatus, sortBy]);

  // Calculate analytics
  const analytics: HistoryAnalytics = useMemo(() => {
    const completed = pastBookings.filter(b => b.status === 'completed');
    
    const totalSpent = completed.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const averageTripCost = completed.length > 0 ? totalSpent / completed.length : 0;
    
    // Find favorite destination (most visited)
    const destinations: Record<string, number> = {};
    completed.forEach(booking => {
      if (booking.propertyInfo?.address) {
        const city = booking.propertyInfo.address.split(',')[1]?.trim() || 'Unknown';
        destinations[city] = (destinations[city] || 0) + 1;
      }
    });
    const favoriteDestination = Object.keys(destinations).reduce((a, b) => 
      destinations[a] > destinations[b] ? a : b, 'None'
    );
    
    // Find most booked type
    const typeCount = completed.reduce((acc, booking) => {
      acc[booking.type] = (acc[booking.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostBookedType = Object.keys(typeCount).reduce((a, b) => 
      typeCount[a] > typeCount[b] ? a : b, 'property'
    ) as 'property' | 'experience' | 'poi';
    
    const reviewsSubmitted = completed.filter(b => b.reviewSubmitted).length;
    const reviewsPending = completed.filter(b => b.canReview && !b.reviewSubmitted).length;
    
    return {
      totalTrips: completed.length,
      totalSpent,
      averageTripCost,
      favoriteDestination,
      mostBookedType,
      reviewsSubmitted,
      reviewsPending
    };
  }, [pastBookings]);

  // Get unique years from bookings
  const availableYears = useMemo(() => {
    const years = [...new Set(bookings.map(b => new Date(b.checkInDate).getFullYear()))]
      .sort((a, b) => b - a);
    return years;
  }, [bookings]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property':
        return '🏠';
      case 'experience':
        return '🎯';
      case 'poi':
        return '📍';
      default:
        return '📱';
    }
  };

  const formatDuration = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return `${nights} night${nights !== 1 ? 's' : ''}`;
  };

  const HistoryBookingCard: React.FC<{ booking: Booking; index: number }> = ({ booking, index }) => {
    const [showReviewPrompt, setShowReviewPrompt] = useState(false);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            {booking.itemImages.length > 0 && (
              <div className="relative">
                <img
                  src={booking.itemImages[0]}
                  alt={booking.itemName}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="absolute -top-2 -left-2 text-lg">
                  {getTypeIcon(booking.type)}
                </div>
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{booking.itemName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    {getStatusIcon(booking.status)}
                    <span className="capitalize">{booking.status}</span>
                    <span>•</span>
                    <span>{booking.confirmationCode}</span>
                  </div>
                </div>
                
                {booking.review && (
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                    <Star className="text-yellow-500 fill-current" size={14} />
                    <span className="text-sm font-medium text-yellow-700">{booking.review.rating}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>
                    {new Date(booking.checkInDate).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{formatDuration(booking.checkInDate, booking.checkOutDate)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{booking.guests.adults + booking.guests.children} guests</span>
                </div>
              </div>
              
              {booking.propertyInfo && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <MapPin size={14} />
                  <span>{booking.propertyInfo.address}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">${booking.totalAmount.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{booking.currency}</p>
            </div>
          </div>

          {/* Review section */}
          {booking.review ? (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={star <= booking.review!.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Your Review</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(booking.review.createdAt!).toLocaleDateString()}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{booking.review.title}</h4>
              <p className="text-sm text-gray-700 line-clamp-2">{booking.review.content}</p>
            </div>
          ) : booking.canReview && !booking.reviewSubmitted ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Share Your Experience</h4>
                  <p className="text-sm text-blue-700">Help other travelers by writing a review</p>
                </div>
                <button
                  onClick={() => onBookingAction(
                    { id: 'review', label: 'Write Review', icon: 'star', action: 'review', available: true },
                    booking
                  )}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Write Review
                </button>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onBookingAction(
                { id: 'view', label: 'View Details', icon: 'eye', action: 'view', available: true },
                booking
              )}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Calendar size={14} />
              View Details
            </button>
            
            <button
              onClick={() => onBookingAction(
                { id: 'download', label: 'Download', icon: 'download', action: 'download', available: true },
                booking
              )}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download size={14} />
              Invoice
            </button>
            
            {booking.status === 'completed' && (
              <>
                <button
                  onClick={() => onBookingAction(
                    { id: 'share', label: 'Share', icon: 'share', action: 'share', available: true },
                    booking
                  )}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Share2 size={14} />
                  Share
                </button>
                
                <button
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Repeat size={14} />
                  Book Again
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const AnalyticsPanel = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Your Travel Insights</h3>
        <button
          onClick={() => setShowAnalytics(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white bg-opacity-70 p-4 rounded-lg text-center">
          <Globe className="mx-auto text-blue-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">{analytics.totalTrips}</p>
          <p className="text-sm text-gray-600">Total Trips</p>
        </div>
        
        <div className="bg-white bg-opacity-70 p-4 rounded-lg text-center">
          <CreditCard className="mx-auto text-green-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">${analytics.totalSpent.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Spent</p>
        </div>
        
        <div className="bg-white bg-opacity-70 p-4 rounded-lg text-center">
          <TrendingUp className="mx-auto text-purple-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">${Math.round(analytics.averageTripCost).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Avg Trip Cost</p>
        </div>
        
        <div className="bg-white bg-opacity-70 p-4 rounded-lg text-center">
          <Star className="mx-auto text-yellow-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">{analytics.reviewsSubmitted}</p>
          <p className="text-sm text-gray-600">Reviews Given</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white bg-opacity-70 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin size={16} />
            Favorite Destination
          </h4>
          <p className="text-lg font-medium text-gray-700">{analytics.favoriteDestination}</p>
        </div>
        
        <div className="bg-white bg-opacity-70 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Target size={16} />
            Preferred Type
          </h4>
          <p className="text-lg font-medium text-gray-700 capitalize">{analytics.mostBookedType}s</p>
        </div>
      </div>
      
      {analytics.reviewsPending > 0 && (
        <div className="mt-4 p-4 bg-orange-100 rounded-lg">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertCircle size={16} />
            <span className="font-medium">
              You have {analytics.reviewsPending} pending review{analytics.reviewsPending !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Travel History ({pastBookings.length})
        </h2>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
        >
          <BarChart3 size={16} />
          {showAnalytics ? 'Hide' : 'Show'} Insights
        </button>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && <AnalyticsPanel />}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="property">Properties</option>
              <option value="experience">Experiences</option>
              <option value="poi">POIs</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {pastBookings.length > 0 ? (
        <div className="space-y-4">
          {pastBookings.map((booking, index) => (
            <HistoryBookingCard key={booking.id} booking={booking} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Clock className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Travel History</h3>
          <p className="text-gray-600 mb-6">Your completed trips will appear here</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Plan Your First Trip
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
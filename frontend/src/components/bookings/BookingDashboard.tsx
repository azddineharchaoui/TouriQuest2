/**
 * BookingDashboard - Comprehensive booking management dashboard
 * Provides complete booking overview, filtering, and quick actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Filter,
  Search,
  Download,
  Star,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Share2,
  Settings,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  Bell,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { 
  Booking, 
  BookingFilter, 
  BookingCard,
  BookingQuickAction,
  BookingAnalytics
} from '../../types/booking-types';
import { ApiResponse, PaginatedResponse } from '../../types/api-types';
import { UpcomingBookings } from './UpcomingBookings';
import { BookingHistory } from './BookingHistory';
import { BookingDetails } from './BookingDetails';
import { BookingModification } from './BookingModification';
import { BookingCancellation } from './BookingCancellation';
import { ReviewSubmission } from './ReviewSubmission';
import { BookingShare } from './BookingShare';
import { NotificationSettings } from './NotificationSettings';

interface BookingDashboardProps {
  className?: string;
  userId?: string;
  initialView?: 'all' | 'upcoming' | 'history';
}

export const BookingDashboard: React.FC<BookingDashboardProps> = ({
  className = '',
  userId,
  initialView = 'all'
}) => {
  // State Management
  const [activeView, setActiveView] = useState<'all' | 'upcoming' | 'history' | 'analytics'>(initialView);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BookingFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showModification, setShowModification] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Load bookings and analytics
  useEffect(() => {
    loadBookings();
    loadAnalytics();
  }, [activeView, currentPage, filters, sortBy, sortOrder]);

  // Filter bookings based on search query
  useEffect(() => {
    const filtered = bookings.filter(booking => {
      const matchesSearch = searchQuery === '' || 
        booking.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.confirmationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.guestDetails.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });

    setFilteredBookings(filtered);
  }, [bookings, searchQuery]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      let response: ApiResponse<PaginatedResponse<Booking>>;
      
      switch (activeView) {
        case 'upcoming':
          response = await bookingService.getUpcomingBookings(currentPage, itemsPerPage);
          break;
        case 'history':
          response = await bookingService.getBookingHistory(currentPage, itemsPerPage, filters);
          break;
        default:
          response = await bookingService.getUserBookings(currentPage, itemsPerPage, filters);
      }

      if (response.success) {
        setBookings(response.data.items);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError('Failed to load bookings');
      }
    } catch (error) {
      setError('An error occurred while loading bookings');
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await bookingService.getBookingAnalytics();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleQuickAction = (action: BookingQuickAction, booking: Booking) => {
    setSelectedBooking(booking);
    
    switch (action.action) {
      case 'view':
        setShowBookingDetails(true);
        break;
      case 'modify':
        setShowModification(true);
        break;
      case 'cancel':
        setShowCancellation(true);
        break;
      case 'review':
        setShowReview(true);
        break;
      case 'share':
        setShowShare(true);
        break;
      case 'download':
        handleDownloadInvoice(booking.id);
        break;
    }
  };

  const handleDownloadInvoice = async (bookingId: string) => {
    try {
      await bookingService.downloadInvoice(bookingId);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    return bookingService.getStatusColor(status);
  };

  const getStatusIcon = (status: string) => {
    const iconProps = { size: 16, className: 'ml-1' };
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle {...iconProps} color="#10B981" />;
      case 'pending':
        return <Clock {...iconProps} color="#F59E0B" />;
      case 'cancelled':
        return <XCircle {...iconProps} color="#EF4444" />;
      case 'completed':
        return <CheckCircle {...iconProps} color="#6366F1" />;
      default:
        return <AlertCircle {...iconProps} color="#6B7280" />;
    }
  };

  const generateQuickActions = (booking: Booking): BookingQuickAction[] => {
    const actions: BookingQuickAction[] = [
      {
        id: 'view',
        label: 'View Details',
        icon: 'eye',
        action: 'view',
        available: true
      },
      {
        id: 'share',
        label: 'Share',
        icon: 'share',
        action: 'share',
        available: booking.isShareable
      },
      {
        id: 'download',
        label: 'Download Invoice',
        icon: 'download',
        action: 'download',
        available: booking.paymentStatus === 'paid'
      }
    ];

    if (bookingService.canModifyBooking(booking)) {
      actions.push({
        id: 'modify',
        label: 'Modify',
        icon: 'edit',
        action: 'modify',
        available: true
      });
    }

    if (bookingService.canCancelBooking(booking)) {
      actions.push({
        id: 'cancel',
        label: 'Cancel',
        icon: 'trash',
        action: 'cancel',
        available: true
      });
    }

    if (booking.canReview && !booking.reviewSubmitted) {
      actions.push({
        id: 'review',
        label: 'Write Review',
        icon: 'star',
        action: 'review',
        available: true
      });
    }

    return actions;
  };

  const BookingCardComponent: React.FC<{ booking: Booking }> = ({ booking }) => {
    const quickActions = generateQuickActions(booking);
    const formattedDates = bookingService.formatBookingDates(booking.checkInDate, booking.checkOutDate);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{booking.itemName}</h3>
                <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getStatusColor(booking.status)}20`,
                        color: getStatusColor(booking.status)
                      }}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  {getStatusIcon(booking.status)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Confirmation: {booking.confirmationCode}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formattedDates}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {booking.guests.adults + booking.guests.children} guests
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard size={14} />
                  ${booking.totalAmount.toLocaleString()} {booking.currency}
                </span>
              </div>
            </div>
            
            {booking.itemImages.length > 0 && (
              <div className="ml-4">
                <img
                  src={booking.itemImages[0]}
                  alt={booking.itemName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {booking.urgentAction && (
                <span className="flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                  <Bell size={12} />
                  {booking.urgentAction.message}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {quickActions.filter(action => action.available).map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action, booking)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={action.disabled}
                  title={action.disabledReason}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const FilterBar = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: showFilters ? 1 : 0, height: showFilters ? 'auto' : 0 }}
      className="bg-gray-50 border-b overflow-hidden"
    >
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status?.[0] || ''}
              onChange={(e) => setFilters({...filters, status: e.target.value ? [e.target.value as any] : undefined})}
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.type?.[0] || ''}
              onChange={(e) => setFilters({...filters, type: e.target.value ? [e.target.value as any] : undefined})}
            >
              <option value="">All Types</option>
              <option value="property">Properties</option>
              <option value="experience">Experiences</option>
              <option value="poi">Points of Interest</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const AnalyticsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-700 text-sm font-medium">Total Bookings</p>
            <p className="text-2xl font-bold text-blue-900">{analytics?.totalBookings || 0}</p>
          </div>
          <Calendar className="text-blue-600" size={24} />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-700 text-sm font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-green-900">${analytics?.totalSpent?.toLocaleString() || 0}</p>
          </div>
          <CreditCard className="text-green-600" size={24} />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-700 text-sm font-medium">Upcoming Trips</p>
            <p className="text-2xl font-bold text-purple-900">{analytics?.upcomingTrips || 0}</p>
          </div>
          <MapPin className="text-purple-600" size={24} />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-700 text-sm font-medium">Loyalty Tier</p>
            <p className="text-2xl font-bold text-orange-900 capitalize">{analytics?.loyaltyTier || 'Bronze'}</p>
          </div>
          <Star className="text-orange-600" size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              
              <nav className="flex space-x-6">
                {[
                  { id: 'all', label: 'All Bookings' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'history', label: 'History' },
                  { id: 'analytics', label: 'Analytics' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeView === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNotificationSettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Notification Settings"
              >
                <Settings size={20} />
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center flex-1 space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search bookings, confirmation codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={20} />
                Filters
                <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        <FilterBar />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
            <span className="ml-3 text-lg text-gray-600">Loading bookings...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <p className="text-lg text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadBookings}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {activeView === 'analytics' && <AnalyticsOverview />}
            
            {activeView === 'upcoming' ? (
              <UpcomingBookings 
                bookings={filteredBookings}
                onBookingAction={handleQuickAction}
              />
            ) : activeView === 'history' ? (
              <BookingHistory 
                bookings={filteredBookings}
                onBookingAction={handleQuickAction}
              />
            ) : activeView !== 'analytics' ? (
              <div className="space-y-6">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <BookingCardComponent key={booking.id} booking={booking} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-lg text-gray-600">No bookings found</p>
                    <p className="text-gray-500">Your booking history will appear here</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8 space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showBookingDetails && selectedBooking && (
          <BookingDetails
            booking={selectedBooking}
            onClose={() => setShowBookingDetails(false)}
          />
        )}
        
        {showModification && selectedBooking && (
          <BookingModification
            booking={selectedBooking}
            onClose={() => setShowModification(false)}
            onSuccess={() => {
              setShowModification(false);
              loadBookings();
            }}
          />
        )}
        
        {showCancellation && selectedBooking && (
          <BookingCancellation
            booking={selectedBooking}
            onClose={() => setShowCancellation(false)}
            onSuccess={() => {
              setShowCancellation(false);
              loadBookings();
            }}
          />
        )}
        
        {showReview && selectedBooking && (
          <ReviewSubmission
            booking={selectedBooking}
            onClose={() => setShowReview(false)}
            onSuccess={() => {
              setShowReview(false);
              loadBookings();
            }}
          />
        )}
        
        {showShare && selectedBooking && (
          <BookingShare
            booking={selectedBooking}
            onClose={() => setShowShare(false)}
          />
        )}
        
        {showNotificationSettings && (
          <NotificationSettings
            onClose={() => setShowNotificationSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingDashboard;
/**
 * UpcomingBookings - Specialized component for displaying upcoming reservations
 * Features countdown timers, check-in preparation, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Wifi,
  Car,
  Key,
  Phone,
  Mail,
  Star,
  AlertTriangle,
  Bell,
  Navigation,
  Camera,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Timer,
  Sun,
  Cloud,
  CloudRain
} from 'lucide-react';
import { Booking, BookingQuickAction } from '../../types/booking-types';

interface UpcomingBookingsProps {
  bookings: Booking[];
  onBookingAction: (action: BookingQuickAction, booking: Booking) => void;
  className?: string;
}

interface CountdownTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const UpcomingBookings: React.FC<UpcomingBookingsProps> = ({
  bookings,
  onBookingAction,
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate countdown timer for check-in
  const calculateCountdown = (checkInDate: string): CountdownTimer => {
    const checkIn = new Date(checkInDate);
    const now = currentTime;
    const timeDiff = checkIn.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  // Get urgency level based on time until check-in
  const getUrgencyLevel = (checkInDate: string): 'high' | 'medium' | 'low' => {
    const checkIn = new Date(checkInDate);
    const now = currentTime;
    const hoursUntil = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil <= 24) return 'high';
    if (hoursUntil <= 72) return 'medium';
    return 'low';
  };

  // Get weather icon (mock implementation)
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="text-yellow-500" size={20} />;
      case 'cloudy':
      case 'partly cloudy':
        return <Cloud className="text-gray-500" size={20} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="text-blue-500" size={20} />;
      default:
        return <Sun className="text-yellow-500" size={20} />;
    }
  };

  const UpcomingBookingCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const countdown = calculateCountdown(booking.checkInDate);
    const urgency = getUrgencyLevel(booking.checkInDate);
    const isToday = new Date(booking.checkInDate).toDateString() === currentTime.toDateString();
    const isCheckInTime = isToday && new Date().getHours() >= 14; // Assuming 2 PM check-in

    const urgencyColors = {
      high: 'bg-red-50 border-red-200 text-red-800',
      medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      low: 'bg-green-50 border-green-200 text-green-800'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-lg transition-all duration-300 ${
          urgency === 'high' ? 'border-red-200 shadow-red-50' : 
          urgency === 'medium' ? 'border-yellow-200 shadow-yellow-50' : 
          'border-green-200 shadow-green-50'
        }`}
      >
        {/* Header with countdown and urgency indicator */}
        <div className={`p-4 border-b ${urgencyColors[urgency]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer size={20} />
              <div>
                <p className="font-semibold">
                  {isToday ? 'Check-in Today!' : `${countdown.days} days to go`}
                </p>
                <p className="text-sm opacity-75">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                </p>
              </div>
            </div>
            
            {isCheckInTime && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-white bg-opacity-30 p-2 rounded-full"
              >
                <CheckCircle className="text-current" size={24} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Main booking information */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            {booking.itemImages.length > 0 && (
              <div className="relative">
                <img
                  src={booking.itemImages[0]}
                  alt={booking.itemName}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                {booking.type === 'property' && (
                  <div className="absolute -top-2 -right-2 bg-blue-100 p-1.5 rounded-full">
                    <Key className="text-blue-600" size={16} />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.itemName}</h3>
              <p className="text-gray-600 mb-3">Confirmation: {booking.confirmationCode}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                  <span className="text-sm">
                    {new Date(booking.checkInDate).toLocaleDateString()} - 
                    {new Date(booking.checkOutDate).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} />
                  <span className="text-sm">
                    {booking.guests.adults + booking.guests.children} guests
                  </span>
                </div>
                
                {booking.propertyInfo && (
                  <>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} />
                      <span className="text-sm">{booking.propertyInfo.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={16} />
                      <span className="text-sm">
                        Check-in: {booking.propertyInfo.checkInTime}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Host information */}
          {booking.hostInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Your Host</h4>
              <div className="flex items-center gap-3">
                {booking.hostInfo.avatar && (
                  <img
                    src={booking.hostInfo.avatar}
                    alt={booking.hostInfo.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{booking.hostInfo.name}</p>
                    {booking.hostInfo.isSuperhost && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                        <Star size={12} className="inline mr-1" />
                        Superhost
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Responds in {booking.hostInfo.responseTime} • {booking.hostInfo.responseRate}% response rate
                  </p>
                </div>
                <div className="flex gap-2">
                  {booking.hostInfo.phone && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                      <Phone size={18} />
                    </button>
                  )}
                  {booking.hostInfo.email && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                      <Mail size={18} />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Property amenities and info */}
          {booking.propertyInfo && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Property Details</h4>
              
              {booking.propertyInfo.checkInInstructions && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="text-blue-600" size={16} />
                    <span className="font-medium text-gray-900">Check-in Instructions</span>
                  </div>
                  <p className="text-sm text-gray-700">{booking.propertyInfo.checkInInstructions}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {booking.propertyInfo.amenities.slice(0, 4).map((amenity, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg">
                    <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                      {amenity.toLowerCase().includes('wifi') && <Wifi className="text-blue-600" size={16} />}
                      {amenity.toLowerCase().includes('parking') && <Car className="text-blue-600" size={16} />}
                      {!amenity.toLowerCase().includes('wifi') && !amenity.toLowerCase().includes('parking') && 
                        <CheckCircle className="text-blue-600" size={16} />}
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{amenity}</p>
                  </div>
                ))}
              </div>
              
              {booking.propertyInfo.wifiPassword && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="text-blue-600" size={16} />
                      <span className="font-medium text-gray-900">WiFi Password</span>
                    </div>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {booking.propertyInfo.wifiPassword}
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weather forecast for check-in day */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {getWeatherIcon('sunny')}
              Weather Forecast
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">Today</p>
                <div className="flex justify-center my-2">{getWeatherIcon('sunny')}</div>
                <p className="text-sm text-gray-700">75°F / 24°C</p>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">Check-in Day</p>
                <div className="flex justify-center my-2">{getWeatherIcon('cloudy')}</div>
                <p className="text-sm text-gray-700">72°F / 22°C</p>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">Check-out Day</p>
                <div className="flex justify-center my-2">{getWeatherIcon('rainy')}</div>
                <p className="text-sm text-gray-700">68°F / 20°C</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onBookingAction({ id: 'view', label: 'View Details', icon: 'eye', action: 'view', available: true }, booking)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink size={16} />
              View Full Details
            </button>
            
            <button
              onClick={() => onBookingAction({ id: 'directions', label: 'Directions', icon: 'navigation', action: 'view', available: true }, booking)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Navigation size={16} />
              Get Directions
            </button>
            
            <button
              onClick={() => onBookingAction({ id: 'contact', label: 'Contact Host', icon: 'message', action: 'view', available: true }, booking)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <MessageSquare size={16} />
              Contact Host
            </button>
            
            <button
              onClick={() => onBookingAction({ id: 'share', label: 'Share Trip', icon: 'share', action: 'share', available: true }, booking)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Camera size={16} />
              Share Trip
            </button>
          </div>

          {/* Special alerts */}
          {urgency === 'high' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-600 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-orange-900">Reminder</p>
                  <p className="text-sm text-orange-700">
                    Don't forget to prepare for check-in! Review the property details and contact your host if needed.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  const upcomingBookings = bookings
    .filter(booking => new Date(booking.checkInDate) > currentTime)
    .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());

  return (
    <div className={`space-y-6 ${className}`}>
      {upcomingBookings.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Upcoming Trips ({upcomingBookings.length})
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              <Bell size={16} />
              Manage Reminders
            </button>
          </div>
          
          {upcomingBookings.map((booking) => (
            <UpcomingBookingCard key={booking.id} booking={booking} />
          ))}
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Trips</h3>
          <p className="text-gray-600 mb-6">Ready to plan your next adventure?</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Explore Destinations
          </button>
        </div>
      )}
    </div>
  );
};

export default UpcomingBookings;
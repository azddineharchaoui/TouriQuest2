/**
 * Notification Bell Component
 * Interactive notification bell with real-time updates and preview
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// INTERFACES
// ============================================================================

interface NotificationBellProps {
  className?: string;
  onOpenCenter?: () => void;
  onOpenSettings?: () => void;
}

interface QuickNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  createdAt: string;
  readAt?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockNotifications: QuickNotification[] = [
  {
    id: '1',
    title: 'Booking Confirmed',
    message: 'Your booking for Sunset Villa has been confirmed',
    type: 'booking_confirmation',
    priority: 'high',
    createdAt: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },
  {
    id: '2',
    title: 'Price Drop Alert',
    message: 'Ocean View Resort dropped by 20%',
    type: 'property_price_drop',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  },
  {
    id: '3',
    title: 'Weather Update',
    message: 'Rain expected tomorrow for your hiking experience',
    type: 'experience_weather_alert',
    priority: 'medium',
    createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: '4',
    title: 'New Recommendation',
    message: 'Discover 3 new properties perfect for you',
    type: 'recommendation',
    priority: 'low',
    createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  }
];

// ============================================================================
// NOTIFICATION BELL COMPONENT
// ============================================================================

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  onOpenCenter,
  onOpenSettings
}) => {
  const [notifications, setNotifications] = useState<QuickNotification[]>(mockNotifications);
  const [unreadCount, setUnreadCount] = useState(3);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Simulate new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.9) { // 10% chance every 30 seconds
        addNewNotification();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Add new notification (simulate real-time)
  const addNewNotification = () => {
    const newNotification: QuickNotification = {
      id: Date.now().toString(),
      title: 'New Activity',
      message: 'You have a new update',
      type: 'social_activity',
      priority: 'medium',
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
    setUnreadCount(prev => prev + 1);
    triggerBellAnimation();
  };

  // Trigger bell animation
  const triggerBellAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  // Handle bell click
  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  // Get notification icon color
  const getPriorityColor = (priority: QuickNotification['priority']) => {
    const colors = {
      urgent: 'text-red-500',
      high: 'text-orange-500',
      medium: 'text-blue-500',
      low: 'text-gray-500'
    };
    return colors[priority];
  };

  // Get unread notifications
  const unreadNotifications = notifications.filter(n => !n.readAt);
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <motion.button
        ref={bellRef}
        onClick={handleBellClick}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${showDropdown 
            ? 'bg-blue-100 text-blue-600' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }
          ${isAnimating ? 'animate-bounce' : ''}
        `}
        whileTap={{ scale: 0.95 }}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-6 h-6" />
        ) : (
          <Bell className="w-6 h-6" />
        )}
        
        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse Animation for Urgent Notifications */}
        {unreadNotifications.some(n => n.priority === 'urgent') && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-400"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600">{unreadCount} unread</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenSettings}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="py-2">
                  {recentNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer
                        ${notification.readAt 
                          ? 'border-l-transparent' 
                          : 'border-l-blue-500 bg-blue-50'
                        }
                      `}
                      onClick={() => {
                        if (!notification.readAt) {
                          setNotifications(prev => 
                            prev.map(n => 
                              n.id === notification.id 
                                ? { ...n, readAt: new Date().toISOString() }
                                : n
                            )
                          );
                          setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Priority Indicator */}
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.priority === 'urgent' ? 'bg-red-500' :
                          notification.priority === 'high' ? 'bg-orange-500' :
                          notification.priority === 'medium' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-900 ${
                            !notification.readAt ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { 
                              addSuffix: true 
                            })}
                          </p>
                        </div>
                        
                        {!notification.readAt && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenCenter?.();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors ml-auto"
                >
                  View all
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
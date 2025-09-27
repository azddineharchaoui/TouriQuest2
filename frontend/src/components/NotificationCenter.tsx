/**
 * Comprehensive Notification Center Component
 * Advanced notification management with real-time updates, grouping, and interactive features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  BellRing,
  Settings,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  CheckCheck,
  Trash2,
  Star,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  CreditCard,
  Home,
  MapPin,
  Users,
  Gift,
  Shield,
  Zap,
  Mail,
  Smartphone,
  Monitor,
  Vibrate,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Archive,
  Bookmark,
  Share,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'react-hot-toast';

import { notificationService } from '../../services/notificationService';
import type {
  Notification,
  NotificationFilters,
  NotificationSettings,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationCategory,
  NotificationType,
  NotificationListResponse
} from '../../types/notification-types';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (notificationId: string, actionId: string) => void;
  isGrouped?: boolean;
  groupCount?: number;
}

interface NotificationGroupProps {
  groupId: string;
  notifications: Notification[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (notificationId: string, actionId: string) => void;
}

// ============================================================================
// NOTIFICATION CENTER COMPONENT
// ============================================================================

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<NotificationFilters>>({
    sortBy: 'created',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'unread' | 'grouped'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [groupedNotifications, setGroupedNotifications] = useState<Record<string, Notification[]>>({});

  // Load notifications
  const loadNotifications = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: 1,
        limit: 50,
        filters: {
          ...filters,
          ...(searchQuery && { search: searchQuery }),
          ...(viewMode === 'unread' && { isRead: false })
        },
        includeRead: viewMode !== 'unread',
        groupBy: viewMode === 'grouped' ? 'type' : undefined
      };

      const response = await notificationService.getNotifications(params);
      
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      
      if (response.groupedNotifications) {
        setGroupedNotifications(response.groupedNotifications);
      }
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, viewMode]);

  // Initialize component
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      
      // Connect to real-time updates
      notificationService.connectRealTime();
      
      // Set up event listeners
      const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for high-priority notifications
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          toast(notification.title, {
            icon: getNotificationIcon(notification.type),
            duration: 6000
          });
        }
      };
      
      const handleNotificationRead = (notificationId: string) => {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      };
      
      const handleUnreadCountUpdated = (count: number) => {
        setUnreadCount(count);
      };
      
      notificationService.on('newNotification', handleNewNotification);
      notificationService.on('notificationRead', handleNotificationRead);
      notificationService.on('unreadCountUpdated', handleUnreadCountUpdated);
      
      return () => {
        notificationService.off('newNotification', handleNewNotification);
        notificationService.off('notificationRead', handleNotificationRead);
        notificationService.off('unreadCountUpdated', handleUnreadCountUpdated);
      };
    }
  }, [isOpen, loadNotifications]);

  // Handle notification actions
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update handled by real-time event
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all notifications as read');
    }
  }, []);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    try {
      const notificationIds = Array.from(selectedNotifications);
      await notificationService.deleteNotifications(notificationIds);
      setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
      setSelectedNotifications(new Set());
      toast.success(`${notificationIds.length} notifications deleted`);
    } catch (err) {
      toast.error('Failed to delete notifications');
    }
  }, [selectedNotifications]);

  const handleNotificationAction = useCallback(async (notificationId: string, actionId: string) => {
    try {
      await notificationService.trackInteraction(notificationId, {
        type: 'action',
        actionId
      });
      
      // Handle specific action logic here
      toast.success('Action completed');
    } catch (err) {
      toast.error('Failed to execute action');
    }
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [notifications, searchQuery]);

  // Get notification icon
  const getNotificationIcon = (type: NotificationType): React.ReactNode => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
      // Booking related
      booking_confirmation: <CheckCircle className="w-5 h-5 text-green-500" />,
      booking_reminder: <Clock className="w-5 h-5 text-blue-500" />,
      booking_cancellation: <XCircle className="w-5 h-5 text-red-500" />,
      booking_modification: <RefreshCw className="w-5 h-5 text-orange-500" />,
      payment_success: <CreditCard className="w-5 h-5 text-green-500" />,
      payment_failure: <XCircle className="w-5 h-5 text-red-500" />,
      refund_processed: <CreditCard className="w-5 h-5 text-blue-500" />,
      
      // Property related
      property_available: <Home className="w-5 h-5 text-green-500" />,
      property_price_drop: <Zap className="w-5 h-5 text-yellow-500" />,
      property_review_received: <Star className="w-5 h-5 text-yellow-500" />,
      property_wishlist_update: <Bookmark className="w-5 h-5 text-purple-500" />,
      
      // Experience related
      experience_reminder: <Calendar className="w-5 h-5 text-blue-500" />,
      experience_weather_alert: <AlertCircle className="w-5 h-5 text-orange-500" />,
      experience_cancellation: <XCircle className="w-5 h-5 text-red-500" />,
      experience_recommendation: <MapPin className="w-5 h-5 text-green-500" />,
      
      // User engagement
      welcome: <Gift className="w-5 h-5 text-purple-500" />,
      recommendation: <Star className="w-5 h-5 text-blue-500" />,
      achievement: <Gift className="w-5 h-5 text-yellow-500" />,
      social_activity: <Users className="w-5 h-5 text-blue-500" />,
      referral_reward: <Gift className="w-5 h-5 text-green-500" />,
      
      // System notifications
      system_maintenance: <Settings className="w-5 h-5 text-gray-500" />,
      security_alert: <Shield className="w-5 h-5 text-red-500" />,
      feature_announcement: <Zap className="w-5 h-5 text-purple-500" />,
      app_update: <RefreshCw className="w-5 h-5 text-blue-500" />,
      
      // Marketing
      promotional_offer: <Gift className="w-5 h-5 text-green-500" />,
      seasonal_campaign: <Calendar className="w-5 h-5 text-orange-500" />,
      loyalty_program: <Star className="w-5 h-5 text-yellow-500" />,
      newsletter: <Mail className="w-5 h-5 text-blue-500" />
    };

    return iconMap[type] || <Info className="w-5 h-5 text-gray-500" />;
  };

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority): string => {
    const colorMap: Record<NotificationPriority, string> = {
      urgent: 'border-l-red-500 bg-red-50',
      high: 'border-l-orange-500 bg-orange-50',
      medium: 'border-l-blue-500 bg-blue-50',
      low: 'border-l-gray-500 bg-gray-50'
    };
    return colorMap[priority] || 'border-l-gray-500 bg-gray-50';
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Filter className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Mode Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'unread', label: 'Unread', count: unreadCount },
                { key: 'grouped', label: 'Grouped', count: Object.keys(groupedNotifications).length }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key as any)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.label}
                  {mode.count > 0 && (
                    <span className="ml-1 text-xs">({mode.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedNotifications.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete ({selectedNotifications.size})</span>
                  </button>
                )}
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  {/* Priority Filter */}
                  <select
                    value={filters.priority?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      priority: e.target.value ? [e.target.value as NotificationPriority] : undefined 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={filters.category?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      category: e.target.value ? [e.target.value as NotificationCategory] : undefined 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="system">System</option>
                    <option value="social">Social</option>
                    <option value="security">Security</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => loadNotifications(true)}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchQuery ? 'No notifications match your search' : 'No notifications yet'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? 'Try different search terms' : 'We\'ll notify you when something happens'}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {viewMode === 'grouped' ? (
                // Grouped notifications
                <div className="space-y-4 p-4">
                  {Object.entries(groupedNotifications).map(([groupId, groupNotifications]) => (
                    <NotificationGroup
                      key={groupId}
                      groupId={groupId}
                      notifications={groupNotifications}
                      onRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </div>
              ) : (
                // Individual notifications
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDelete,
  onAction,
  isGrouped = false,
  groupCount
}) => {
  const [showActions, setShowActions] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isUnread = !notification.readAt;
  const isUrgent = notification.priority === 'urgent';

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    
    // Track click interaction
    notificationService.trackInteraction(notification.id, {
      type: 'click',
      metadata: { expanded, timestamp: new Date().toISOString() }
    });

    // Handle deep linking
    if (notification.metadata?.deepLink) {
      // Navigate to deep link
      window.location.href = notification.metadata.deepLink;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative border-l-4 ${getPriorityColor(notification.priority)}
        ${isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
        ${isUrgent ? 'animate-pulse' : ''}
        hover:bg-gray-50 transition-colors cursor-pointer
      `}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {notification.metadata?.iconUrl ? (
              <img 
                src={notification.metadata.iconUrl} 
                alt="" 
                className="w-6 h-6 rounded-full"
              />
            ) : (
              getNotificationIcon(notification.type)
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`text-sm font-medium text-gray-900 ${isUnread ? 'font-semibold' : ''}`}>
                  {notification.title}
                  {isGrouped && groupCount && (
                    <span className="ml-2 text-xs text-gray-500">({groupCount} similar)</span>
                  )}
                </h4>
                
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>

                {/* Metadata */}
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                  <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                  
                  {notification.channels?.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {notification.channels.includes('push') && <Smartphone className="w-3 h-3" />}
                      {notification.channels.includes('email') && <Mail className="w-3 h-3" />}
                      {notification.channels.includes('in_app') && <Monitor className="w-3 h-3" />}
                    </div>
                  )}

                  <span className={`
                    px-1.5 py-0.5 rounded-full text-xs font-medium
                    ${notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      notification.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'}
                  `}>
                    {notification.priority}
                  </span>
                </div>

                {/* Actions */}
                {notification.actions && notification.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {notification.actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(notification.id, action.id);
                        }}
                        className={`
                          px-3 py-1 rounded-md text-xs font-medium transition-colors
                          ${action.type === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                            action.type === 'destructive' ? 'bg-red-500 text-white hover:bg-red-600' :
                            'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                        `}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status & Controls */}
              <div className="flex items-center space-x-2 ml-3">
                {isUnread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isUnread ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRead(notification.id);
                      }}
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark read</span>
                    </button>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-gray-500">
                      <CheckCircle className="w-3 h-3" />
                      <span>Read</span>
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle share functionality
                    }}
                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-700"
                  >
                    <Share className="w-3 h-3" />
                    <span>Share</span>
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ============================================================================
// NOTIFICATION GROUP COMPONENT
// ============================================================================

const NotificationGroup: React.FC<NotificationGroupProps> = ({
  groupId,
  notifications,
  onRead,
  onDelete,
  onAction
}) => {
  const [expanded, setExpanded] = useState(false);
  const latestNotification = notifications[0];
  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Group Header */}
      <div 
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getNotificationIcon(latestNotification.type)}
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {latestNotification.title}
              </h3>
              <p className="text-xs text-gray-600">
                {notifications.length} notifications
                {unreadCount > 0 && ` • ${unreadCount} unread`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Group Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-200">
              {notifications.slice(0, 5).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={onRead}
                  onDelete={onDelete}
                  onAction={onAction}
                  isGrouped={true}
                />
              ))}
              
              {notifications.length > 5 && (
                <div className="p-4 text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    View {notifications.length - 5} more notifications
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getPriorityColor(priority: NotificationPriority): string {
  const colorMap: Record<NotificationPriority, string> = {
    urgent: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-blue-500 bg-blue-50',
    low: 'border-l-gray-500 bg-gray-50'
  };
  return colorMap[priority] || 'border-l-gray-500 bg-gray-50';
}

function getNotificationIcon(type: NotificationType): React.ReactNode {
  const iconMap: Record<NotificationType, React.ReactNode> = {
    // Booking related
    booking_confirmation: <CheckCircle className="w-5 h-5 text-green-500" />,
    booking_reminder: <Clock className="w-5 h-5 text-blue-500" />,
    booking_cancellation: <XCircle className="w-5 h-5 text-red-500" />,
    booking_modification: <RefreshCw className="w-5 h-5 text-orange-500" />,
    payment_success: <CreditCard className="w-5 h-5 text-green-500" />,
    payment_failure: <XCircle className="w-5 h-5 text-red-500" />,
    refund_processed: <CreditCard className="w-5 h-5 text-blue-500" />,
    
    // Property related
    property_available: <Home className="w-5 h-5 text-green-500" />,
    property_price_drop: <Zap className="w-5 h-5 text-yellow-500" />,
    property_review_received: <Star className="w-5 h-5 text-yellow-500" />,
    property_wishlist_update: <Bookmark className="w-5 h-5 text-purple-500" />,
    
    // Experience related
    experience_reminder: <Calendar className="w-5 h-5 text-blue-500" />,
    experience_weather_alert: <AlertCircle className="w-5 h-5 text-orange-500" />,
    experience_cancellation: <XCircle className="w-5 h-5 text-red-500" />,
    experience_recommendation: <MapPin className="w-5 h-5 text-green-500" />,
    
    // User engagement
    welcome: <Gift className="w-5 h-5 text-purple-500" />,
    recommendation: <Star className="w-5 h-5 text-blue-500" />,
    achievement: <Gift className="w-5 h-5 text-yellow-500" />,
    social_activity: <Users className="w-5 h-5 text-blue-500" />,
    referral_reward: <Gift className="w-5 h-5 text-green-500" />,
    
    // System notifications
    system_maintenance: <Settings className="w-5 h-5 text-gray-500" />,
    security_alert: <Shield className="w-5 h-5 text-red-500" />,
    feature_announcement: <Zap className="w-5 h-5 text-purple-500" />,
    app_update: <RefreshCw className="w-5 h-5 text-blue-500" />,
    
    // Marketing
    promotional_offer: <Gift className="w-5 h-5 text-green-500" />,
    seasonal_campaign: <Calendar className="w-5 h-5 text-orange-500" />,
    loyalty_program: <Star className="w-5 h-5 text-yellow-500" />,
    newsletter: <Mail className="w-5 h-5 text-blue-500" />
  };

  return iconMap[type] || <Info className="w-5 h-5 text-gray-500" />;
}

export default NotificationCenter;
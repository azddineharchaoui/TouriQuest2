/**
 * Comprehensive Notification Settings Component
 * Advanced notification preferences and channel management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Bell,
  BellRing,
  BellOff,
  Mail,
  Smartphone,
  Monitor,
  MessageSquare,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  Vibrate,
  Moon,
  Sun,
  Globe,
  Zap,
  Calendar,
  CreditCard,
  Home,
  MapPin,
  Users,
  Gift,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  TestTube,
  Send,
  Download,
  Upload,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Grid3X3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { toast } from 'react-hot-toast';

// Toast utility for now
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

// Inline type definitions for now
type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
type NotificationCategory = 'transactional' | 'promotional' | 'system' | 'social' | 'security' | 'reminder';
type NotificationType = 'booking_confirmation' | 'payment_success' | 'system_maintenance';

interface NotificationSettings {
  userId: string;
  enabled: boolean;
  timezone: string;
  channels: {
    in_app: { enabled: boolean };
    push: { enabled: boolean; sound: boolean; vibration: boolean; badge: boolean; lockScreen: boolean };
    email: { enabled: boolean; address: string; verified: boolean; frequency: string; digest: boolean };
    sms: { enabled: boolean; phoneNumber: string; verified: boolean };
  };
  categories: Record<string, { enabled: boolean }>;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  active: boolean;
}

// Mock settings
const mockSettings: NotificationSettings = {
  userId: '1',
  enabled: true,
  timezone: 'UTC',
  channels: {
    in_app: { enabled: true },
    push: { enabled: false, sound: true, vibration: true, badge: true, lockScreen: true },
    email: { enabled: true, address: 'user@example.com', verified: true, frequency: 'immediate', digest: false },
    sms: { enabled: false, phoneNumber: '', verified: false }
  },
  categories: {
    transactional: { enabled: true },
    promotional: { enabled: true },
    system: { enabled: true }
  }
};

// Placeholder notification service
const notificationService = {
  getSettings: async () => ({ settings: mockSettings, availableChannels: [], availableCategories: [], quotaLimits: { daily: 100, monthly: 1000, current: 10 } }),
  updateSettings: async (settings: any) => Promise.resolve(),
  getPushSubscriptionStatus: async () => ({ subscribed: false, subscription: null, vapidPublicKey: null }),
  requestPushPermission: async () => ({ granted: false }),
  unsubscribeFromPushNotifications: async () => Promise.resolve(),
  sendTestNotification: async () => Promise.resolve()
};

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface ChannelToggleProps {
  channel: NotificationChannel;
  enabled: boolean;
  onToggle: (channel: NotificationChannel, enabled: boolean) => void;
  settings?: any;
  onSettingsChange?: (channel: NotificationChannel, settings: any) => void;
}

interface CategorySettingsProps {
  category: NotificationCategory;
  preferences: CategoryPreferences;
  onUpdate: (category: NotificationCategory, preferences: CategoryPreferences) => void;
}

// ============================================================================
// MAIN NOTIFICATION SETTINGS COMPONENT
// ============================================================================

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  // State management
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Load notification settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsResponse, pushStatus] = await Promise.all([
        notificationService.getSettings(),
        notificationService.getPushSubscriptionStatus()
      ]);

      setSettings(settingsResponse.settings);
      setPushSubscription(pushStatus.subscription || null);
    } catch (err) {
      setError('Failed to load notification settings');
      console.error('Failed to load notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await notificationService.updateSettings(settings);
      setUnsavedChanges(false);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const updateSettings = (updater: (prev: NotificationSettings) => NotificationSettings) => {
    if (!settings) return;
    
    setSettings(updater);
    setUnsavedChanges(true);
  };

  // Handle push notification subscription
  const handlePushToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const result = await notificationService.requestPushPermission();
        if (result.granted && result.subscription) {
          setPushSubscription(result.subscription.subscription);
          updateSettings(prev => ({
            ...prev,
            channels: {
              ...prev.channels,
              push: {
                ...prev.channels.push,
                enabled: true
              }
            }
          }));
          toast.success('Push notifications enabled');
        } else {
          toast.error('Push notification permission denied');
        }
      } else {
        await notificationService.unsubscribeFromPushNotifications();
        setPushSubscription(null);
        updateSettings(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            push: {
              ...prev.channels.push,
              enabled: false
            }
          }
        }));
        toast.success('Push notifications disabled');
      }
    } catch (err) {
      toast.error('Failed to update push notification settings');
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification({
        recipients: [{ type: 'user', identifier: 'current' }],
        channels: ['in_app', 'push', 'email'],
        testData: {
          title: 'Test Notification',
          message: 'This is a test notification from TouriQuest!'
        }
      });
      
      setTestNotificationSent(true);
      toast.success('Test notification sent');
      
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (err) {
      toast.error('Failed to send test notification');
    }
  };

  if (!isOpen || !settings) return null;

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'channels', label: 'Channels', icon: Bell },
    { id: 'categories', label: 'Categories', icon: Grid3X3 },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'advanced', label: 'Advanced', icon: Zap },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

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

      {/* Settings Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex"
      >
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 border-r border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <nav className="px-3">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeSection === section.id 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Save/Reset Actions */}
          <div className="absolute bottom-6 left-3 right-3 space-y-2">
            {unsavedChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">Unsaved changes</span>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={saveSettings}
                disabled={saving || !unsavedChanges}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save</span>
              </button>
              
              <button
                onClick={loadSettings}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={sendTestNotification}
              className={`
                w-full flex items-center justify-center space-x-2 px-4 py-2 border rounded-lg transition-colors
                ${testNotificationSent 
                  ? 'border-green-300 bg-green-50 text-green-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              `}
            >
              {testNotificationSent ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Test Sent!</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Test Notification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={loadSettings}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* General Settings */}
              {activeSection === 'general' && (
                <GeneralSettings 
                  settings={settings}
                  onUpdate={updateSettings}
                />
              )}

              {/* Channel Settings */}
              {activeSection === 'channels' && (
                <ChannelSettings 
                  settings={settings}
                  pushSubscription={pushSubscription}
                  onUpdate={updateSettings}
                  onPushToggle={handlePushToggle}
                />
              )}

              {/* Category Settings */}
              {activeSection === 'categories' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Category Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure notifications by category
                    </p>
                  </div>
                  <div className="text-gray-500">Category settings coming soon...</div>
                </div>
              )}

              {/* Schedule Settings */}
              {activeSection === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Schedule Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Set quiet hours and delivery schedules
                    </p>
                  </div>
                  <div className="text-gray-500">Schedule settings coming soon...</div>
                </div>
              )}

              {/* Advanced Settings */}
              {activeSection === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Smart filtering and grouping options
                    </p>
                  </div>
                  <div className="text-gray-500">Advanced settings coming soon...</div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Control data sharing and privacy options
                    </p>
                  </div>
                  <div className="text-gray-500">Privacy settings coming soon...</div>
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
// GENERAL SETTINGS SECTION
// ============================================================================

const GeneralSettings: React.FC<{
  settings: NotificationSettings;
  onUpdate: (updater: (prev: NotificationSettings) => NotificationSettings) => void;
}> = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
        <p className="text-sm text-gray-600 mt-1">
          Control your overall notification experience
        </p>
      </div>

      {/* Master Toggle */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-green-100' : 'bg-red-100'}`}>
              {settings.enabled ? (
                <BellRing className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">All Notifications</h4>
              <p className="text-sm text-gray-600">
                {settings.enabled ? 'Notifications are enabled' : 'All notifications are disabled'}
              </p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onUpdate(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timezone
        </label>
        <select
          value={settings.timezone}
          onChange={(e) => onUpdate(prev => ({ ...prev, timezone: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="UTC">UTC (Coordinated Universal Time)</option>
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET/CEST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Asia/Shanghai">Shanghai (CST)</option>
          <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
        </select>
      </div>

      {/* Delivery Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Delivery Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Active Channels:</span>
            <span className="ml-2 font-medium">
              {Object.values(settings.channels).filter((c: any) => c.enabled).length}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Categories:</span>
            <span className="ml-2 font-medium">
              {Object.values(settings.categories).filter((c: any) => c.enabled).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHANNEL SETTINGS SECTION
// ============================================================================

const ChannelSettings: React.FC<{
  settings: NotificationSettings;
  pushSubscription: PushSubscription | null;
  onUpdate: (updater: (prev: NotificationSettings) => NotificationSettings) => void;
  onPushToggle: (enabled: boolean) => void;
}> = ({ settings, pushSubscription, onUpdate, onPushToggle }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose how you want to receive notifications
        </p>
      </div>

      {/* In-App Notifications */}
      <ChannelCard
        icon={<Monitor className="w-6 h-6 text-blue-500" />}
        title="In-App Notifications"
        description="Notifications shown within the TouriQuest app"
        enabled={settings.channels.in_app.enabled}
        onToggle={(enabled) => onUpdate(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            in_app: { ...prev.channels.in_app, enabled }
          }
        }))}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Show notifications in notification center</span>
            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Play notification sound</span>
            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
          </div>
        </div>
      </ChannelCard>

      {/* Push Notifications */}
      <ChannelCard
        icon={<Smartphone className="w-6 h-6 text-green-500" />}
        title="Push Notifications"
        description="Notifications sent to your device even when the app is closed"
        enabled={settings.channels.push.enabled}
        onToggle={onPushToggle}
        status={pushSubscription ? 'Connected' : 'Not connected'}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Show on lock screen</span>
            <input 
              type="checkbox" 
              checked={settings.channels.push.lockScreen}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  push: { ...prev.channels.push, lockScreen: e.target.checked }
                }
              }))}
              className="rounded border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Sound</span>
            <input 
              type="checkbox" 
              checked={settings.channels.push.sound}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  push: { ...prev.channels.push, sound: e.target.checked }
                }
              }))}
              className="rounded border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Vibration</span>
            <input 
              type="checkbox" 
              checked={settings.channels.push.vibration}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  push: { ...prev.channels.push, vibration: e.target.checked }
                }
              }))}
              className="rounded border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Badge count</span>
            <input 
              type="checkbox" 
              checked={settings.channels.push.badge}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  push: { ...prev.channels.push, badge: e.target.checked }
                }
              }))}
              className="rounded border-gray-300"
            />
          </div>
        </div>
      </ChannelCard>

      {/* Email Notifications */}
      <ChannelCard
        icon={<Mail className="w-6 h-6 text-purple-500" />}
        title="Email Notifications"
        description="Notifications sent to your email address"
        enabled={settings.channels.email.enabled}
        onToggle={(enabled) => onUpdate(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            email: { ...prev.channels.email, enabled }
          }
        }))}
        status={settings.channels.email.verified ? 'Verified' : 'Unverified'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={settings.channels.email.address}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  email: { ...prev.channels.email, address: e.target.value }
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              value={settings.channels.email.frequency}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  email: { ...prev.channels.email, frequency: e.target.value as any }
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly digest</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Enable digest mode</span>
            <input 
              type="checkbox" 
              checked={settings.channels.email.digest}
              onChange={(e) => onUpdate(prev => ({
                ...prev,
                channels: {
                  ...prev.channels,
                  email: { ...prev.channels.email, digest: e.target.checked }
                }
              }))}
              className="rounded border-gray-300"
            />
          </div>
        </div>
      </ChannelCard>

      {/* SMS Notifications */}
      <ChannelCard
        icon={<MessageSquare className="w-6 h-6 text-orange-500" />}
        title="SMS Notifications"
        description="Text messages sent to your phone"
        enabled={settings.channels.sms.enabled}
        onToggle={(enabled) => onUpdate(prev => ({
          ...prev,
          channels: {
            ...prev.channels,
            sms: { ...prev.channels.sms, enabled }
          }
        }))}
        status={settings.channels.sms.verified ? 'Verified' : 'Unverified'}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.channels.sms.phoneNumber}
            onChange={(e) => onUpdate(prev => ({
              ...prev,
              channels: {
                ...prev.channels,
                sms: { ...prev.channels.sms, phoneNumber: e.target.value }
              }
            }))}
            placeholder="+1 (555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Standard messaging rates may apply
          </p>
        </div>
      </ChannelCard>
    </div>
  );
};

// ============================================================================
// CHANNEL CARD COMPONENT
// ============================================================================

const ChannelCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  status?: string;
  children?: React.ReactNode;
}> = ({ icon, title, description, enabled, onToggle, status, children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {icon}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{title}</h4>
              <p className="text-sm text-gray-600">{description}</p>
              {status && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'Connected' || status === 'Verified' ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <span className="text-xs text-gray-500">{status}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {children && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && children && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Add the rest of the settings sections...
// (CategorySettings, ScheduleSettings, AdvancedSettings, PrivacySettings)
// Due to length constraints, I'll create these as separate components

export default NotificationSettings;
/**
 * NotificationSettings - Component for managing booking notification preferences
 * Features email, SMS, push notifications, and reminder customization
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  Volume2,
  VolumeX,
  Loader,
  Save
} from 'lucide-react';
import { NotificationPreferences } from '../../types/booking-types';

interface NotificationSettingsProps {
  onClose: () => void;
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onClose,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    bookingConfirmation: true,
    checkInReminder: true,
    checkInReminderTime: 24,
    checkOutReminder: true,
    checkOutReminderTime: 2,
    reviewReminder: true,
    reviewReminderTime: 1,
    specialOffers: false,
    priceDropAlerts: false,
    channels: {
      email: true,
      sms: false,
      push: true,
      inApp: true
    }
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from an API
      // const response = await notificationService.getPreferences();
      // if (response.success) {
      //   setPreferences(response.data);
      // }
      
      // Mock loading
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      setError('Failed to load notification settings');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // In a real app, this would save to an API
      // const response = await notificationService.updatePreferences(preferences);
      // if (response.success) {
      //   setSuccess('Settings saved successfully!');
      // }
      
      // Mock saving
      setTimeout(() => {
        setSuccess('Settings saved successfully!');
        setSaving(false);
        setTimeout(() => {
          setSuccess(null);
        }, 2000);
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateChannel = (channel: keyof NotificationPreferences['channels'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: enabled
      }
    }));
  };

  const Toggle: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }> = ({ 
    enabled, 
    onChange, 
    disabled = false 
  }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading notification settings...</p>
        </div>
      </motion.div>
    );
  }

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
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Bell size={24} />
                Notification Settings
              </h2>
              <p className="text-blue-100 mt-1">Customize your booking notifications</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
          {/* Notification Channels */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings size={20} />
              Notification Channels
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="text-blue-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                </div>
                <Toggle
                  enabled={preferences.channels.email}
                  onChange={(enabled) => updateChannel('email', enabled)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-green-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">SMS Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications via text message</p>
                  </div>
                </div>
                <Toggle
                  enabled={preferences.channels.sms}
                  onChange={(enabled) => updateChannel('sms', enabled)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Volume2 className="text-purple-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications on your device</p>
                  </div>
                </div>
                <Toggle
                  enabled={preferences.channels.push}
                  onChange={(enabled) => updateChannel('push', enabled)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="text-orange-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">In-App Notifications</p>
                    <p className="text-sm text-gray-600">Show notifications within the app</p>
                  </div>
                </div>
                <Toggle
                  enabled={preferences.channels.inApp}
                  onChange={(enabled) => updateChannel('inApp', enabled)}
                />
              </div>
            </div>
          </div>

          {/* Booking Notifications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Booking Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Booking Confirmation</p>
                  <p className="text-sm text-gray-600">Get notified when your booking is confirmed</p>
                </div>
                <Toggle
                  enabled={preferences.bookingConfirmation}
                  onChange={(enabled) => updatePreference('bookingConfirmation', enabled)}
                />
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Check-in Reminder</p>
                    <p className="text-sm text-gray-600">Get reminded before your check-in time</p>
                  </div>
                  <Toggle
                    enabled={preferences.checkInReminder}
                    onChange={(enabled) => updatePreference('checkInReminder', enabled)}
                  />
                </div>
                {preferences.checkInReminder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remind me
                    </label>
                    <select
                      value={preferences.checkInReminderTime}
                      onChange={(e) => updatePreference('checkInReminderTime', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 hour before</option>
                      <option value={2}>2 hours before</option>
                      <option value={6}>6 hours before</option>
                      <option value={12}>12 hours before</option>
                      <option value={24}>24 hours before</option>
                      <option value={48}>48 hours before</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Check-out Reminder</p>
                    <p className="text-sm text-gray-600">Get reminded before your check-out time</p>
                  </div>
                  <Toggle
                    enabled={preferences.checkOutReminder}
                    onChange={(enabled) => updatePreference('checkOutReminder', enabled)}
                  />
                </div>
                {preferences.checkOutReminder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remind me
                    </label>
                    <select
                      value={preferences.checkOutReminderTime}
                      onChange={(e) => updatePreference('checkOutReminderTime', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 hour before</option>
                      <option value={2}>2 hours before</option>
                      <option value={4}>4 hours before</option>
                      <option value={12}>12 hours before</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Review Reminder</p>
                    <p className="text-sm text-gray-600">Get reminded to write a review after your stay</p>
                  </div>
                  <Toggle
                    enabled={preferences.reviewReminder}
                    onChange={(enabled) => updatePreference('reviewReminder', enabled)}
                  />
                </div>
                {preferences.reviewReminder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remind me
                    </label>
                    <select
                      value={preferences.reviewReminderTime}
                      onChange={(e) => updatePreference('reviewReminderTime', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 day after checkout</option>
                      <option value={2}>2 days after checkout</option>
                      <option value={3}>3 days after checkout</option>
                      <option value={7}>1 week after checkout</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Marketing Notifications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} />
              Marketing & Offers
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Special Offers</p>
                  <p className="text-sm text-gray-600">Receive notifications about special deals and promotions</p>
                </div>
                <Toggle
                  enabled={preferences.specialOffers}
                  onChange={(enabled) => updatePreference('specialOffers', enabled)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Price Drop Alerts</p>
                  <p className="text-sm text-gray-600">Get notified when prices drop for your saved properties</p>
                </div>
                <Toggle
                  enabled={preferences.priceDropAlerts}
                  onChange={(enabled) => updatePreference('priceDropAlerts', enabled)}
                />
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle size={16} />
                <span className="font-medium">{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle size={16} />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Privacy & Data</p>
                <p>
                  We respect your privacy and only send notifications you've opted into. 
                  You can change these settings anytime. SMS rates may apply for text notifications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving && <Loader className="animate-spin" size={16} />}
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NotificationSettings;
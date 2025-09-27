/**
 * Comprehensive Notification Management System
 * Main hub for all notification features and management
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  BarChart3,
  Template,
  TestTube,
  Users,
  Zap,
  Shield,
  Clock,
  Mail,
  Smartphone,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import NotificationCenter from './NotificationCenter';
import NotificationSettings from './NotificationSettings';
import NotificationAnalytics from './NotificationAnalytics';
import NotificationTemplates from './NotificationTemplates';
import NotificationBell from './NotificationBell';

// ============================================================================
// INTERFACES
// ============================================================================

interface NotificationManagerProps {
  className?: string;
}

type TabId = 'center' | 'settings' | 'analytics' | 'templates' | 'testing';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  component: React.ComponentType<any>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NotificationManager: React.FC<NotificationManagerProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('center');
  const [isOpen, setIsOpen] = useState(false);

  // Define tabs with their components
  const tabs: Tab[] = [
    {
      id: 'center',
      label: 'Notification Center',
      icon: <Bell className="w-5 h-5" />,
      description: 'View and manage all notifications',
      component: NotificationCenter
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'Configure notification preferences',
      component: NotificationSettings
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Track notification performance',
      component: NotificationAnalytics
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <Template className="w-5 h-5" />,
      description: 'Manage notification templates',
      component: NotificationTemplates
    },
    {
      id: 'testing',
      label: 'Testing',
      icon: <TestTube className="w-5 h-5" />,
      description: 'Test and preview notifications',
      component: NotificationTesting
    }
  ];

  // Get current tab
  const currentTab = tabs.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.component;

  // Handle tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Handle opening notification center
  const handleOpenCenter = () => {
    setActiveTab('center');
    setIsOpen(true);
  };

  // Handle opening settings
  const handleOpenSettings = () => {
    setActiveTab('settings');
    setIsOpen(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell (for header integration) */}
      <NotificationBell
        onOpenCenter={handleOpenCenter}
        onOpenSettings={handleOpenSettings}
      />

      {/* Main Notification Manager */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Main Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-6xl bg-white shadow-2xl overflow-hidden flex"
            >
              {/* Sidebar Navigation */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage your notification experience
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex-1 p-4 space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        w-full flex items-start space-x-3 p-4 rounded-lg text-left transition-all
                        ${activeTab === tab.id 
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm' 
                          : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg
                        ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {tab.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{tab.label}</h3>
                        <p className="text-sm opacity-75 mt-1 line-clamp-2">
                          {tab.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </nav>

                {/* Quick Stats */}
                <div className="p-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unread</span>
                      <span className="font-medium text-blue-600">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">This week</span>
                      <span className="font-medium">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Open rate</span>
                      <span className="font-medium text-green-600">75.4%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                {CurrentComponent && (
                  <div className="h-full overflow-y-auto">
                    {/* Tab Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {currentTab?.icon}
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900">
                            {currentTab?.label}
                          </h1>
                          <p className="text-gray-600">
                            {currentTab?.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      <CurrentComponent
                        isOpen={true}
                        onClose={() => setIsOpen(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// NOTIFICATION TESTING COMPONENT
// ============================================================================

const NotificationTesting: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  const [testType, setTestType] = useState('single');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['in_app']);
  const [testMessage, setTestMessage] = useState({
    title: 'Test Notification',
    message: 'This is a test notification from TouriQuest!',
    priority: 'medium'
  });
  const [sending, setSending] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // Handle sending test notification
  const handleSendTest = async () => {
    setSending(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: testType,
        channels: selectedChannels,
        status: 'success',
        deliveryTime: Math.random() * 2 + 0.5 // 0.5-2.5 seconds
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Test Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Type
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="single">Single Notification</option>
                <option value="batch">Batch Notifications</option>
                <option value="template">Template Test</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channels
              </label>
              <div className="space-y-2">
                {['in_app', 'push', 'email', 'sms'].map(channel => (
                  <label key={channel} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChannels(prev => [...prev, channel]);
                        } else {
                          setSelectedChannels(prev => prev.filter(c => c !== channel));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <div className="flex items-center space-x-2">
                      {channel === 'in_app' && <Bell className="w-4 h-4" />}
                      {channel === 'push' && <Smartphone className="w-4 h-4" />}
                      {channel === 'email' && <Mail className="w-4 h-4" />}
                      {channel === 'sms' && <TestTube className="w-4 h-4" />}
                      <span className="text-sm text-gray-700 capitalize">
                        {channel.replace('_', ' ')}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={testMessage.priority}
                onChange={(e) => setTestMessage(prev => ({ 
                  ...prev, 
                  priority: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Title
              </label>
              <input
                type="text"
                value={testMessage.title}
                onChange={(e) => setTestMessage(prev => ({ 
                  ...prev, 
                  title: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test notification title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Message
              </label>
              <textarea
                value={testMessage.message}
                onChange={(e) => setTestMessage(prev => ({ 
                  ...prev, 
                  message: e.target.value 
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test notification message"
              />
            </div>

            <button
              onClick={handleSendTest}
              disabled={sending || selectedChannels.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Send Test</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
          
          <div className="space-y-3">
            {testResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {result.type} test
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-900">
                    {result.channels.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {result.deliveryTime.toFixed(2)}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testing Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Test notifications in different channels to ensure consistent delivery</li>
          <li>• Try various priority levels to understand user experience impact</li>
          <li>• Use batch testing to simulate high-volume scenarios</li>
          <li>• Monitor delivery times and adjust send frequency accordingly</li>
          <li>• Test templates with real data to verify variable substitution</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationManager;
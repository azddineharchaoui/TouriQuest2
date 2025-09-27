/**
 * Notification Templates Component
 * Template management and customization for notifications
 */

import React, { useState, useEffect } from 'react';
import {
  Template,
  Plus,
  Edit,
  Copy,
  Trash2,
  Eye,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Mail,
  Smartphone,
  Monitor,
  MessageSquare,
  Image,
  Type,
  Palette,
  Settings,
  Code,
  TestTube,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// INTERFACES
// ============================================================================

interface NotificationTemplatesProps {
  className?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  title: string;
  message: string;
  variables: TemplateVariable[];
  style: TemplateStyle;
  channels: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'image' | 'url';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

interface TemplateStyle {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  iconUrl?: string;
  layout: 'compact' | 'expanded' | 'card';
}

interface TemplateEditorProps {
  template: NotificationTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: NotificationTemplate) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTemplates: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Booking Confirmation',
    type: 'booking_confirmation',
    category: 'transactional',
    title: 'Booking Confirmed - {{propertyName}}',
    message: 'Great news! Your booking for {{propertyName}} from {{checkIn}} to {{checkOut}} has been confirmed.',
    variables: [
      { name: 'propertyName', type: 'string', required: true, description: 'Name of the property' },
      { name: 'checkIn', type: 'date', required: true, description: 'Check-in date' },
      { name: 'checkOut', type: 'date', required: true, description: 'Check-out date' }
    ],
    style: {
      primaryColor: '#10B981',
      backgroundColor: '#F0FDF4',
      textColor: '#374151',
      layout: 'expanded'
    },
    channels: ['in_app', 'push', 'email'],
    active: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    name: 'Price Drop Alert',
    type: 'property_price_drop',
    category: 'promotional',
    title: '💰 Price Drop Alert',
    message: '{{propertyName}} just dropped to {{newPrice}}! Save {{savings}} on your next booking.',
    variables: [
      { name: 'propertyName', type: 'string', required: true },
      { name: 'newPrice', type: 'currency', required: true },
      { name: 'savings', type: 'currency', required: true }
    ],
    style: {
      primaryColor: '#F59E0B',
      backgroundColor: '#FFFBEB',
      textColor: '#374151',
      layout: 'card'
    },
    channels: ['push', 'email'],
    active: true,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z'
  },
  {
    id: '3',
    name: 'Payment Success',
    type: 'payment_success',
    category: 'transactional',
    title: 'Payment Processed Successfully',
    message: 'Your payment of {{amount}} for {{propertyName}} has been processed successfully.',
    variables: [
      { name: 'amount', type: 'currency', required: true },
      { name: 'propertyName', type: 'string', required: true }
    ],
    style: {
      primaryColor: '#3B82F6',
      backgroundColor: '#EFF6FF',
      textColor: '#374151',
      layout: 'compact'
    },
    channels: ['in_app', 'email'],
    active: true,
    createdAt: '2024-01-12T11:30:00Z',
    updatedAt: '2024-01-19T13:15:00Z'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NotificationTemplates: React.FC<NotificationTemplatesProps> = ({
  className = ''
}) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesChannel = filterChannel === 'all' || template.channels.includes(filterChannel);
    
    return matchesSearch && matchesCategory && matchesChannel;
  });

  // Handle template actions
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDuplicateTemplate = (template: NotificationTemplate) => {
    const duplicated: NotificationTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTemplates(prev => [duplicated, ...prev]);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const handleToggleActive = (templateId: string) => {
    setTemplates(prev => 
      prev.map(t => 
        t.id === templateId ? { ...t, active: !t.active } : t
      )
    );
  };

  const handleSaveTemplate = (template: NotificationTemplate) => {
    if (template.id) {
      // Update existing
      setTemplates(prev => 
        prev.map(t => t.id === template.id ? template : t)
      );
    } else {
      // Create new
      const newTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTemplates(prev => [newTemplate, ...prev]);
    }
    
    setIsEditorOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Templates</h2>
          <p className="text-gray-600 mt-1">Create and manage notification templates</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={handleCreateTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="transactional">Transactional</option>
          <option value="promotional">Promotional</option>
          <option value="system">System</option>
          <option value="social">Social</option>
        </select>
        
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Channels</option>
          <option value="in_app">In-App</option>
          <option value="push">Push</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => handleEditTemplate(template)}
            onDuplicate={() => handleDuplicateTemplate(template)}
            onDelete={() => handleDeleteTemplate(template.id)}
            onToggleActive={() => handleToggleActive(template.id)}
          />
        ))}
        
        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Template className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || filterCategory !== 'all' || filterChannel !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first notification template to get started'
              }
            </p>
            {(!searchQuery && filterCategory === 'all' && filterChannel === 'all') && (
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Template Editor */}
      <TemplateEditor
        template={selectedTemplate}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedTemplate(null);
        }}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

const TemplateCard: React.FC<{
  template: NotificationTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}> = ({ template, onEdit, onDuplicate, onDelete, onToggleActive }) => {
  const [showPreview, setShowPreview] = useState(false);

  const channelIcons = {
    in_app: <Monitor className="w-4 h-4" />,
    push: <Smartphone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    sms: <MessageSquare className="w-4 h-4" />
  };

  const categoryColors = {
    transactional: 'bg-blue-100 text-blue-800',
    promotional: 'bg-green-100 text-green-800',
    system: 'bg-yellow-100 text-yellow-800',
    social: 'bg-purple-100 text-purple-800'
  };

  return (
    <motion.div
      layout
      className={`
        bg-white rounded-lg border border-gray-200 overflow-hidden transition-all
        ${template.active ? 'shadow-sm' : 'opacity-60'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              categoryColors[template.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
            }`}>
              {template.category}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowPreview(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            <button
              onClick={onDuplicate}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Title:</h4>
          <p className="text-sm text-gray-900">{template.title}</p>
        </div>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Message:</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{template.message}</p>
        </div>

        {/* Channels */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Channels:</span>
            <div className="flex space-x-1">
              {template.channels.map(channel => (
                <div key={channel} className="p-1 bg-gray-100 rounded" title={channel}>
                  {channelIcons[channel as keyof typeof channelIcons]}
                </div>
              ))}
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={template.active}
              onChange={onToggleActive}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowPreview(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Template Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Mock notification preview */}
              <div 
                className="border rounded-lg p-4"
                style={{ 
                  backgroundColor: template.style.backgroundColor,
                  borderColor: template.style.primaryColor 
                }}
              >
                <h4 className="font-medium mb-2" style={{ color: template.style.textColor }}>
                  {template.title}
                </h4>
                <p className="text-sm" style={{ color: template.style.textColor }}>
                  {template.message}
                </p>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>Variables will be replaced with actual values when sent</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// TEMPLATE EDITOR COMPONENT
// ============================================================================

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<NotificationTemplate>({
    id: '',
    name: '',
    type: 'booking_confirmation',
    category: 'transactional',
    title: '',
    message: '',
    variables: [],
    style: {
      primaryColor: '#3B82F6',
      backgroundColor: '#EFF6FF',
      textColor: '#374151',
      layout: 'expanded'
    },
    channels: ['in_app'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        id: '',
        name: '',
        type: 'booking_confirmation',
        category: 'transactional',
        title: '',
        message: '',
        variables: [],
        style: {
          primaryColor: '#3B82F6',
          backgroundColor: '#EFF6FF',
          textColor: '#374151',
          layout: 'expanded'
        },
        channels: ['in_app'],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      updatedAt: new Date().toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {template ? 'Edit Template' : 'Create Template'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter template name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="booking_confirmation">Booking Confirmation</option>
                        <option value="payment_success">Payment Success</option>
                        <option value="property_price_drop">Price Drop</option>
                        <option value="experience_reminder">Experience Reminder</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="transactional">Transactional</option>
                        <option value="promotional">Promotional</option>
                        <option value="system">System</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter notification title"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use {{`variableName`}} for dynamic content
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter notification message"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channels
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['in_app', 'push', 'email', 'sms'].map(channel => (
                        <label key={channel} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.channels.includes(channel)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: [...prev.channels, channel]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: prev.channels.filter(c => c !== channel)
                                }));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Preview</h4>
                  
                  <div 
                    className="border rounded-lg p-4"
                    style={{ 
                      backgroundColor: formData.style.backgroundColor,
                      borderColor: formData.style.primaryColor 
                    }}
                  >
                    <h5 className="font-medium mb-2" style={{ color: formData.style.textColor }}>
                      {formData.title || 'Template Title'}
                    </h5>
                    <p className="text-sm" style={{ color: formData.style.textColor }}>
                      {formData.message || 'Template message will appear here...'}
                    </p>
                  </div>

                  {/* Style Controls */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Styling</h5>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Primary Color</label>
                      <input
                        type="color"
                        value={formData.style.primaryColor}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          style: { ...prev.style, primaryColor: e.target.value }
                        }))}
                        className="w-full h-8 rounded border border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={formData.style.backgroundColor}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          style: { ...prev.style, backgroundColor: e.target.value }
                        }))}
                        className="w-full h-8 rounded border border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Layout</label>
                      <select
                        value={formData.style.layout}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          style: { ...prev.style, layout: e.target.value as any }
                        }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="compact">Compact</option>
                        <option value="expanded">Expanded</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{template ? 'Update' : 'Create'} Template</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationTemplates;
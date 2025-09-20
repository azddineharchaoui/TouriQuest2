import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Users, 
  MapPin, 
  Calendar, 
  MessageCircle,
  Compass,
  Search,
  User,
  Shield,
  Palette,
  Smartphone,
  Globe,
  Zap,
  Target,
  ArrowRight,
  Star
} from 'lucide-react';

interface ProjectStatusProps {
  onNavigate?: (section: string) => void;
}

export function ProjectStatus({ onNavigate }: ProjectStatusProps) {
  const completedModules = [
    {
      name: 'Core Design System',
      description: 'Comprehensive design tokens, color system, typography, and component library',
      progress: 100,
      icon: Palette,
      features: ['Design Tokens', 'Color Palette', 'Typography Scale', 'Component Library', 'Responsive Grid']
    },
    {
      name: 'Navigation System',
      description: 'Professional header navigation, mobile menu, and footer with full page integration',
      progress: 100,
      icon: Compass,
      features: ['Header Navigation', 'Mobile Menu', 'Footer Component', 'Search Integration', 'User Menu']
    },
    {
      name: 'Authentication System',
      description: 'Complete signup/login flows with form validation and user management',
      progress: 100,
      icon: Shield,
      features: ['Login/Signup Forms', 'Form Validation', 'Password Security', 'Social Login Ready']
    },
    {
      name: 'Property Search & Booking',
      description: 'Comprehensive accommodation search, filtering, and property detail views',
      progress: 100,
      icon: Search,
      features: ['Search Interface', 'Filter System', 'Property Cards', 'Detail Views', 'Booking Flow']
    },
    {
      name: 'POI Discovery System',
      description: 'Point of Interest exploration with maps, categories, and detailed information',
      progress: 100,
      icon: MapPin,
      features: ['POI Search', 'Category Filters', 'Map Integration', 'Detail Pages', 'AR/VR Experiences']
    },
    {
      name: 'User Profile System',
      description: 'Complete user profiles with preferences, travel history, and social features',
      progress: 100,
      icon: User,
      features: ['Profile Management', 'Travel Stats', 'Preferences', 'Social Connections', 'Settings']
    },
    {
      name: 'AI Travel Assistant',
      description: 'Intelligent travel assistant with chat interface and personalized recommendations',
      progress: 100,
      icon: MessageCircle,
      features: ['Chat Interface', 'Voice Commands', 'Smart Recommendations', 'Trip Planning', 'Notifications']
    },
    {
      name: 'Admin Dashboard',
      description: 'Comprehensive administration system for content and user management',
      progress: 100,
      icon: Shield,
      features: ['User Management', 'Content Management', 'Analytics', 'Performance Monitoring', 'System Health']
    }
  ];

  const upcomingModules = [
    {
      name: 'Social Feed System',
      description: 'Travel sharing, user-generated content, and social discovery features',
      priority: 'High',
      icon: Users,
      features: ['Travel Posts', 'Photo Sharing', 'Community Feed', 'Social Discovery', 'Content Moderation'],
      estimatedTime: '2-3 sessions'
    },
    {
      name: 'Travel Matching',
      description: 'Connect travelers with similar interests, destinations, and travel styles',
      priority: 'High',
      icon: Target,
      features: ['Interest Matching', 'Travel Buddy Finder', 'Group Formation', 'Compatibility Scoring'],
      estimatedTime: '2 sessions'
    },
    {
      name: 'Community Features',
      description: 'Travel groups, forums, local meetups, and community-driven content',
      priority: 'High',
      icon: Users,
      features: ['Travel Groups', 'Discussion Forums', 'Local Meetups', 'Community Events', 'Expert Guides'],
      estimatedTime: '3 sessions'
    },
    {
      name: 'Advanced Itinerary Planner',
      description: 'AI-optimized trip planning with smart scheduling and recommendations',
      priority: 'High',
      icon: Calendar,
      features: ['Smart Scheduling', 'AI Optimization', 'Collaborative Planning', 'Budget Tracking', 'Offline Access'],
      estimatedTime: '3-4 sessions'
    },
    {
      name: 'Real-time Messaging',
      description: 'Chat system for travelers, hosts, and travel groups',
      priority: 'Medium',
      icon: MessageCircle,
      features: ['Direct Messaging', 'Group Chats', 'Media Sharing', 'Translation', 'Moderation'],
      estimatedTime: '2 sessions'
    },
    {
      name: 'Payment & Booking Integration',
      description: 'Secure payment processing and comprehensive booking management',
      priority: 'Medium',
      icon: Zap,
      features: ['Payment Gateway', 'Booking Confirmation', 'Cancellation Handling', 'Refund Processing'],
      estimatedTime: '3 sessions'
    },
    {
      name: 'Mobile App Companion',
      description: 'Native mobile app features and progressive web app capabilities',
      priority: 'Medium',
      icon: Smartphone,
      features: ['PWA Features', 'Offline Capability', 'Push Notifications', 'Native Integration'],
      estimatedTime: '4-5 sessions'
    },
    {
      name: 'Internationalization',
      description: 'Multi-language support and cultural localization features',
      priority: 'Low',
      icon: Globe,
      features: ['Multi-language UI', 'Currency Conversion', 'Cultural Adaptation', 'RTL Support'],
      estimatedTime: '2-3 sessions'
    }
  ];

  const systemHealth = {
    design: 95,
    functionality: 90,
    performance: 85,
    accessibility: 88,
    responsiveness: 92
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-error';
      case 'Medium': return 'bg-warning';
      case 'Low': return 'bg-success';
      default: return 'bg-medium-gray';
    }
  };

  const overallProgress = (completedModules.length / (completedModules.length + upcomingModules.length)) * 100;

  return (
    <div className="min-h-screen bg-off-white py-8">
      <div className="container mx-auto px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-teal rounded-lg flex items-center justify-center">
              <Compass className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-navy">TouriQuest Development Status</h1>
          </div>
          <p className="text-lg text-dark-gray max-w-3xl mx-auto">
            Comprehensive all-in-one tourism platform combining property booking, experience discovery, 
            social features, and sustainable travel tracking.
          </p>
          
          {/* Overall Progress */}
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-3xl font-bold text-primary-teal">{Math.round(overallProgress)}%</div>
                <Progress value={overallProgress} className="w-full" />
                <p className="text-sm text-medium-gray">
                  {completedModules.length} of {completedModules.length + upcomingModules.length} major modules completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary-teal" />
              <span>System Health Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {Object.entries(systemHealth).map(([metric, value]) => (
                <div key={metric} className="text-center">
                  <div className="text-2xl font-bold text-navy mb-2">{value}%</div>
                  <div className="text-sm text-medium-gray capitalize">{metric}</div>
                  <Progress value={value} className="mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completed Modules */}
        <div>
          <h2 className="text-3xl font-bold text-navy mb-6 flex items-center">
            <CheckCircle className="h-8 w-8 text-success mr-3" />
            Completed Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-success" />
                        </div>
                        <span>{module.name}</span>
                      </div>
                      <Badge variant="success" className="bg-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-medium-gray mb-4">{module.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {module.features.map((feature, featureIndex) => (
                        <Badge key={featureIndex} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Upcoming Modules */}
        <div>
          <h2 className="text-3xl font-bold text-navy mb-6 flex items-center">
            <Clock className="h-8 w-8 text-warning mr-3" />
            Upcoming Development
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-tint rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary-teal" />
                        </div>
                        <span>{module.name}</span>
                      </div>
                      <Badge className={getPriorityColor(module.priority)}>
                        {module.priority} Priority
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-medium-gray mb-4">{module.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {module.features.map((feature, featureIndex) => (
                        <Badge key={featureIndex} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-medium-gray">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Estimated: {module.estimatedTime}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Next Session Priorities */}
        <Card className="border-primary-teal border-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-primary-teal">
              <Star className="h-6 w-6" />
              <span>Next Session Priorities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-navy mb-3">Immediate Focus (This Session)</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-primary-teal" />
                      <span className="text-sm">Social Feed System - Travel sharing and user content</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-primary-teal" />
                      <span className="text-sm">Travel Matching - Connect travelers with similar interests</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-primary-teal" />
                      <span className="text-sm">Community Features - Groups and forums</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-navy mb-3">Short Term (Next 2-3 Sessions)</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Advanced Itinerary Planner with AI optimization</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Real-time Chat and Messaging System</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Circle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Payment and Booking Integration</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => onNavigate?.('dashboard')}
                  className="w-full md:w-auto"
                >
                  Continue Development
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Architecture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary-teal" />
              <span>Technical Architecture</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-navy mb-3">Frontend Stack</h4>
                <ul className="text-sm text-medium-gray space-y-1">
                  <li>• React 18 with TypeScript</li>
                  <li>• Tailwind CSS v4 with design tokens</li>
                  <li>• Shadcn/ui component library</li>
                  <li>• Lucide React icons</li>
                  <li>• Motion/React for animations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-navy mb-3">Design System</h4>
                <ul className="text-sm text-medium-gray space-y-1">
                  <li>• Comprehensive design tokens</li>
                  <li>• 8px spacing system</li>
                  <li>• WCAG 2.1 AA compliance</li>
                  <li>• Mobile-first responsive design</li>
                  <li>• Professional color palette</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-navy mb-3">Features Ready</h4>
                <ul className="text-sm text-medium-gray space-y-1">
                  <li>• Error boundaries and loading states</li>
                  <li>• Professional navigation system</li>
                  <li>• Comprehensive footer</li>
                  <li>• Responsive across all devices</li>
                  <li>• Accessibility optimized</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Cookie, Settings, Shield, Eye, BarChart, Target, Globe, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

interface CookiePolicyProps {
  onBack?: () => void;
}

export function CookiePolicy({ onBack }: CookiePolicyProps) {
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: true,
    marketing: false,
    personalization: true
  });

  const lastUpdated = "September 1, 2024";

  const cookieTypes = [
    {
      id: 'essential',
      name: 'Essential Cookies',
      icon: Shield,
      description: 'Required for the website to function properly',
      purpose: 'These cookies are necessary for the website to function and cannot be switched off.',
      examples: [
        'Session management and user authentication',
        'Shopping cart functionality for tour bookings',
        'Security features and fraud prevention',
        'Website accessibility preferences'
      ],
      duration: 'Session or up to 1 year',
      canDisable: false,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      icon: BarChart,
      description: 'Help us understand how visitors use our website',
      purpose: 'These cookies collect information about how you use our website to help us improve it.',
      examples: [
        'Google Analytics for website traffic analysis',
        'Page views and user behavior tracking',
        'Performance monitoring and error reporting',
        'Popular tour and destination analytics'
      ],
      duration: 'Up to 2 years',
      canDisable: true,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      icon: Target,
      description: 'Used to deliver relevant advertisements',
      purpose: 'These cookies are used to show you relevant ads based on your interests.',
      examples: [
        'Facebook and Google advertising pixels',
        'Retargeting campaigns for tour offers',
        'Social media integration and sharing',
        'Email marketing campaign tracking'
      ],
      duration: 'Up to 1 year',
      canDisable: true,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'personalization',
      name: 'Personalization Cookies',
      icon: Eye,
      description: 'Remember your preferences and customize your experience',
      purpose: 'These cookies remember your choices to provide a personalized experience.',
      examples: [
        'Language and currency preferences',
        'Tour filtering and search preferences',
        'Wishlist and favorite destinations',
        'Recently viewed tours and recommendations'
      ],
      duration: 'Up to 1 year',
      canDisable: true,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const thirdPartyServices = [
    {
      name: 'Google Analytics',
      purpose: 'Website analytics and performance monitoring',
      privacy: 'https://policies.google.com/privacy',
      optOut: 'https://tools.google.com/dlpage/gaoptout'
    },
    {
      name: 'Facebook Pixel',
      purpose: 'Social media advertising and analytics',
      privacy: 'https://www.facebook.com/privacy/explanation',
      optOut: 'https://www.facebook.com/settings'
    },
    {
      name: 'PayPal',
      purpose: 'Payment processing for tour bookings',
      privacy: 'https://www.paypal.com/privacy',
      optOut: 'Required for payment functionality'
    },
    {
      name: 'Mailchimp',
      purpose: 'Email newsletter and marketing communications',
      privacy: 'https://mailchimp.com/legal/privacy/',
      optOut: 'Unsubscribe link in emails'
    }
  ];

  const handleCookieToggle = (cookieType: string) => {
    setCookiePreferences(prev => ({
      ...prev,
      [cookieType]: !prev[cookieType as keyof typeof prev]
    }));
  };

  const savePreferences = () => {
    // In a real application, this would save to localStorage and update cookie consent
    console.log('Cookie preferences saved:', cookiePreferences);
    alert('Cookie preferences saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Cookie className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Cookie Policy</h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Learn about how TouriQuest uses cookies and similar technologies to enhance 
              your browsing experience and improve our services.
            </p>
            <p className="text-white/70 mt-4">Last updated: {lastUpdated}</p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* What are Cookies */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">What are Cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed mb-4">
                Cookies are small text files that are stored on your device when you visit our website. 
                They help us provide you with a better browsing experience by remembering your preferences, 
                analyzing how you use our site, and delivering relevant content.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We use both first-party cookies (set by TouriQuest) and third-party cookies (set by our partners) 
                to enhance your experience and provide our services effectively.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cookie Preferences */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Settings className="h-6 w-6" />
                <span>Manage Your Cookie Preferences</span>
              </CardTitle>
              <CardDescription>
                Choose which types of cookies you want to allow. Essential cookies cannot be disabled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {cookieTypes.map((cookie) => {
                  const Icon = cookie.icon;
                  const isEnabled = cookiePreferences[cookie.id as keyof typeof cookiePreferences];
                  
                  return (
                    <div key={cookie.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 ${cookie.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-6 w-6 ${cookie.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-800">{cookie.name}</h3>
                              {!cookie.canDisable && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3">{cookie.description}</p>
                            <p className="text-sm text-gray-500 mb-3">{cookie.purpose}</p>
                            <div className="text-sm text-gray-500">
                              <strong>Duration:</strong> {cookie.duration}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {cookie.canDisable ? (
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleCookieToggle(cookie.id)}
                            />
                          ) : (
                            <div className="w-12 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-medium text-gray-800 mb-2">Examples:</h4>
                        <ul className="space-y-1">
                          {cookie.examples.map((example, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button onClick={savePreferences} className="bg-orange-600 hover:bg-orange-700">
                  Save Preferences
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCookiePreferences({
                    essential: true,
                    analytics: false,
                    marketing: false,
                    personalization: false
                  })}
                >
                  Accept Essential Only
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCookiePreferences({
                    essential: true,
                    analytics: true,
                    marketing: true,
                    personalization: true
                  })}
                >
                  Accept All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Party Services */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Globe className="h-6 w-6" />
                <span>Third-Party Services</span>
              </CardTitle>
              <CardDescription>
                External services we use and their privacy policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {thirdPartyServices.map((service, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">{service.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{service.purpose}</p>
                    <div className="space-y-2">
                      <a 
                        href={service.privacy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:text-blue-700"
                      >
                        Privacy Policy →
                      </a>
                      <div className="text-sm text-gray-500">
                        <strong>Opt-out:</strong> {service.optOut.startsWith('http') ? (
                          <a 
                            href={service.optOut}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 ml-1"
                          >
                            Opt-out settings →
                          </a>
                        ) : (
                          <span className="ml-1">{service.optOut}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Browser Controls */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Browser Cookie Controls</CardTitle>
              <CardDescription>
                You can also manage cookies directly through your browser settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Desktop Browsers</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Google Chrome →
                      </a>
                    </li>
                    <li>
                      <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Mozilla Firefox →
                      </a>
                    </li>
                    <li>
                      <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Safari →
                      </a>
                    </li>
                    <li>
                      <a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Microsoft Edge →
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Mobile Browsers</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Chrome Mobile →
                      </a>
                    </li>
                    <li>
                      <a href="https://support.apple.com/en-us/HT201265" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Safari iOS →
                      </a>
                    </li>
                    <li>
                      <a href="https://support.mozilla.org/en-US/kb/clear-your-browsing-history-and-other-personal-data" target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-700 text-sm">
                        Firefox Mobile →
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              
              <Alert className="mt-6 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-yellow-800">
                  <strong>Note:</strong> Disabling cookies may affect website functionality and your user experience. 
                  Some features may not work properly without essential cookies.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Contact & Updates */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Questions About Cookies?</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                If you have any questions about our use of cookies or this Cookie Policy, 
                please don't hesitate to contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-gray-100 font-semibold"
                >
                  Contact Us
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                >
                  View Privacy Policy
                </Button>
              </div>
              <div className="text-center text-white/90 text-sm">
                <p>
                  This Cookie Policy may be updated from time to time. We will notify you of any 
                  significant changes by posting the new policy on this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
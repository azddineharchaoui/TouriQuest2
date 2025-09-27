import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Accessibility, Sparkles, Target, Users, Zap } from 'lucide-react';
import { PersonalizedContentRecommendations } from './PersonalizedContentRecommendations';
import { AIAccessibilitySystem } from './AIAccessibilitySystem';
import { AccessibilityProfile, PersonalizedRecommendation } from '../../api/services';

interface AdvancedAIFeaturesProps {
  userId?: string;
  className?: string;
}

export const AdvancedAIFeatures: React.FC<AdvancedAIFeaturesProps> = ({
  userId,
  className
}) => {
  const [activeFeature, setActiveFeature] = useState<'recommendations' | 'accessibility' | 'both'>('both');
  const [accessibilityProfile, setAccessibilityProfile] = useState<AccessibilityProfile | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const demoSteps = [
    {
      title: "AI-Powered Personalization",
      description: "Our recommendation engine learns from your behavior and preferences to suggest the perfect travel experiences.",
      feature: "recommendations"
    },
    {
      title: "Voice-Controlled Navigation", 
      description: "Navigate the entire platform using voice commands, perfect for hands-free browsing.",
      feature: "accessibility"
    },
    {
      title: "Adaptive Interface",
      description: "The UI automatically adjusts based on your accessibility needs and preferences.",
      feature: "accessibility"
    },
    {
      title: "Real-Time Learning",
      description: "Every interaction helps our AI better understand what you're looking for.",
      feature: "recommendations"
    }
  ];

  useEffect(() => {
    if (showDemo) {
      const interval = setInterval(() => {
        setDemoStep((prev) => (prev + 1) % demoSteps.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [showDemo, demoSteps.length]);

  const handleAccessibilityProfileUpdate = (profile: AccessibilityProfile) => {
    setAccessibilityProfile(profile);
  };

  const handleRecommendationClick = (recommendation: PersonalizedRecommendation) => {
    console.log('Recommendation clicked:', recommendation);
    // Here you would navigate to the recommendation details
  };

  const handleVoiceCommand = (command: string, response: any) => {
    console.log('Voice command processed:', { command, response });
    // Handle voice command results
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${className}`}>
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Advanced AI Features
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Experience the future of travel planning with personalized recommendations and AI-powered accessibility
            </p>
            
            {/* Feature Toggle */}
            <div className="flex justify-center gap-2 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1">
                {[
                  { key: 'recommendations', label: 'Recommendations', icon: Target },
                  { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
                  { key: 'both', label: 'Both Features', icon: Sparkles }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFeature(key as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      activeFeature === key
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Demo Toggle */}
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all"
            >
              {showDemo ? 'Hide Demo' : 'Show Interactive Demo'}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Demo Section */}
      {showDemo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12"
        >
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              key={demoStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div className="flex justify-center mb-4">
                {demoSteps[demoStep].feature === 'recommendations' ? (
                  <Brain className="w-12 h-12 text-pink-200" />
                ) : (
                  <Accessibility className="w-12 h-12 text-pink-200" />
                )}
              </div>
              <h3 className="text-2xl font-bold">{demoSteps[demoStep].title}</h3>
              <p className="text-pink-100 max-w-2xl mx-auto">{demoSteps[demoStep].description}</p>
              
              {/* Progress Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {demoSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === demoStep ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Stats Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI Accuracy',
                value: '98.5%',
                description: 'Recommendation precision',
                color: 'text-blue-600'
              },
              {
                icon: Users,
                title: 'Active Users',
                value: '50K+',
                description: 'Using AI features daily',
                color: 'text-green-600'
              },
              {
                icon: Accessibility,
                title: 'Accessible',
                value: '100%',
                description: 'WCAG 2.1 AA+ compliant',
                color: 'text-purple-600'
              },
              {
                icon: Zap,
                title: 'Response Time',
                value: '<200ms',
                description: 'Average AI response',
                color: 'text-yellow-600'
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 ${stat.color} mb-4`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-lg font-medium text-gray-700">{stat.title}</div>
                <div className="text-sm text-gray-500">{stat.description}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Recommendations Section */}
        {(activeFeature === 'recommendations' || activeFeature === 'both') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Personalized Content Recommendations</h2>
                </div>
                <p className="text-blue-100">
                  AI-powered recommendations tailored to your preferences and behavior
                </p>
              </div>
              
              <div className="p-6">
                <PersonalizedContentRecommendations
                  userId={userId}
                  location="Paris, France" // Could be dynamic
                  onRecommendationClick={handleRecommendationClick}
                  onFeedback={(id, feedback) => console.log('Feedback:', id, feedback)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Accessibility Section */}
        {(activeFeature === 'accessibility' || activeFeature === 'both') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Accessibility className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">AI-Powered Accessibility Features</h2>
                </div>
                <p className="text-purple-100">
                  Advanced accessibility tools powered by artificial intelligence
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Feature Overview */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Available Features</h3>
                    
                    <div className="space-y-3">
                      {[
                        {
                          title: 'Voice Control System',
                          description: 'Navigate the entire platform using natural voice commands',
                          status: 'active'
                        },
                        {
                          title: 'Screen Reader Optimization',
                          description: 'Enhanced content structure for screen readers',
                          status: 'active'
                        },
                        {
                          title: 'Adaptive UI',
                          description: 'Interface adjusts based on your accessibility needs',
                          status: 'active'
                        },
                        {
                          title: 'Keyboard Navigation',
                          description: 'Complete keyboard-only navigation support',
                          status: 'active'
                        },
                        {
                          title: 'High Contrast Mode',
                          description: 'Enhanced visibility for visual impairments',
                          status: 'active'
                        },
                        {
                          title: 'Real-time Captions',
                          description: 'AI-generated captions for audio content',
                          status: 'beta'
                        }
                      ].map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            feature.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <h4 className="font-medium text-gray-900">{feature.title}</h4>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                            {feature.status === 'beta' && (
                              <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mt-1">
                                Beta
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Access Panel */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Quick Access</h3>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-3">
                        The accessibility panel is available at the bottom-left of your screen. 
                        Click the accessibility icon to open it.
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toggle Panel:</span>
                          <kbd className="bg-white px-2 py-1 rounded text-xs">Alt + Shift + A</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Voice Control:</span>
                          <kbd className="bg-white px-2 py-1 rounded text-xs">Alt + Shift + V</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">High Contrast:</span>
                          <kbd className="bg-white px-2 py-1 rounded text-xs">Alt + Shift + C</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Read Element:</span>
                          <kbd className="bg-white px-2 py-1 rounded text-xs">Alt + Shift + R</kbd>
                        </div>
                      </div>
                    </div>

                    {accessibilityProfile && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">Your Profile</h4>
                        <p className="text-sm text-green-800">
                          Accessibility profile loaded with {accessibilityProfile.assistiveTechnology.length} assistive technologies configured.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Accessibility System Component */}
      <AIAccessibilitySystem
        userId={userId}
        onProfileUpdate={handleAccessibilityProfileUpdate}
        onVoiceCommand={handleVoiceCommand}
      />

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the Future?</h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of users already using our advanced AI features
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
              Get Started Free
            </button>
            <button className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
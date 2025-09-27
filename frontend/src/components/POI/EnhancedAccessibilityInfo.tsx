import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Accessibility, 
  CheckCircle, 
  XCircle,
  Car,
  Ear,
  Eye,
  Brain,
  Heart,
  Navigation,
  Headphones,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Users,
  Star,
  Info,
  QrCode,
  Trophy,
  Gift,
  Languages,
  Volume2,
  VolumeX,
  Camera,
  Route,
  CalendarClock,
  Shield,
  AlertTriangle,
  PawPrint,
  Lightbulb,
  Sun,
  Moon
} from 'lucide-react';

interface AccessibilityData {
  wheelchairAccessible: boolean;
  visuallyImpairedSupport: boolean;
  hearingImpairedSupport: boolean;
  cognitiveSupport: boolean;
  serviceAnimals: boolean;
  features: string[];
  wheelchairPaths?: WheelchairPath[];
  sensoryFriendlyTimes?: SensoryTime[];
  serviceAnimalPolicies?: ServiceAnimalPolicy[];
  multilingualSupport?: Language[];
  qrCheckIn?: boolean;
  gamificationFeatures?: GameFeature[];
  loyaltyIntegrations?: LoyaltyProgram[];
  localBusinessPerks?: BusinessPerk[];
  badgeCollections?: Badge[];
}

interface WheelchairPath {
  id: string;
  name: string;
  distance: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  features: string[];
  description: string;
}

interface SensoryTime {
  day: string;
  timeSlot: string;
  features: string[];
  description: string;
}

interface ServiceAnimalPolicy {
  type: string;
  allowed: boolean;
  restrictions?: string[];
  accommodations: string[];
}

interface Language {
  code: string;
  name: string;
  available: boolean;
  features: string[];
}

interface GameFeature {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
}

interface LoyaltyProgram {
  name: string;
  points: number;
  benefits: string[];
  tier: string;
}

interface BusinessPerk {
  business: string;
  discount: string;
  description: string;
  validUntil?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  progress?: number;
  total?: number;
}

interface EnhancedAccessibilityInfoProps {
  accessibility: AccessibilityData;
}

export const EnhancedAccessibilityInfo: React.FC<EnhancedAccessibilityInfoProps> = ({ accessibility }) => {
  const [activeTab, setActiveTab] = useState<'accessibility' | 'paths' | 'times' | 'language' | 'engagement'>('accessibility');
  const [darkMode, setDarkMode] = useState(false);

  const accessibilityFeatures = [
    {
      key: 'wheelchairAccessible',
      label: 'Wheelchair Accessible',
      icon: Car,
      description: 'Full wheelchair access with ramps, elevators, and accessible restrooms',
      available: accessibility.wheelchairAccessible,
      color: 'blue'
    },
    {
      key: 'visuallyImpairedSupport',
      label: 'Visually Impaired Support',
      icon: Eye,
      description: 'Braille signage, audio descriptions, and tactile guidance',
      available: accessibility.visuallyImpairedSupport,
      color: 'purple'
    },
    {
      key: 'hearingImpairedSupport',
      label: 'Hearing Impaired Support',
      icon: Ear,
      description: 'Sign language interpretation, hearing loops, and visual alerts',
      available: accessibility.hearingImpairedSupport,
      color: 'green'
    },
    {
      key: 'cognitiveSupport',
      label: 'Cognitive Support',
      icon: Brain,
      description: 'Simplified navigation, clear signage, and additional assistance',
      available: accessibility.cognitiveSupport,
      color: 'orange'
    },
    {
      key: 'serviceAnimals',
      label: 'Service Animals Welcome',
      icon: Heart,
      description: 'Service animals permitted with designated areas and facilities',
      available: accessibility.serviceAnimals,
      color: 'red'
    }
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) return 'border-gray-200 bg-gray-50';
    
    const colorMap: { [key: string]: string } = {
      blue: 'border-blue-200 bg-blue-50',
      purple: 'border-purple-200 bg-purple-50',
      green: 'border-green-200 bg-green-50',
      orange: 'border-orange-200 bg-orange-50',
      red: 'border-red-200 bg-red-50'
    };
    
    return colorMap[color] || 'border-gray-200 bg-gray-50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-8 ${darkMode ? 'bg-gray-900' : 'bg-white'} transition-colors`}
    >
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-xl text-white p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Accessibility className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Accessibility & Inclusion</h2>
              <p className="text-white/80">Creating an inclusive experience for all visitors</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Volume2 className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Languages className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {accessibilityFeatures.filter(f => f.available).length}
            </div>
            <div className="text-sm text-white/80">Features Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">15+</div>
            <div className="text-sm text-white/80">Languages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">24/7</div>
            <div className="text-sm text-white/80">Support Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Free</div>
            <div className="text-sm text-white/80">All Services</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">AAA</div>
            <div className="text-sm text-white/80">WCAG Certified</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-6 overflow-x-auto">
          {[
            { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
            { id: 'paths', label: 'Wheelchair Paths', icon: Route },
            { id: 'times', label: 'Sensory-Friendly', icon: CalendarClock },
            { id: 'language', label: 'Languages', icon: Languages },
            { id: 'engagement', label: 'Engagement', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-8`}>
        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Accessibility Features</h3>
            
            {/* Enhanced Accessibility Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessibilityFeatures.map((feature) => (
                <motion.div
                  key={feature.key}
                  whileHover={{ y: -2 }}
                  className={`p-6 rounded-2xl border-2 transition-all ${getColorClasses(feature.color, feature.available)} ${darkMode ? 'bg-gray-700' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      feature.available 
                        ? `bg-${feature.color}-100 text-${feature.color}-600` 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{feature.label}</h3>
                        {feature.available ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                        {feature.description}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          feature.available ? 'text-green-600' : 'text-red-400'
                        }`}>
                          {feature.available ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Additional Features */}
            {accessibility.features.length > 0 && (
              <div>
                <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Additional Features</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {accessibility.features.map((feature, index) => (
                    <div key={index} className={`flex items-center gap-3 p-4 ${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg`}>
                      <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className={`${darkMode ? 'text-blue-200' : 'text-blue-900'} font-medium`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wheelchair Paths Tab */}
        {activeTab === 'paths' && (
          <div className="space-y-6">
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Wheelchair Accessible Paths</h3>
            
            <div className="space-y-4">
              {accessibility.wheelchairPaths?.map((path) => (
                <div key={path.id} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-6 border`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{path.name}</h4>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{path.description}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${path.difficulty === 'easy' ? 'text-green-600' : path.difficulty === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1)}
                      </span>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{path.distance}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {path.features.map((feature, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )) || (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <Route className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Wheelchair path information available upon request.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sensory-Friendly Times Tab */}
        {activeTab === 'times' && (
          <div className="space-y-6">
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sensory-Friendly Experience</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {accessibility.sensoryFriendlyTimes?.map((time, index) => (
                <div key={index} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-6 border`}>
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarClock className="w-6 h-6 text-green-500" />
                    <div>
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{time.day}</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{time.timeSlot}</p>
                    </div>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>{time.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {time.features.map((feature, idx) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )) || (
                <div className={`text-center py-8 col-span-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <CalendarClock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Sensory-friendly accommodations available daily. Contact us for details.</p>
                </div>
              )}
            </div>

            {/* Service Animal Policies */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Service Animal Policies</h4>
              <div className="space-y-3">
                {accessibility.serviceAnimalPolicies?.map((policy, index) => (
                  <div key={index} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                    <div className="flex items-center gap-3 mb-2">
                      <PawPrint className={`w-5 h-5 ${policy.allowed ? 'text-green-500' : 'text-red-500'}`} />
                      <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{policy.type}</h5>
                      <span className={`text-sm px-2 py-1 rounded ${policy.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {policy.allowed ? 'Welcome' : 'Restricted'}
                      </span>
                    </div>
                    <div className="ml-8">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {policy.accommodations.map((accommodation, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {accommodation}
                          </span>
                        ))}
                      </div>
                      {policy.restrictions && policy.restrictions.length > 0 && (
                        <div className="text-sm text-orange-600">
                          Restrictions: {policy.restrictions.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <PawPrint className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p>Service animals are welcome with proper documentation.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Language Support Tab */}
        {activeTab === 'language' && (
          <div className="space-y-6">
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Multilingual Support</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(accessibility.multilingualSupport || [
                { code: 'en', name: 'English', available: true, features: ['Audio Guide', 'Signage', 'Staff'] },
                { code: 'es', name: 'Spanish', available: true, features: ['Audio Guide', 'Basic Signage'] },
                { code: 'fr', name: 'French', available: true, features: ['Audio Guide'] },
                { code: 'de', name: 'German', available: true, features: ['Audio Guide'] },
                { code: 'zh', name: 'Chinese', available: true, features: ['Audio Guide', 'Printed Materials'] },
                { code: 'ja', name: 'Japanese', available: false, features: [] }
              ]).map((language) => (
                <div key={language.code} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Languages className="w-5 h-5 text-blue-500" />
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{language.name}</span>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded ${language.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {language.available ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                  {language.available && (
                    <div className="flex flex-wrap gap-1">
                      {language.features.map((feature, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && (
          <div className="space-y-6">
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Engagement & Rewards</h3>

            {/* QR Check-in */}
            <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg p-6`}>
              <div className="flex items-center gap-4 mb-4">
                <QrCode className="w-8 h-8 text-blue-500" />
                <div>
                  <h4 className={`text-lg font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>QR Check-in</h4>
                  <p className={`${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Scan to check-in and earn accessibility points</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Open Scanner
              </button>
            </div>

            {/* Gamification Features */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Accessibility Challenges</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {(accessibility.gamificationFeatures || [
                  { id: '1', name: 'Accessibility Explorer', description: 'Visit 5 accessible locations', points: 100, icon: 'trophy' },
                  { id: '2', name: 'Inclusive Reviewer', description: 'Write accessibility reviews', points: 50, icon: 'star' },
                  { id: '3', name: 'Community Helper', description: 'Help other visitors', points: 75, icon: 'heart' }
                ]).map((feature) => (
                  <div key={feature.id} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{feature.name}</h5>
                      <span className="text-sm font-bold text-yellow-600">+{feature.points}</span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Business Perks */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Accessibility Partner Perks</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {(accessibility.localBusinessPerks || [
                  { business: 'Accessible Cafe', discount: '10% off', description: 'Wheelchair accessible seating and Braille menus' },
                  { business: 'Inclusive Tours', discount: '15% off', description: 'Specialized accessibility tours with trained guides' }
                ]).map((perk, index) => (
                  <div key={index} className={`${darkMode ? 'bg-green-900' : 'bg-green-50'} rounded-lg p-4`}>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-900'}`}>{perk.business}</h5>
                      <span className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{perk.discount}</span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'} mb-2`}>{perk.description}</p>
                    {perk.validUntil && (
                      <p className={`text-xs ${darkMode ? 'text-green-300' : 'text-green-600'}`}>Valid until: {perk.validUntil}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Badge Collections */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Accessibility Badges</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(accessibility.badgeCollections || [
                  { id: '1', name: 'First Visit', description: 'Welcome!', earned: true },
                  { id: '2', name: 'Reviewer', description: 'Share experience', earned: true },
                  { id: '3', name: 'Explorer', description: 'Visit 10 places', earned: false, progress: 3, total: 10 },
                  { id: '4', name: 'Champion', description: 'Accessibility advocate', earned: false }
                ]).map((badge) => (
                  <div key={badge.id} className={`text-center p-4 rounded-lg border-2 ${badge.earned ? (darkMode ? 'border-yellow-400 bg-yellow-900' : 'border-yellow-400 bg-yellow-50') : (darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50')}`}>
                    <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${badge.earned ? 'bg-yellow-400' : 'bg-gray-400'}`}>
                      <Trophy className={`w-6 h-6 ${badge.earned ? 'text-yellow-900' : 'text-white'}`} />
                    </div>
                    <h5 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{badge.name}</h5>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{badge.description}</p>
                    {badge.progress && badge.total && (
                      <div className="mt-2">
                        <div className={`w-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}>
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                          ></div>
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {badge.progress}/{badge.total}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact & Support */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-8`}>
        <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Need Assistance?</h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Call Us</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Accessibility Hotline</p>
            <p className="font-medium text-blue-600">+1 (555) 123-4567</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Live Chat</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>24/7 Support Available</p>
            <button className="font-medium text-green-600 hover:text-green-700">
              Start Chat
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Visit Us</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Information Desk</p>
            <p className="font-medium text-purple-600">Main Entrance</p>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl shadow-xl text-white p-8">
        <h3 className="text-2xl font-bold mb-4">Your Feedback Matters</h3>
        <p className="text-white/90 mb-6">
          We're constantly working to improve our accessibility features and services. 
          Please share your experience or suggestions with us.
        </p>
        
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-medium">
            Share Feedback
          </button>
          <button className="px-6 py-2 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium">
            Report Issue
          </button>
        </div>
      </div>
    </motion.div>
  );
};
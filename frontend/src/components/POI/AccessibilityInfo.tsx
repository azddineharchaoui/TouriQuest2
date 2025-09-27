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

interface AccessibilityInfoProps {
  accessibility: AccessibilityData;
}

export const AccessibilityInfo: React.FC<AccessibilityInfoProps> = ({ accessibility }) => {
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
      description: 'Clear signage, simplified information, and quiet spaces',
      available: accessibility.cognitiveSupport,
      color: 'orange'
    },
    {
      key: 'serviceAnimals',
      label: 'Service Animals Welcome',
      icon: Heart,
      description: 'Service animals are welcome throughout the facility',
      available: accessibility.serviceAnimals,
      color: 'pink'
    }
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    const colors = {
      blue: 'bg-blue-50 text-blue-800 border-blue-200',
      purple: 'bg-purple-50 text-purple-800 border-purple-200',
      green: 'bg-green-50 text-green-800 border-green-200',
      orange: 'bg-orange-50 text-orange-800 border-orange-200',
      pink: 'bg-pink-50 text-pink-800 border-pink-200'
    };
    
    return colors[color as keyof typeof colors] || 'bg-gray-100 text-gray-600 border-gray-200';
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
                  ? `bg-${feature.color}-100` 
                  : 'bg-gray-200'
              }`}>
                <feature.icon className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{feature.label}</h3>
                  {feature.available ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <p className="text-sm mb-3">{feature.description}</p>
                
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  feature.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {feature.available ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Features */}
      {accessibility.features.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Additional Accessibility Features
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {accessibility.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-blue-800">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Headphones className="w-6 h-6 text-blue-500" />
            Audio Support
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Audio descriptions available in 5 languages</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Personal hearing devices provided</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Volume control for all audio content</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Text transcripts available</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-green-500" />
            Navigation Assistance
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Tactile maps and braille signage</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Audio navigation system</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Staff assistance available on request</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Wheelchair accessible routes marked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
        <h3 className="text-2xl font-bold mb-6 text-blue-800">Need Additional Support?</h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">Call Us</h4>
            <p className="text-sm text-gray-600 mb-2">Accessibility Support Line</p>
            <p className="font-medium text-blue-600">+1 (555) 123-4567</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">Live Chat</h4>
            <p className="text-sm text-gray-600 mb-2">24/7 Support Available</p>
            <button className="font-medium text-green-600 hover:text-green-700">
              Start Chat
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-2">Visit Us</h4>
            <p className="text-sm text-gray-600 mb-2">Information Desk</p>
            <p className="font-medium text-purple-600">Main Entrance</p>
          </div>
        </div>
      </div>

      {/* Booking Information */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-amber-600" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-2">Planning Your Visit</h3>
            <p className="text-gray-700 mb-4">
              To ensure the best possible experience, we recommend contacting us in advance to discuss 
              your specific accessibility needs. Our team can arrange personalized assistance and 
              provide additional information about available services.
            </p>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Advance booking recommended for group visits</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Personal assistants and caregivers admitted free</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Service animals welcome in all areas</span>
              </div>
            </div>
            
            <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Request Accessibility Information
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
        <h3 className="text-xl font-bold mb-4 text-green-800">Help Us Improve</h3>
        <p className="text-green-700 mb-4">
          Your feedback helps us continually improve our accessibility services. 
          Please share your experience or suggestions with us.
        </p>
        
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Share Feedback
          </button>
          <button className="px-6 py-2 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
            Report Issue
          </button>
        </div>
      </div>
    </motion.div>
  );
};
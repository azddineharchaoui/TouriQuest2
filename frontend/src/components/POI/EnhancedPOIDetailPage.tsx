import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Star, 
  Share2, 
  Heart, 
  Camera, 
  Navigation,
  Headphones,
  Accessibility,
  Users,
  MessageCircle,
  Award,
  Zap,
  Eye,
  Globe,
  Shield,
  Wifi,
  ParkingCircle,
  Utensils,
  Sun,
  Moon,
  CloudRain,
  Thermometer,
  Wind,
  Smartphone,
  QrCode,
  Volume2,
  VolumeX,
  Languages,
  Download,
  FullscreenIcon as Fullscreen,
  Minimize2,
  Navigation2
} from 'lucide-react';

import { MediaGallery } from './MediaGallery/MediaGallery';
import { OperatingHours } from './OperatingInfo/OperatingHours';
import { EventCalendar } from './Events/EventCalendar';
import { EnhancedReviewSystem } from './EnhancedReviewSystem';
import { EnhancedAudioGuide } from './EnhancedAudioGuide';
import { ARPreview } from './ARPreview';
import { VisitPlanning } from './VisitPlanning';
import { SocialCommunityFeatures } from './SocialCommunityFeatures';
import { EnhancedContextualDiscovery } from './EnhancedContextualDiscovery';
import { EnhancedAccessibilityInfo } from './EnhancedAccessibilityInfo';

interface POI {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    type: 'photo' | 'video' | '360' | 'drone';
    season?: string;
    timestamp: string;
    photographer: string;
  }>;
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  amenities: string[];
  pricing: {
    adult: number;
    child: number;
    senior: number;
    student: number;
  };
  accessibility: {
    wheelchairAccessible: boolean;
    visuallyImpairedSupport: boolean;
    hearingImpairedSupport: boolean;
    cognitiveSupport: boolean;
    serviceAnimals: boolean;
    features: string[];
  };
  visitInfo: {
    estimatedDuration: string;
    bestTime: string;
    crowdLevels: {
      morning: 'low' | 'medium' | 'high';
      afternoon: 'low' | 'medium' | 'high';
      evening: 'low' | 'medium' | 'high';
    };
    seasonalNotes: string[];
  };
  events?: Array<{
    id: string;
    name: string;
    date: string;
    time: string;
    description: string;
    image?: string;
  }>;
}

interface EnhancedPOIDetailPageProps {
  poiId: string;
  poi: POI;
  nearbyPOIs?: POI[];
}

export const EnhancedPOIDetailPage: React.FC<EnhancedPOIDetailPageProps> = ({ 
  poiId, 
  poi, 
  nearbyPOIs = [] 
}) => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [stickyHeader, setStickyHeader] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Parallax effects
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
  
  // Spring animations
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const heroYSpring = useSpring(heroY, springConfig);
  const contentYSpring = useSpring(contentY, springConfig);

  useEffect(() => {
    loadWeatherData();
    
    // Detect scroll for sticky header
    const handleScroll = () => {
      setStickyHeader(window.scrollY > 400);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [poi.coordinates]);

  const loadWeatherData = async () => {
    try {
      const response = await fetch(`/api/v1/integrations/weather/${poi.coordinates.lat},${poi.coordinates.lng}`);
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to load weather data:', error);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'reviews', label: 'Reviews', icon: MessageCircle },
    { id: 'audio', label: 'Audio Guide', icon: Headphones },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'nearby', label: 'Nearby', icon: Navigation },
    { id: 'social', label: 'Social', icon: Users }
  ];

  const getWeatherIcon = () => {
    if (!weatherData) return <Sun className="w-5 h-5" />;
    
    switch (weatherData.condition?.toLowerCase()) {
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'clear':
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      default:
        return <Sun className="w-5 h-5 text-gray-500" />;
    }
  };

  const getWeatherBasedRecommendations = () => {
    if (!weatherData) return [];
    
    const temp = weatherData.temperature;
    const condition = weatherData.condition?.toLowerCase();
    
    let recommendations = [];
    
    if (temp < 10) {
      recommendations.push('Dress warmly for your visit');
    } else if (temp > 25) {
      recommendations.push('Stay hydrated and use sun protection');
    }
    
    if (condition?.includes('rain')) {
      recommendations.push('Indoor activities recommended');
      recommendations.push('Bring an umbrella or raincoat');
    }
    
    return recommendations;
  };

  const handleHapticFeedback = () => {
    if (hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    handleHapticFeedback();
  };

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'} transition-colors duration-300`}
    >
      {/* Immersive Hero Section with Parallax */}
      <motion.div
        style={{ 
          y: heroYSpring,
          opacity: heroOpacity 
        }}
        className={`relative h-screen overflow-hidden ${isFullscreen ? 'z-50' : ''}`}
      >
        {/* Background Image with Parallax */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${poi.photos[0]?.url})`,
            transform: `translateY(${scrollYProgress.get() * 100}px)`
          }}
        />

        {/* Weather-Aware Overlay */}
        <div className={`absolute inset-0 ${weatherData?.condition === 'rain' ? 'bg-blue-900/20' : weatherData?.condition === 'sunny' ? 'bg-yellow-600/10' : 'bg-gray-900/20'}`} />

        {/* Floating Controls */}
        <div className="absolute top-8 right-8 flex items-center gap-3 z-20">
          <div className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/50' : 'bg-white/20'} backdrop-blur-md rounded-full`}>
            {getWeatherIcon()}
            {weatherData && (
              <span className="text-white font-medium">
                {weatherData.temperature}°C
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              title="Voice Navigation"
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setOfflineMode(!offlineMode)}
              className={`p-3 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors ${offlineMode ? 'bg-green-500/50 text-white' : 'bg-white/20 text-white'}`}
              title="Offline Mode"
            >
              <Wifi className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Fullscreen className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center text-center text-white z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-4xl px-8"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              {poi.name}
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl mb-8 text-white/90"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              {poi.description}
            </motion.p>

            <motion.div 
              className="flex items-center justify-center gap-8 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400" />
                <span className="text-xl font-semibold">{poi.rating}</span>
                <span className="text-white/70">({poi.reviewCount} reviews)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-blue-400" />
                <span className="text-white/90">{poi.address}</span>
              </div>
            </motion.div>

            {/* Weather Recommendations */}
            {getWeatherBasedRecommendations().length > 0 && (
              <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.8 }}
              >
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Weather Tips
                </h3>
                <div className="space-y-1">
                  {getWeatherBasedRecommendations().map((tip, index) => (
                    <p key={index} className="text-sm text-white/80">• {tip}</p>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div 
              className="flex items-center justify-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.8 }}
            >
              <button 
                onClick={() => handleSectionChange('overview')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-colors flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Explore Now
              </button>
              
              <button className="px-8 py-3 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full font-semibold transition-colors flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Quick Check-in
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="flex flex-col items-center">
            <span className="text-sm mb-2">Scroll to explore</span>
            <div className="w-1 h-8 bg-white/50 rounded-full">
              <motion.div 
                className="w-full h-3 bg-white rounded-full"
                style={{ y: useTransform(scrollYProgress, [0, 0.1], [0, 20]) }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Sticky Navigation */}
      <AnimatePresence>
        {stickyHeader && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-40 ${darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {poi.name}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {poi.rating}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {weatherData && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                      {getWeatherIcon()}
                      <span className="text-sm font-medium">{weatherData.temperature}°C</span>
                    </div>
                  )}
                  
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Plan Visit
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Parallax */}
      <motion.div
        style={{ y: contentYSpring }}
        className={`relative z-10 ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-t-[2rem] -mt-8`}
      >
        {/* Interactive Section Navigation */}
        <div className={`sticky top-0 z-30 ${darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeSection === section.id
                        ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                        : darkMode 
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                    {section.id === 'reviews' && (
                      <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                        {poi.reviewCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section Content */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === 'overview' && (
                <div className="space-y-12">
                  {/* Quick Stats */}
                  <div className="grid md:grid-cols-4 gap-6">
                    {[
                      { icon: Clock, label: 'Duration', value: poi.visitInfo.estimatedDuration },
                      { icon: Users, label: 'Best for', value: poi.category },
                      { icon: Star, label: 'Rating', value: `${poi.rating}/5` },
                      { icon: MapPin, label: 'Category', value: poi.category }
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6 text-center`}
                      >
                        <stat.icon className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {stat.value}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {stat.label}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Amenities Grid */}
                  <div>
                    <h3 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Amenities & Features
                    </h3>
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {poi.amenities.map((amenity, index) => (
                        <motion.div
                          key={amenity}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-3 p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}
                        >
                          {getAmenityIcon(amenity)}
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {amenity}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'media' && (
                <MediaGallery photos={poi.photos} />
              )}

              {activeSection === 'reviews' && (
                <EnhancedReviewSystem poiId={poiId} />
              )}

              {activeSection === 'audio' && (
                <EnhancedAudioGuide poiId={poiId} />
              )}

              {activeSection === 'hours' && (
                <OperatingHours hours={poi.operatingHours} />
              )}

              {activeSection === 'events' && (
                <EventCalendar events={poi.events || []} />
              )}

              {activeSection === 'accessibility' && (
                <EnhancedAccessibilityInfo accessibility={poi.accessibility} />
              )}

              {activeSection === 'nearby' && (
                <EnhancedContextualDiscovery 
                  poiId={poiId}
                  nearbyPOIs={nearbyPOIs}
                  coordinates={poi.coordinates}
                />
              )}

              {activeSection === 'social' && (
                <SocialCommunityFeatures poiId={poiId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Enhanced Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <VisitPlanning poi={poi} />
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center"
          title="Voice Navigation"
        >
          <Navigation2 className="w-6 h-6" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-xl flex items-center justify-center"
          title="AR Preview"
        >
          <Smartphone className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

// Helper function to get amenity icons
const getAmenityIcon = (amenity: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'WiFi': <Wifi className="w-5 h-5 text-blue-500" />,
    'Parking': <ParkingCircle className="w-5 h-5 text-green-500" />,
    'Restaurant': <Utensils className="w-5 h-5 text-orange-500" />,
    'Accessibility': <Accessibility className="w-5 h-5 text-purple-500" />,
    'Audio Guide': <Headphones className="w-5 h-5 text-indigo-500" />,
  };
  
  return iconMap[amenity] || <Star className="w-5 h-5 text-gray-500" />;
};

export default EnhancedPOIDetailPage;
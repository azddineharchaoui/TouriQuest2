import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  Utensils
} from 'lucide-react';

import { MediaGallery } from './MediaGallery/MediaGallery';
import { OperatingHours } from './OperatingInfo/OperatingHours';
import { EventCalendar } from './Events/EventCalendar';
import { ReviewSystem } from './ReviewSystem';
import { AudioGuide } from './AudioGuide';
import { ARPreview } from './ARPreview';
import { VisitPlanning } from './VisitPlanning';
import { SocialFeatures } from './SocialFeatures';
import { ContextualDiscovery } from './ContextualDiscovery';
import { AccessibilityInfo } from './AccessibilityInfo';
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
  amenities: string[];
  accessibility: {
    wheelchairAccessible: boolean;
    visuallyImpairedSupport: boolean;
    hearingImpairedSupport: boolean;
    cognitiveSupport: boolean;
    serviceAnimals: boolean;
    features: string[];
  };
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  pricing: {
    free: boolean;
    adultPrice?: number;
    childPrice?: number;
    currency: string;
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
  events: Array<{
    id: string;
    name: string;
    date: string;
    time: string;
    description: string;
    ticketRequired: boolean;
    price?: number;
  }>;
  audioGuide: {
    available: boolean;
    languages: string[];
    duration: string;
    highlights: string[];
  };
  culturalInfo: {
    history: string;
    significance: string;
    architecture?: string;
    etiquette: string[];
    legends: string[];
    famousVisitors: string[];
  };
  sustainabilityScore: number;
  carbonFootprint: string;
}

interface POIDetailPageProps {
  poiId: string;
}

export const POIDetailPage: React.FC<POIDetailPageProps> = ({ poiId }) => {
  const [poi, setPoi] = useState<POI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [nearbyPOIs, setNearbyPOIs] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const headerScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    fetchPOIDetails();
    fetchWeatherData();
    fetchNearbyPOIs();
  }, [poiId]);

  const fetchPOIDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/pois/${poiId}`);
      if (!response.ok) throw new Error('Failed to fetch POI details');
      
      const data = await response.json();
      setPoi(data);
      
      // Check if favorited and visited
      const [favResponse, visitResponse] = await Promise.all([
        fetch(`/api/v1/pois/${poiId}/favorite`),
        fetch(`/api/v1/pois/${poiId}/visit`)
      ]);
      
      setIsFavorited(favResponse.ok);
      setIsVisited(visitResponse.ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`/api/v1/integrations/weather/${poi?.coordinates.lat},${poi?.coordinates.lng}`);
      if (response.ok) {
        const weather = await response.json();
        setWeatherData(weather);
      }
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
    }
  };

  const fetchNearbyPOIs = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/nearby`);
      if (response.ok) {
        const nearby = await response.json();
        setNearbyPOIs(nearby);
      }
    } catch (err) {
      console.error('Failed to fetch nearby POIs:', err);
    }
  };

  const handleFavorite = async () => {
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      const response = await fetch(`/api/v1/pois/${poiId}/favorite`, { method });
      
      if (response.ok) {
        setIsFavorited(!isFavorited);
      }
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  const handleVisit = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/visit`, { 
        method: 'POST' 
      });
      
      if (response.ok) {
        setIsVisited(true);
      }
    } catch (err) {
      console.error('Failed to mark as visited:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share && poi) {
      try {
        await navigator.share({
          title: poi.name,
          text: poi.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading amazing destination...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !poi) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
          <p className="text-red-500">{error || 'POI not found'}</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      {/* Immersive Header */}
      <motion.div 
        style={{ opacity: headerOpacity, scale: headerScale }}
        className="relative h-screen overflow-hidden"
      >
        <MediaGallery 
          photos={poi.photos} 
          poiName={poi.name}
          enableAR={true}
          enable360={true}
          enableDrone={true}
        />
        
        {/* Header Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-500/20 backdrop-blur-md text-blue-200 rounded-full text-sm">
                  {poi.category}
                </span>
                {poi.sustainabilityScore > 80 && (
                  <span className="px-3 py-1 bg-green-500/20 backdrop-blur-md text-green-200 rounded-full text-sm flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Eco-Friendly
                  </span>
                )}
              </div>
              
              <h1 className="text-5xl font-bold text-white mb-4">{poi.name}</h1>
              
              <div className="flex items-center gap-6 text-white/90 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{poi.rating}</span>
                  <span>({poi.reviewCount.toLocaleString()} reviews)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{poi.address}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-green-400">Open Now</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFavorite}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-md transition-all ${
                    isFavorited 
                      ? 'bg-red-500/20 text-red-200 border border-red-400/30' 
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? 'Favorited' : 'Add to Favorites'}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleVisit}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-md transition-all ${
                    isVisited
                      ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                      : 'bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/30'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  {isVisited ? 'Visited' : 'Mark as Visited'}
                </motion.button>
                
                {poi.audioGuide.available && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500/20 backdrop-blur-md text-purple-200 border border-purple-400/30 hover:bg-purple-500/30 transition-all"
                  >
                    <Headphones className="w-5 h-5" />
                    Audio Guide
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b z-40">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'hours', label: 'Hours & Info', icon: Clock },
              { id: 'events', label: 'Events', icon: Calendar },
              { id: 'reviews', label: 'Reviews', icon: MessageCircle },
              { id: 'audio', label: 'Audio Guide', icon: Headphones },
              { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
              { id: 'nearby', label: 'Nearby', icon: Navigation },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeSection === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">About {poi.name}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">{poi.description}</p>
              
              {/* Cultural Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Historical Significance
                  </h3>
                  <p className="text-gray-600">{poi.culturalInfo.history}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    Cultural Context
                  </h3>
                  <p className="text-gray-600">{poi.culturalInfo.significance}</p>
                </div>
              </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Visit Duration</h3>
                </div>
                <p className="text-blue-800">{poi.visitInfo.estimatedDuration}</p>
                <p className="text-sm text-blue-600 mt-2">Best time: {poi.visitInfo.bestTime}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-green-900">Crowd Levels</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Morning</span>
                    <span className={`capitalize ${
                      poi.visitInfo.crowdLevels.morning === 'low' ? 'text-green-600' :
                      poi.visitInfo.crowdLevels.morning === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {poi.visitInfo.crowdLevels.morning}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Afternoon</span>
                    <span className={`capitalize ${
                      poi.visitInfo.crowdLevels.afternoon === 'low' ? 'text-green-600' :
                      poi.visitInfo.crowdLevels.afternoon === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {poi.visitInfo.crowdLevels.afternoon}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Evening</span>
                    <span className={`capitalize ${
                      poi.visitInfo.crowdLevels.evening === 'low' ? 'text-green-600' :
                      poi.visitInfo.crowdLevels.evening === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {poi.visitInfo.crowdLevels.evening}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Pricing</h3>
                </div>
                {poi.pricing.free ? (
                  <p className="text-purple-800 font-semibold">Free Entry</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-purple-800">Adult: {poi.pricing.currency}{poi.pricing.adultPrice}</p>
                    {poi.pricing.childPrice && (
                      <p className="text-purple-800">Child: {poi.pricing.currency}{poi.pricing.childPrice}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Amenities & Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {poi.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {getAmenityIcon(amenity)}
                    <span className="text-sm font-medium">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'hours' && (
          <OperatingHours 
            poiId={poiId}
            operatingHours={poi.operatingHours}
            weatherData={weatherData}
          />
        )}

        {activeSection === 'events' && (
          <EventCalendar 
            poiId={poiId}
            events={poi.events}
          />
        )}

        {activeSection === 'reviews' && (
          <ReviewSystem poiId={poiId} />
        )}

        {activeSection === 'audio' && poi.audioGuide.available && (
          <AudioGuide 
            poiId={poiId}
            audioGuide={poi.audioGuide}
          />
        )}

        {activeSection === 'accessibility' && (
          <EnhancedAccessibilityInfo accessibility={poi.accessibility} />
        )}

        {activeSection === 'nearby' && (
          <ContextualDiscovery 
            poiId={poiId}
            nearbyPOIs={nearbyPOIs}
            coordinates={poi.coordinates}
          />
        )}
      </div>

      {/* Floating Action Button for Visit Planning */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <VisitPlanning poi={poi} />
      </motion.div>
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

export default POIDetailPage;
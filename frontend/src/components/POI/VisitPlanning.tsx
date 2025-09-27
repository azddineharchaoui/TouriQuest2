import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  Plus,
  X,
  Navigation,
  Camera,
  Share2,
  Download,
  Bell,
  Route,
  Car,
  Bus,
  Train,
  Bookmark,
  CheckCircle,
  Utensils,
  ShoppingBag,
  ParkingCircle,
  Plane,
  Smartphone,
  QrCode,
  Trophy,
  Gift,
  UserPlus,
  MessageSquare,
  Map,
  Coffee,
  Fuel,
  Calendar as CalendarIcon,
  FileText,
  Instagram,
  Facebook,
  Twitter,
  Zap,
  Wifi,
  CreditCard,
  Languages,
  Accessibility,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  CloudRain,
  Thermometer
} from 'lucide-react';

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
}

interface VisitPlanningProps {
  poi: POI;
}

interface ItineraryItem {
  id: string;
  type: 'poi' | 'transport' | 'meal' | 'break' | 'parking' | 'shopping';
  title: string;
  duration: number;
  startTime: string;
  location?: string;
  notes?: string;
  cost?: number;
  rating?: number;
  distance?: string;
  bookingRequired?: boolean;
}

interface TransportOption {
  id: string;
  type: 'car' | 'bus' | 'train' | 'taxi' | 'walking' | 'bike';
  duration: string;
  cost?: number;
  realTimeInfo?: string;
  co2Impact?: number;
  accessibility?: boolean;
}

interface ParkingInfo {
  name: string;
  distance: string;
  cost: string;
  spaces: number;
  type: 'street' | 'garage' | 'lot';
  features: string[];
}

interface DiningOption {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  distance: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  openNow: boolean;
  features: string[];
}

interface ShoppingOption {
  id: string;
  name: string;
  type: 'mall' | 'boutique' | 'market' | 'souvenir';
  rating: number;
  distance: string;
  specialties: string[];
}

interface GroupMember {
  id: string;
  name: string;
  preferences: string[];
  dietary?: string[];
  accessibility?: string[];
  avatar?: string;
}

interface Journal {
  id: string;
  title: string;
  date: string;
  photos: string[];
  notes: string;
  achievements: string[];
  shared: boolean;
}

export const VisitPlanning: React.FC<VisitPlanningProps> = ({ poi }) => {
  const [showPlanner, setShowPlanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'transport' | 'dining' | 'shopping' | 'group' | 'share' | 'journal'>('plan');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupSize, setGroupSize] = useState(2);
  const [interests, setInterests] = useState<string[]>(['photography', 'history']);
  const [duration, setDuration] = useState('half-day');
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [savedPlans, setSavedPlans] = useState(0);
  
  // Advanced Planning State
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [parkingOptions, setParkingOptions] = useState<ParkingInfo[]>([]);
  const [diningOptions, setDiningOptions] = useState<DiningOption[]>([]);
  const [shoppingOptions, setShoppingOptions] = useState<ShoppingOption[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<any>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);
  const [travelJournal, setTravelJournal] = useState<Journal[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [shareTemplate, setShareTemplate] = useState('default');
  const [offlineMode, setOfflineMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Load initial data
  useEffect(() => {
    loadTransportOptions();
    loadParkingInfo();
    loadDiningOptions();
    loadShoppingOptions();
    loadWeatherInfo();
    loadRealTimeUpdates();
  }, [poi.id, selectedDate]);

  const loadTransportOptions = async () => {
    try {
      const response = await fetch(`/api/v1/integrations/maps/directions?destination=${poi.coordinates.lat},${poi.coordinates.lng}&date=${selectedDate}`);
      const data = await response.json();
      setTransportOptions(data.options || []);
    } catch (error) {
      console.error('Failed to load transport options:', error);
    }
  };

  const loadParkingInfo = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poi.id}/parking`);
      const data = await response.json();
      setParkingOptions(data.parking || []);
    } catch (error) {
      console.error('Failed to load parking info:', error);
    }
  };

  const loadDiningOptions = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poi.id}/nearby?type=restaurant&radius=1000`);
      const data = await response.json();
      setDiningOptions(data.restaurants || []);
    } catch (error) {
      console.error('Failed to load dining options:', error);
    }
  };

  const loadShoppingOptions = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poi.id}/nearby?type=shopping&radius=1000`);
      const data = await response.json();
      setShoppingOptions(data.shopping || []);
    } catch (error) {
      console.error('Failed to load shopping options:', error);
    }
  };

  const loadWeatherInfo = async () => {
    try {
      const response = await fetch(`/api/v1/integrations/weather/${poi.coordinates.lat},${poi.coordinates.lng}?date=${selectedDate}`);
      const data = await response.json();
      setWeatherInfo(data);
    } catch (error) {
      console.error('Failed to load weather info:', error);
    }
  };

  const loadRealTimeUpdates = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poi.id}/real-time-updates`);
      const data = await response.json();
      setRealTimeUpdates(data.updates || []);
    } catch (error) {
      console.error('Failed to load real-time updates:', error);
    }
  };

  const generateItinerary = async () => {
    try {
      const response = await fetch(`/api/v1/ai/itinerary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poiId: poi.id,
          date: selectedDate,
          groupSize,
          interests,
          duration,
          groupMembers: groupMembers.map(m => m.preferences).flat(),
          accessibility: groupMembers.some(m => m.accessibility?.length),
          dietary: groupMembers.map(m => m.dietary).flat().filter(Boolean),
          weatherConditions: weatherInfo?.current,
          preferences: {
            pace: 'moderate',
            budget: 'medium',
            accessibility: false
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(data.itinerary);
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Failed to generate itinerary:', error);
    }
  };

  const saveItinerary = async () => {
    try {
      const response = await fetch('/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Visit to ${poi.name}`,
          date: selectedDate,
          items: itinerary,
          poiId: poi.id
        })
      });

      if (response.ok) {
        setSavedPlans(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to save itinerary:', error);
    }
  };

  const shareItinerary = async () => {
    try {
      const shareData = {
        title: `Visit Plan: ${poi.name}`,
        text: `Check out my visit plan for ${poi.name}!`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInterestIcon = (interest: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      photography: <Camera className="w-4 h-4" />,
      history: <Bookmark className="w-4 h-4" />,
      art: <Star className="w-4 h-4" />,
      food: <Users className="w-4 h-4" />,
      nature: <MapPin className="w-4 h-4" />,
    };
    return icons[interest] || <Star className="w-4 h-4" />;
  };

  const getCrowdLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';  
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPlanner(true)}
        className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center transition-colors"
      >
        <Calendar className="w-8 h-8" />
      </motion.button>

      {/* Planning Modal */}
      <AnimatePresence>
        {showPlanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPlanner(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Header with Weather & Settings */}
              <div className={`sticky top-0 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b p-6 rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Plan Your Visit</h2>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Create the perfect itinerary for {poi.name}</p>
                    {weatherInfo && (
                      <div className="flex items-center gap-2 mt-2">
                        <Thermometer className="w-4 h-4 text-blue-500" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {weatherInfo.temperature}°C • {weatherInfo.condition}
                        </span>
                        {weatherInfo.alerts && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Bell className="w-4 h-4" />
                            <span className="text-xs">Weather Alert</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {loyaltyPoints} points
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setOfflineMode(!offlineMode)}
                        className={`p-1 rounded ${offlineMode ? 'text-green-500' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        title="Offline Mode"
                      >
                        <Wifi className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`p-1 rounded ${voiceEnabled ? 'text-blue-500' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        title="Voice Navigation"
                      >
                        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`p-1 rounded ${darkMode ? 'text-yellow-400' : 'text-gray-500'}`}
                        title="Dark Mode"
                      >
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {savedPlans} saved plans
                    </span>
                    <button
                      onClick={() => setShowPlanner(false)}
                      className={`p-2 hover:${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full transition-colors`}
                    >
                      <X className={`w-6 h-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    </button>
                  </div>
                </div>

                {/* Advanced Tab Navigation */}
                <div className="flex items-center gap-1 mt-4 overflow-x-auto">
                  {[
                    { id: 'plan', label: 'Plan', icon: Calendar },
                    { id: 'transport', label: 'Transport', icon: Car },
                    { id: 'dining', label: 'Dining', icon: Utensils },
                    { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
                    { id: 'group', label: 'Group', icon: Users },
                    { id: 'share', label: 'Share', icon: Share2 },
                    { id: 'journal', label: 'Journal', icon: FileText }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-blue-500 text-white'
                            : darkMode 
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`p-6 space-y-8 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Real-time Updates */}
                {realTimeUpdates.length > 0 && (
                  <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Live Updates</span>
                    </div>
                    <div className="space-y-2">
                      {realTimeUpdates.map((update, index) => (
                        <div key={index} className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                          • {update.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content */}
                {activeTab === 'plan' && (
                  <div className="space-y-6">
                    {/* Planning Form */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Visit Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Group Size</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                          className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="text-lg font-semibold w-8 text-center">{groupSize}</span>
                        <button
                          onClick={() => setGroupSize(groupSize + 1)}
                          className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="quick">Quick Visit (1-2 hours)</option>
                        <option value="half-day">Half Day (3-4 hours)</option>
                        <option value="full-day">Full Day (6-8 hours)</option>
                        <option value="extended">Extended (Multiple days)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {['photography', 'history', 'art', 'food', 'nature', 'architecture'].map((interest) => (
                          <button
                            key={interest}
                            onClick={() => {
                              if (interests.includes(interest)) {
                                setInterests(interests.filter(i => i !== interest));
                              } else {
                                setInterests([...interests, interest]);
                              }
                            }}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                              interests.includes(interest)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {getInterestIcon(interest)}
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Best Time to Visit</label>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm font-medium mb-2">Recommended: {poi.visitInfo.bestTime}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className={`p-2 rounded text-center ${getCrowdLevelColor(poi.visitInfo.crowdLevels.morning)}`}>
                            <div>Morning</div>
                            <div className="capitalize">{poi.visitInfo.crowdLevels.morning}</div>
                          </div>
                          <div className={`p-2 rounded text-center ${getCrowdLevelColor(poi.visitInfo.crowdLevels.afternoon)}`}>
                            <div>Afternoon</div>
                            <div className="capitalize">{poi.visitInfo.crowdLevels.afternoon}</div>
                          </div>
                          <div className={`p-2 rounded text-center ${getCrowdLevelColor(poi.visitInfo.crowdLevels.evening)}`}>
                            <div>Evening</div>
                            <div className="capitalize">{poi.visitInfo.crowdLevels.evening}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="text-center">
                  <button
                    onClick={generateItinerary}
                    className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
                  >
                    Generate Smart Itinerary
                  </button>
                </div>

                {/* Generated Itinerary */}
                {itinerary.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">Your Personalized Itinerary</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={saveItinerary}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <Bookmark className="w-4 h-4" />
                          Save Plan
                        </button>
                        <button
                          onClick={shareItinerary}
                          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {itinerary.map((item, index) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="text-sm font-medium text-blue-600">{item.startTime}</div>
                            {index < itinerary.length - 1 && (
                              <div className="w-px h-12 bg-gray-300 mx-auto mt-2"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{item.title}</h4>
                              <span className="text-sm text-gray-600">{item.duration} min</span>
                            </div>
                            
                            {item.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            
                            {item.notes && (
                              <p className="text-sm text-gray-700">{item.notes}</p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-3">
                              <button className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors">
                                <Navigation className="w-3 h-3 inline mr-1" />
                                Directions
                              </button>
                              <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors">
                                <Bell className="w-3 h-3 inline mr-1" />
                                Remind Me
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transportation Options */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Getting There</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Car className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <h4 className="font-semibold mb-1">By Car</h4>
                      <p className="text-sm text-gray-600">15 min drive</p>
                      <p className="text-sm text-blue-600">Parking available</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Bus className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <h4 className="font-semibold mb-1">Public Transit</h4>
                      <p className="text-sm text-gray-600">25 min journey</p>
                      <p className="text-sm text-green-600">Route 42, 67</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Route className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <h4 className="font-semibold mb-1">Walking</h4>
                      <p className="text-sm text-gray-600">45 min walk</p>
                      <p className="text-sm text-purple-600">Scenic route</p>
                    </div>
                  </div>
                </div>

                {/* Tips & Recommendations */}
                {recommendations.length > 0 && (
                  <div className={`${darkMode ? 'bg-amber-900' : 'bg-amber-50'} rounded-2xl p-6 border ${darkMode ? 'border-amber-700' : 'border-amber-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>Smart Recommendations</h3>
                    <div className="space-y-3">
                      {recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className={`${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>{rec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </div>
                )}

                {/* Transport Tab */}
                {activeTab === 'transport' && (
                  <div className="space-y-6">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Transportation & Parking</h3>
                    
                    {/* Real-time Transport Options */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {transportOptions.map((transport) => (
                        <div key={transport.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {transport.type === 'car' && <Car className="w-5 h-5 text-blue-500" />}
                              {transport.type === 'bus' && <Bus className="w-5 h-5 text-green-500" />}
                              {transport.type === 'train' && <Train className="w-5 h-5 text-purple-500" />}
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}
                              </span>
                            </div>
                            <span className="text-sm text-green-600">{transport.duration}</span>
                          </div>
                          {transport.realTimeInfo && (
                            <p className="text-sm text-blue-600 mb-2">{transport.realTimeInfo}</p>
                          )}
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {transport.cost ? `$${transport.cost}` : 'Free'}
                            </span>
                            {transport.co2Impact && (
                              <span className="text-xs text-green-600">{transport.co2Impact}kg CO₂</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Parking Information */}
                    <div>
                      <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Parking Options</h4>
                      <div className="space-y-3">
                        {parkingOptions.map((parking, index) => (
                          <div key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <ParkingCircle className="w-5 h-5 text-blue-500" />
                                <div>
                                  <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{parking.name}</h5>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{parking.distance} away</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{parking.cost}</p>
                                <p className="text-sm text-green-600">{parking.spaces} spaces</p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {parking.features.map((feature, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dining Tab */}
                {activeTab === 'dining' && (
                  <div className="space-y-6">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Nearby Dining</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {diningOptions.map((restaurant) => (
                        <div key={restaurant.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{restaurant.name}</h4>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{restaurant.cuisine}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">{restaurant.rating}</span>
                              </div>
                              <span className="text-sm text-gray-500">{restaurant.distance}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{restaurant.priceRange}</span>
                            <span className={`text-sm px-2 py-1 rounded ${restaurant.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {restaurant.openNow ? 'Open Now' : 'Closed'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {restaurant.features.map((feature, idx) => (
                              <span key={idx} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shopping Tab */}
                {activeTab === 'shopping' && (
                  <div className="space-y-6">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Shopping & Souvenirs</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {shoppingOptions.map((shop) => (
                        <div key={shop.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{shop.name}</h4>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{shop.type}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">{shop.rating}</span>
                              </div>
                              <span className="text-sm text-gray-500">{shop.distance}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {shop.specialties.map((specialty, idx) => (
                              <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group Tab */}
                {activeTab === 'group' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Group Planning</h3>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <UserPlus className="w-4 h-4" />
                        Invite Friends
                      </button>
                    </div>

                    {/* Group Members */}
                    <div className="space-y-3">
                      {groupMembers.map((member) => (
                        <div key={member.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                              {member.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{member.name}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {member.preferences.map((pref, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <MessageSquare className="w-4 h-4 text-gray-500 cursor-pointer hover:text-blue-500" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Group Chat */}
                    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                      <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Group Chat</h4>
                      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <div className="text-sm">
                            <span className="font-medium">Alex:</span> What time should we meet?
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex-shrink-0"></div>
                          <div className="text-sm">
                            <span className="font-medium">Sarah:</span> 10 AM works for me!
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          className={`flex-1 p-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Share Tab */}
                {activeTab === 'share' && (
                  <div className="space-y-6">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Share Your Experience</h3>

                    {/* Photo Spot Suggestions */}
                    <div>
                      <h4 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Perfect Photo Spots</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Golden Hour View', 'Architecture Detail', 'Group Photo Spot'].map((spot, index) => (
                          <div key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-3 border text-center`}>
                            <Camera className="w-6 h-6 mx-auto mb-2 text-pink-500" />
                            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{spot}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Share Templates */}
                    <div>
                      <h4 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Share Templates</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {['Instagram Story', 'Facebook Post', 'Travel Blog'].map((template, index) => (
                          <div key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border cursor-pointer hover:border-blue-500 transition-colors`}>
                            <div className="text-center">
                              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                                <Share2 className="w-6 h-6 text-white" />
                              </div>
                              <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{template}</h5>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Social Share Buttons */}
                    <div className="flex justify-center gap-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500">
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </button>
                    </div>
                  </div>
                )}

                {/* Journal Tab */}
                {activeTab === 'journal' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Travel Journal</h3>
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <Plus className="w-4 h-4" />
                        New Entry
                      </button>
                    </div>

                    {/* Journal Entries */}
                    <div className="space-y-4">
                      {travelJournal.map((entry) => (
                        <div key={entry.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-6 border`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{entry.title}</h4>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{entry.date}</p>
                            </div>
                            <div className="flex gap-2">
                              {entry.achievements.map((achievement, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                                  <Trophy className="w-3 h-3" />
                                  {achievement}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>{entry.notes}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {entry.photos.slice(0, 3).map((photo, idx) => (
                                <div key={idx} className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                              ))}
                              {entry.photos.length > 3 && (
                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs">
                                  +{entry.photos.length - 3}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.shared && <Share2 className="w-4 h-4 text-blue-500" />}
                              <button className="text-sm text-blue-500 hover:text-blue-600">Edit</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Achievement Progress */}
                    <div className={`${darkMode ? 'bg-yellow-900' : 'bg-yellow-50'} rounded-lg p-4 border ${darkMode ? 'border-yellow-700' : 'border-yellow-200'}`}>
                      <h4 className={`font-medium mb-3 ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>Achievement Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>Photo Explorer</span>
                          <span className="text-sm font-medium">8/10</span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
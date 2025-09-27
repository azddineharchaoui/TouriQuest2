import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  MapPin, 
  Star, 
  Clock,
  Users,
  Camera,
  Route,
  Compass,
  Award,
  Heart,
  Share2,
  ExternalLink,
  Car,
  Bus,
  Train,
  ParkingCircle,
  Utensils,
  Coffee,
  ShoppingBag,
  TreePine,
  Building2,
  Mountain,
  Waves,
  BookOpen,
  History,
  Crown,
  Globe,
  Scroll,
  Sparkles,
  Eye,
  Calendar,
  Music,
  Palette,
  Landmark,
  Shield,
  Feather,
  Lightbulb,
  Map as MapIcon,
  Footprints
} from 'lucide-react';

interface NearbyPOI {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: number;
  walkingTime: number;
  drivingTime: number;
  image: string;
  description: string;
  address: string;
  priceLevel: number;
  isOpen: boolean;
  highlights: string[];
  tags: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  culturalSignificance?: string;
  hiddenGemScore?: number;
  localSecret?: boolean;
}

interface WalkingRoute {
  id: string;
  name: string;
  description: string;
  distance: number;
  duration: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  highlights: string[];
  pois: string[];
  image: string;
  culturalThemes: string[];
  seasonalAvailability: string[];
  accessibilityNotes: string;
  guidedOptions: boolean;
}

interface HistoricalEvent {
  id: string;
  title: string;
  date: string;
  period: string;
  description: string;
  significance: string;
  relatedFigures: string[];
  artifacts?: string[];
  sources: string[];
}

interface FamousVisitor {
  id: string;
  name: string;
  profession: string;
  visitDate: string;
  purpose: string;
  impact: string;
  quote?: string;
  image: string;
  relatedWorks?: string[];
}

interface ArchitecturalFeature {
  id: string;
  name: string;
  style: string;
  period: string;
  architect?: string;
  description: string;
  significance: string;
  materials: string[];
  techniques: string[];
  restorations: Array<{
    year: string;
    work: string;
  }>;
}

interface CulturalContext {
  history: {
    overview: string;
    timeline: HistoricalEvent[];
    significance: string;
  };
  architecture: {
    overview: string;
    features: ArchitecturalFeature[];
    styles: string[];
  };
  traditions: {
    customs: Array<{
      name: string;
      description: string;
      season?: string;
      etiquette: string[];
    }>;
    festivals: Array<{
      name: string;
      date: string;
      description: string;
      participation: string;
    }>;
  };
  legends: Array<{
    title: string;
    origin: string;
    story: string;
    moral?: string;
    relatedLocations: string[];
  }>;
  famousVisitors: FamousVisitor[];
  localEtiquette: Array<{
    category: string;
    rules: string[];
    tips: string[];
  }>;
  photography: {
    bestSpots: Array<{
      location: string;
      time: string;
      tips: string;
    }>;
    restrictions: string[];
    guidelines: string[];
  };
}

interface EnhancedContextualDiscoveryProps {
  poiId: string;
  nearbyPOIs: NearbyPOI[];
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const EnhancedContextualDiscovery: React.FC<EnhancedContextualDiscoveryProps> = ({ 
  poiId, 
  nearbyPOIs: initialNearbyPOIs, 
  coordinates 
}) => {
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>(initialNearbyPOIs);
  const [walkingRoutes, setWalkingRoutes] = useState<WalkingRoute[]>([]);
  const [culturalContext, setCulturalContext] = useState<CulturalContext | null>(null);
  const [hiddenGems, setHiddenGems] = useState<NearbyPOI[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance');
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'routes' | 'culture' | 'gems'>('nearby');
  const [timeBasedSuggestions, setTimeBasedSuggestions] = useState<any[]>([]);
  const [selectedHistoricalPeriod, setSelectedHistoricalPeriod] = useState<string>('all');
  const [showLegendModal, setShowLegendModal] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<WalkingRoute | null>(null);

  useEffect(() => {
    fetchEnhancedData();
    fetchTimeBasedSuggestions();
  }, [poiId]);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch comprehensive cultural context
      const culturalResponse = await fetch(`/api/v1/pois/${poiId}/cultural-context`);
      if (culturalResponse.ok) {
        const culturalData = await culturalResponse.json();
        setCulturalContext(culturalData);
      }

      // Fetch curated walking routes
      const routesResponse = await fetch(`/api/v1/pois/${poiId}/walking-routes`);
      if (routesResponse.ok) {
        const routesData = await routesResponse.json();
        setWalkingRoutes(routesData.routes);
      }

      // Fetch hidden gems
      const gemsResponse = await fetch(`/api/v1/pois/${poiId}/hidden-gems`);
      if (gemsResponse.ok) {
        const gemsData = await gemsResponse.json();
        setHiddenGems(gemsData.gems);
      }

      // Fetch enhanced nearby POIs
      const nearbyResponse = await fetch(`/api/v1/pois/${poiId}/nearby?enhanced=true`);
      if (nearbyResponse.ok) {
        const nearbyData = await nearbyResponse.json();
        setNearbyPOIs(nearbyData.pois);
      }
    } catch (error) {
      console.error('Failed to fetch enhanced data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeBasedSuggestions = async () => {
    try {
      const now = new Date();
      const timeOfDay = now.getHours() < 12 ? 'morning' : 
                      now.getHours() < 17 ? 'afternoon' : 'evening';
      const season = Math.floor((now.getMonth() + 1) / 3);
      
      const response = await fetch(`/api/v1/pois/${poiId}/contextual-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeOfDay,
          season,
          weather: 'sunny', // Could integrate with weather API
          userPreferences: []
        })
      });

      if (response.ok) {
        const suggestions = await response.json();
        setTimeBasedSuggestions(suggestions.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch time-based suggestions:', error);
    }
  };

  const getPeriodIcon = (period: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'ancient': <Landmark className="w-4 h-4" />,
      'medieval': <Shield className="w-4 h-4" />,
      'renaissance': <Palette className="w-4 h-4" />,
      'modern': <Building2 className="w-4 h-4" />,
      'contemporary': <Sparkles className="w-4 h-4" />
    };
    return icons[period.toLowerCase()] || <History className="w-4 h-4" />;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: JSX.Element } = {
      restaurant: <Utensils className="w-4 h-4" />,
      cafe: <Coffee className="w-4 h-4" />,
      shopping: <ShoppingBag className="w-4 h-4" />,
      park: <TreePine className="w-4 h-4" />,
      museum: <Building2 className="w-4 h-4" />,
      landmark: <Mountain className="w-4 h-4" />,
      beach: <Waves className="w-4 h-4" />
    };
    return icons[category] || <MapPin className="w-4 h-4" />;
  };

  const filteredPOIs = nearbyPOIs.filter(poi => 
    selectedCategory === 'all' || poi.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Time-Based Contextual Suggestions */}
      {timeBasedSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-amber-600" />
            <h3 className="text-lg font-semibold">Perfect for Right Now</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {timeBasedSuggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-amber-100">
                <h4 className="font-medium mb-2">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <Eye className="w-3 h-3" />
                  <span>{suggestion.duration}</span>
                  <span>•</span>
                  <span>{suggestion.distance}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Enhanced Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'nearby', label: 'Nearby Places', icon: <MapPin className="w-4 h-4" /> },
            { id: 'routes', label: 'Walking Routes', icon: <Footprints className="w-4 h-4" /> },
            { id: 'culture', label: 'Cultural Context', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'gems', label: 'Hidden Gems', icon: <Sparkles className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Nearby Places Tab */}
      {activeTab === 'nearby' && (
        <div className="space-y-6">
          {/* Enhanced Filters */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="restaurant">Restaurants</option>
                <option value="cafe">Cafes</option>
                <option value="shopping">Shopping</option>
                <option value="park">Parks</option>
                <option value="museum">Museums</option>
                <option value="landmark">Landmarks</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="distance">Closest First</option>
                <option value="rating">Highest Rated</option>
                <option value="cultural">Cultural Significance</option>
                <option value="hidden">Hidden Gems</option>
              </select>
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <MapIcon className="w-4 h-4" />
              {showMap ? 'List View' : 'Map View'}
            </button>
          </div>

          {/* POI Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPOIs.map((poi) => (
              <motion.div
                key={poi.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48">
                  <img
                    src={poi.image}
                    alt={poi.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {poi.localSecret && (
                    <div className="absolute top-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Local Secret
                    </div>
                  )}
                  
                  {poi.hiddenGemScore && poi.hiddenGemScore > 8 && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
                      Hidden Gem
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{poi.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{poi.rating}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{poi.description}</p>

                  {poi.culturalSignificance && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <History className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">{poi.culturalSignificance}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>{poi.distance}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{poi.walkingTime}min walk</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(poi.category)}
                      <span className="capitalize">{poi.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      Get Directions
                    </button>
                    <button className="p-2 border rounded-lg hover:bg-gray-50">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Walking Routes Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid gap-6">
            {walkingRoutes.map((route) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={route.image}
                    alt={route.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold">{route.name}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        route.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        route.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {route.difficulty}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4">{route.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{route.distance}km</div>
                        <div className="text-sm text-gray-600">Distance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{route.duration}min</div>
                        <div className="text-sm text-gray-600">Duration</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">{route.pois.length}</div>
                        <div className="text-sm text-gray-600">POIs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">{route.culturalThemes.length}</div>
                        <div className="text-sm text-gray-600">Themes</div>
                      </div>
                    </div>

                    {route.culturalThemes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Cultural Themes:</h4>
                        <div className="flex flex-wrap gap-2">
                          {route.culturalThemes.map((theme, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedRoute(route)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Start Route
                      </button>
                      
                      {route.guidedOptions && (
                        <button className="px-6 py-2 border border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
                          Guided Tour Available
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Context Tab */}
      {activeTab === 'culture' && culturalContext && (
        <div className="space-y-8">
          {/* Historical Timeline */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold">Historical Timeline</h3>
            </div>

            <div className="mb-4">
              <select
                value={selectedHistoricalPeriod}
                onChange={(e) => setSelectedHistoricalPeriod(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Periods</option>
                <option value="ancient">Ancient</option>
                <option value="medieval">Medieval</option>
                <option value="renaissance">Renaissance</option>
                <option value="modern">Modern</option>
                <option value="contemporary">Contemporary</option>
              </select>
            </div>

            <div className="space-y-4">
              {culturalContext.history.timeline
                .filter(event => selectedHistoricalPeriod === 'all' || event.period.toLowerCase() === selectedHistoricalPeriod)
                .map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {getPeriodIcon(event.period)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{event.title}</h4>
                      <span className="text-sm text-gray-500">{event.date}</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{event.description}</p>
                    
                    {event.relatedFigures.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Related Figures: </span>
                        <span className="text-sm text-gray-600">{event.relatedFigures.join(', ')}</span>
                      </div>
                    )}
                    
                    <div className="text-sm text-blue-600 font-medium">{event.significance}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Famous Visitors */}
          {culturalContext.famousVisitors.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Crown className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-semibold">Famous Visitors</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {culturalContext.famousVisitors.map((visitor) => (
                  <div key={visitor.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={visitor.image}
                      alt={visitor.name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                    
                    <div className="flex-1">
                      <h4 className="font-semibold">{visitor.name}</h4>
                      <p className="text-sm text-gray-600 mb-1">{visitor.profession}</p>
                      <p className="text-sm text-gray-700 mb-2">{visitor.purpose}</p>
                      
                      {visitor.quote && (
                        <blockquote className="text-sm italic text-gray-600 border-l-2 border-gray-300 pl-3">
                          "{visitor.quote}"
                        </blockquote>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Visited: {visitor.visitDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legends & Stories */}
          {culturalContext.legends.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Feather className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold">Legends & Stories</h3>
              </div>

              <div className="grid gap-4">
                {culturalContext.legends.map((legend, index) => (
                  <div
                    key={index}
                    className="p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => setShowLegendModal(legend)}
                  >
                    <h4 className="font-semibold text-purple-900 mb-2">{legend.title}</h4>
                    <p className="text-sm text-purple-700 line-clamp-2">{legend.story}</p>
                    <div className="text-xs text-purple-600 mt-2">
                      Origin: {legend.origin}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Etiquette */}
          {culturalContext.localEtiquette.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold">Local Etiquette</h3>
              </div>

              <div className="space-y-4">
                {culturalContext.localEtiquette.map((etiquette, index) => (
                  <div key={index} className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">{etiquette.category}</h4>
                    
                    <div className="space-y-2">
                      <div>
                        <h5 className="text-sm font-medium text-green-800 mb-1">Do:</h5>
                        <ul className="text-sm text-green-700 space-y-1">
                          {etiquette.rules.map((rule, rIndex) => (
                            <li key={rIndex} className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {etiquette.tips.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-800 mb-1">Tips:</h5>
                          <ul className="text-sm text-green-600 space-y-1">
                            {etiquette.tips.map((tip, tIndex) => (
                              <li key={tIndex} className="flex items-start gap-2">
                                <Lightbulb className="w-3 h-3 mt-1 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden Gems Tab */}
      {activeTab === 'gems' && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Hidden Gems Near You</h3>
            <p className="text-gray-600">Discover secret spots that only locals know about</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {hiddenGems.map((gem) => (
              <motion.div
                key={gem.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={gem.image}
                    alt={gem.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-purple-900">{gem.name}</h3>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm">{gem.hiddenGemScore}/10</span>
                      </div>
                    </div>
                    
                    <p className="text-purple-700 text-sm mb-3">{gem.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Navigation className="w-3 h-3" />
                        <span>{gem.distance}m away</span>
                      </div>
                      
                      <button className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs hover:bg-purple-600 transition-colors">
                        Discover
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Legend Modal */}
      <AnimatePresence>
        {showLegendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLegendModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-4">{showLegendModal.title}</h3>
                <div className="text-sm text-gray-600 mb-4">Origin: {showLegendModal.origin}</div>
                <div className="prose prose-sm max-w-none">
                  <p>{showLegendModal.story}</p>
                  {showLegendModal.moral && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900">Moral of the Story:</h4>
                      <p className="text-purple-700">{showLegendModal.moral}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
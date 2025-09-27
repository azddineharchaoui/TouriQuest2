import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Waves
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
}

interface ContextualDiscoveryProps {
  poiId: string;
  nearbyPOIs: NearbyPOI[];
  coordinates: {
    lat: number;
    lng: number;
  };
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
}

interface CulturalContext {
  history: string;
  architecture: string;
  localCustoms: string[];
  famousVisitors: string[];
  legends: string[];
  bestPhotos: string[];
  localTips: string[];
}

export const ContextualDiscovery: React.FC<ContextualDiscoveryProps> = ({ 
  poiId, 
  nearbyPOIs: initialNearbyPOIs, 
  coordinates 
}) => {
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>(initialNearbyPOIs);
  const [walkingRoutes, setWalkingRoutes] = useState<WalkingRoute[]>([]);
  const [culturalContext, setCulturalContext] = useState<CulturalContext | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance');
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchAdditionalData();
  }, [poiId]);

  const fetchAdditionalData = async () => {
    try {
      setLoading(true);
      const [routesRes, contextRes] = await Promise.all([
        fetch(`/api/v1/pois/${poiId}/walking-routes`),
        fetch(`/api/v1/pois/${poiId}/cultural-context`)
      ]);

      if (routesRes.ok) {
        const routes = await routesRes.json();
        setWalkingRoutes(routes);
      }

      if (contextRes.ok) {
        const context = await contextRes.json();
        setCulturalContext(context);
      }
    } catch (error) {
      console.error('Failed to fetch additional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirections = async (poi: NearbyPOI) => {
    try {
      const response = await fetch(`/api/v1/integrations/maps/directions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: coordinates,
          destination: { lat: poi.coordinates?.lat, lng: poi.coordinates?.lng },
          mode: 'walking'
        })
      });
      
      if (response.ok) {
        const directions = await response.json();
        // Handle directions display
        console.log('Directions:', directions);
      }
    } catch (error) {
      console.error('Failed to get directions:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      restaurant: <Utensils className="w-5 h-5" />,
      cafe: <Coffee className="w-5 h-5" />,
      shopping: <ShoppingBag className="w-5 h-5" />,
      parking: <ParkingCircle className="w-5 h-5" />,
      transport: <Bus className="w-5 h-5" />,
      nature: <TreePine className="w-5 h-5" />,
      museum: <Building2 className="w-5 h-5" />,
      viewpoint: <Mountain className="w-5 h-5" />,
      beach: <Waves className="w-5 h-5" />,
    };
    
    return iconMap[category.toLowerCase()] || <MapPin className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      restaurant: 'bg-orange-100 text-orange-800',
      cafe: 'bg-amber-100 text-amber-800',
      shopping: 'bg-purple-100 text-purple-800',
      parking: 'bg-gray-100 text-gray-800',
      transport: 'bg-blue-100 text-blue-800',
      nature: 'bg-green-100 text-green-800',
      museum: 'bg-indigo-100 text-indigo-800',
      viewpoint: 'bg-teal-100 text-teal-800',
      beach: 'bg-cyan-100 text-cyan-800',
    };
    
    return colorMap[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatWalkingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const categories = [...new Set(nearbyPOIs.map(poi => poi.category))];
  
  const filteredPOIs = nearbyPOIs
    .filter(poi => selectedCategory === 'all' || poi.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance': return a.distance - b.distance;
        case 'rating': return b.rating - a.rating;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl shadow-xl text-white p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Navigation className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Explore Nearby</h2>
            <p className="text-white/80">Discover amazing places within walking distance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{filteredPOIs.length}</div>
            <div className="text-sm text-white/80">Nearby Places</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{walkingRoutes.length}</div>
            <div className="text-sm text-white/80">Walking Routes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-white/80">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.min(...filteredPOIs.map(p => p.walkingTime))}
            </div>
            <div className="text-sm text-white/80">Min Walk (min)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getCategoryIcon(category)}
                {category}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">Sort by Distance</option>
              <option value="rating">Sort by Rating</option>
              <option value="name">Sort by Name</option>
            </select>
            
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                showMap
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map View */}
      {showMap && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 400 }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="h-96 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Interactive Map</h3>
              <p className="text-gray-500">Map component would be integrated here</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Walking Routes */}
      {walkingRoutes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Route className="w-6 h-6 text-blue-500" />
            Recommended Walking Routes
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {walkingRoutes.map((route) => (
              <motion.div
                key={route.id}
                whileHover={{ y: -2 }}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={route.image}
                    alt={route.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-2">{route.name}</h4>
                    <p className="text-gray-600 text-sm mb-3">{route.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Route className="w-4 h-4" />
                        <span>{formatDistance(route.distance)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatWalkingTime(route.duration)}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty)}`}>
                        {route.difficulty}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {route.pois.length} stops
                      </span>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        Start Route
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby POIs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPOIs.map((poi) => (
          <motion.div
            key={poi.id}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer"
          >
            <div className="relative h-48">
              <img
                src={poi.image}
                alt={poi.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(poi.category)}`}>
                  <span className="flex items-center gap-1">
                    {getCategoryIcon(poi.category)}
                    {poi.category}
                  </span>
                </span>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-500 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              
              {poi.isOpen && (
                <div className="absolute bottom-4 left-4">
                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                    Open Now
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{poi.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-sm">{poi.rating}</span>
                  <span className="text-gray-500 text-sm">({poi.reviewCount})</span>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{poi.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Navigation className="w-4 h-4" />
                    <span>{formatDistance(poi.distance)} away</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{poi.walkingTime} min walk</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{poi.address}</span>
                </div>
              </div>
              
              {poi.highlights.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {poi.highlights.slice(0, 2).map((highlight, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {highlight}
                      </span>
                    ))}
                    {poi.highlights.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{poi.highlights.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleDirections(poi)}
                  className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </button>
                <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cultural Context */}
      {culturalContext && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Cultural Context & Local Insights
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-3">Local History</h4>
              <p className="text-gray-700 mb-6">{culturalContext.history}</p>
              
              <h4 className="text-lg font-semibold mb-3">Architecture & Design</h4>
              <p className="text-gray-700">{culturalContext.architecture}</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-3">Local Customs</h4>
                <ul className="space-y-2">
                  {culturalContext.localCustoms.map((custom, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <span className="text-gray-700">{custom}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-3">Local Tips</h4>
                <ul className="space-y-2">
                  {culturalContext.localTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
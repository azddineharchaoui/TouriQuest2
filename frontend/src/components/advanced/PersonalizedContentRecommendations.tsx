import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp,
  Filter,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Eye,
  Zap,
  Brain,
  Target,
  BarChart3,
  Settings,
  ChevronRight,
  Info
} from 'lucide-react';
import { RecommendationService, PersonalizedRecommendation, RecommendationRequest, RecommendationResponse, TrendingRecommendation, PopularRecommendation } from '../../api/services/recommendation';
import { getServiceFactory } from '../../api/ServiceFactory';

interface PersonalizedContentRecommendationsProps {
  userId?: string;
  location?: string;
  className?: string;
  onRecommendationClick?: (recommendation: PersonalizedRecommendation) => void;
  onFeedback?: (recommendationId: string, feedback: string) => void;
}

interface RecommendationFilters {
  types: string[];
  priceRange: [number, number];
  rating: number;
  distance: number;
  availability: boolean;
}

interface UserBehavior {
  views: Set<string>;
  likes: Set<string>;
  bookmarks: Set<string>;
  shares: Set<string>;
  sessionStartTime: Date;
}

export const PersonalizedContentRecommendations: React.FC<PersonalizedContentRecommendationsProps> = ({
  userId,
  location,
  className,
  onRecommendationClick,
  onFeedback
}) => {
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [trendingItems, setTrendingItems] = useState<TrendingRecommendation[]>([]);
  const [popularItems, setPopularItems] = useState<PopularRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personalized' | 'trending' | 'popular'>('personalized');
  const [algorithm, setAlgorithm] = useState<'collaborative' | 'content_based' | 'hybrid' | 'deep_learning'>('hybrid');
  const [diversityLevel, setDiversityLevel] = useState(0.7);
  const [filters, setFilters] = useState<RecommendationFilters>({
    types: [],
    priceRange: [0, 1000],
    rating: 0,
    distance: 50,
    availability: false
  });
  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    views: new Set(),
    likes: new Set(),
    bookmarks: new Set(),
    shares: new Set(),
    sessionStartTime: new Date()
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const recommendationService = useMemo(() => {
    const factory = getServiceFactory();
    return factory.recommendation;
  }, []);

  // Real-time recommendation updates
  useEffect(() => {
    if (!realTimeUpdates || !userId) return;

    const interval = setInterval(() => {
      fetchRealTimeRecommendations();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates, userId, location]);

  const fetchRealTimeRecommendations = useCallback(async () => {
    if (!userId) return;

    try {
      const context = {
        currentLocation: undefined, // Would be provided by geolocation
        groupSize: 1,
        sessionDuration: Date.now() - userBehavior.sessionStartTime.getTime()
      };

      const realTimeFactors = {
        currentWeather: 'sunny', // Would be fetched from weather API
        deviceType: 'desktop',
        userMood: 'exploratory' // Could be inferred from behavior
      };

      const realTimeRecs = await recommendationService.getRealTimeRecommendations(
        userId,
        context,
        realTimeFactors
      );

      // Merge with existing recommendations, prioritizing real-time ones
      setRecommendations(prev => {
        const merged = [...realTimeRecs, ...prev];
        const unique = merged.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        return unique.slice(0, 20); // Limit to 20 items
      });
    } catch (err) {
      console.warn('Failed to fetch real-time recommendations:', err);
    }
  }, [userId, userBehavior.sessionStartTime, recommendationService]);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build recommendation request
      const request: RecommendationRequest = {
        userId,
        location,
        context: {
          groupSize: 1,
          sessionDuration: Date.now() - userBehavior.sessionStartTime.getTime(),
          timeOfDay: new Date().getHours() < 12 ? 'morning' : 
                    new Date().getHours() < 18 ? 'afternoon' : 'evening'
        },
        preferences: {
          interests: ['travel', 'culture', 'food'], // Would be loaded from user profile
          travelStyle: 'explorer',
          activityLevel: 'moderate',
          accessibility: {
            wheelchairAccessible: false,
            visualImpairments: [],
            hearingImpairments: [],
            motorImpairments: [],
            cognitiveSupport: [],
            preferredLanguages: ['en'],
            voiceControlEnabled: false,
            screenReaderCompatible: false,
            largeText: false,
            highContrast: false
          },
          socialPreferences: {
            shareRecommendations: true,
            friendInfluence: 0.5,
            crowdedPlacesTolerance: 0.7,
            socialActivityPreference: 0.6,
            familyFriendlyRequired: false,
            petFriendlyRequired: false
          },
          priceConsciousness: 0.6,
          adventureSeekingLevel: 0.7,
          culturalInterest: 0.8,
          relaxationPreference: 0.5
        },
        filters: {
          categories: filters.types.length > 0 ? filters.types : undefined,
          priceRange: {
            min: filters.priceRange[0],
            max: filters.priceRange[1]
          },
          rating: {
            min: filters.rating
          },
          distance: {
            max: filters.distance,
            unit: 'km'
          },
          availability: {
            required: filters.availability
          }
        },
        algorithm,
        diversityLevel,
        limit: 20
      };

      // Fetch different types of recommendations
      const [personalizedResponse, trendingResponse, popularResponse] = await Promise.all([
        recommendationService.getPersonalizedRecommendations(request),
        recommendationService.getTrendingRecommendations(location, undefined, '7d'),
        recommendationService.getPopularRecommendations(location, undefined, '30d', 10)
      ]);

      setRecommendations(personalizedResponse.recommendations);
      setTrendingItems(trendingResponse.trending);
      setPopularItems(popularResponse);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }, [userId, location, filters, algorithm, diversityLevel, userBehavior.sessionStartTime, recommendationService]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRecommendationInteraction = useCallback(async (
    recommendation: PersonalizedRecommendation, 
    action: 'view' | 'like' | 'bookmark' | 'share' | 'click'
  ) => {
    if (!userId) return;

    // Track behavior locally
    setUserBehavior(prev => {
      const updated = { ...prev };
      switch (action) {
        case 'view':
          updated.views.add(recommendation.id);
          break;
        case 'like':
          updated.likes.add(recommendation.id);
          break;
        case 'bookmark':
          updated.bookmarks.add(recommendation.id);
          break;
        case 'share':
          updated.shares.add(recommendation.id);
          break;
      }
      return updated;
    });

    // Send feedback to backend
    try {
      // Map frontend actions to backend feedback types
      const feedbackMap: Record<string, string> = {
        'view': 'clicked',
        'like': 'like',
        'bookmark': 'clicked',
        'share': 'shared',
        'click': 'clicked'
      };

      await recommendationService.provideFeedback({
        recommendationId: recommendation.id,
        userId,
        feedback: feedbackMap[action] as any,
        timestamp: new Date().toISOString(),
        context: {
          algorithm,
          diversityLevel,
          sessionDuration: Date.now() - userBehavior.sessionStartTime.getTime()
        }
      });

      // Track behavior for learning
      await recommendationService.trackBehavior({
        userId,
        sessionId: 'session-' + userBehavior.sessionStartTime.getTime(),
        actions: [{
          actionType: action === 'like' ? 'favorite' : action as any,
          itemId: recommendation.id,
          itemType: recommendation.type,
          timestamp: new Date().toISOString(),
          context: {
            position: recommendations.findIndex(r => r.id === recommendation.id),
            algorithm,
            score: recommendation.score
          }
        }],
        preferences: {
          interests: ['travel', 'culture', 'food'],
          travelStyle: 'explorer',
          activityLevel: 'moderate',
          accessibility: {
            wheelchairAccessible: false,
            visualImpairments: [],
            hearingImpairments: [],
            motorImpairments: [],
            cognitiveSupport: [],
            preferredLanguages: ['en'],
            voiceControlEnabled: false,
            screenReaderCompatible: false,
            largeText: false,
            highContrast: false
          },
          socialPreferences: {
            shareRecommendations: true,
            friendInfluence: 0.5,
            crowdedPlacesTolerance: 0.7,
            socialActivityPreference: 0.6,
            familyFriendlyRequired: false,
            petFriendlyRequired: false
          },
          priceConsciousness: 0.6,
          adventureSeekingLevel: 0.7,
          culturalInterest: 0.8,
          relaxationPreference: 0.5
        },
        contextualFactors: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          algorithm
        }
      });

      if (onFeedback) {
        onFeedback(recommendation.id, action);
      }
    } catch (err) {
      console.error('Failed to send feedback:', err);
    }

    // Handle click action
    if (action === 'click' && onRecommendationClick) {
      onRecommendationClick(recommendation);
    }
  }, [userId, algorithm, diversityLevel, userBehavior.sessionStartTime, recommendations, recommendationService, onFeedback, onRecommendationClick]);

  const RecommendationCard: React.FC<{ 
    recommendation: PersonalizedRecommendation;
    index: number;
  }> = ({ recommendation, index }) => {
    const isViewed = userBehavior.views.has(recommendation.id);
    const isLiked = userBehavior.likes.has(recommendation.id);
    const isBookmarked = userBehavior.bookmarks.has(recommendation.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
          isViewed ? 'ring-2 ring-blue-100' : ''
        }`}
        onViewportEnter={() => handleRecommendationInteraction(recommendation, 'view')}
      >
        <div className="relative">
          {recommendation.imageUrl && (
            <img
              src={recommendation.imageUrl}
              alt={recommendation.title}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-sm font-medium">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              {Math.round(recommendation.score * 100)}%
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs font-medium">
            {recommendation.type}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 
              className="font-semibold text-lg text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
              onClick={() => handleRecommendationInteraction(recommendation, 'click')}
            >
              {recommendation.title}
            </h3>
            {recommendation.rating && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm text-gray-600">{recommendation.rating}</span>
              </div>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {recommendation.description}
          </p>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {recommendation.location}
            </div>
            {recommendation.distance && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {recommendation.distance}km away
              </div>
            )}
            {recommendation.priceRange && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {recommendation.priceRange}
              </div>
            )}
          </div>

          {recommendation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {recommendation.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
              {recommendation.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{recommendation.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {showExplanations && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800 font-medium">Why recommended:</p>
                  <p className="text-xs text-blue-700">{recommendation.reasoning}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRecommendationInteraction(recommendation, 'like')}
                className={`p-2 rounded-full transition-colors ${
                  isLiked 
                    ? 'bg-red-100 text-red-600' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRecommendationInteraction(recommendation, 'bookmark')}
                className={`p-2 rounded-full transition-colors ${
                  isBookmarked 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRecommendationInteraction(recommendation, 'share')}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Target className="w-3 h-3" />
              {Math.round(recommendation.confidence * 100)}% match
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const TrendingCard: React.FC<{ item: TrendingRecommendation }> = ({ item }) => (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900">{item.title}</h3>
        <div className="flex items-center gap-1 text-orange-600 bg-orange-100 rounded-full px-2 py-1 text-xs">
          <TrendingUp className="w-3 h-3" />
          +{Math.round(item.growthRate * 100)}%
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <MapPin className="w-3 h-3" />
        {item.location}
        <span>•</span>
        <span>Trend Score: {Math.round(item.trendScore * 100)}</span>
      </div>
    </div>
  );

  const PopularCard: React.FC<{ item: PopularRecommendation }> = ({ item }) => (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900">{item.title}</h3>
        <div className="flex items-center gap-1 text-green-600">
          <Star className="w-3 h-3 fill-current" />
          <span className="text-xs">{item.averageRating}</span>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <MapPin className="w-3 h-3" />
        {item.location}
        <span>•</span>
        <Users className="w-3 h-3" />
        {item.reviewCount} reviews
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${className} p-6`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} p-6`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchRecommendations}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Personalized Recommendations
          </h2>
          <p className="text-gray-600">
            Curated just for you using advanced AI algorithms
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className={`p-2 rounded-lg transition-colors ${
              showExplanations
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Show explanations"
          >
            <Info className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          
          <button
            onClick={fetchRecommendations}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Algorithm & Settings */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Algorithm:</span>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="hybrid">Hybrid AI</option>
            <option value="collaborative">Collaborative Filtering</option>
            <option value="content_based">Content-Based</option>
            <option value="deep_learning">Deep Learning</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Diversity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={diversityLevel}
            onChange={(e) => setDiversityLevel(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-4 mb-6 overflow-hidden"
          >
            <h3 className="font-medium text-gray-900 mb-3">Filters</h3>
            {/* Filter controls would go here */}
            <div className="text-sm text-gray-600">
              Filter controls for price range, categories, ratings, etc.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'personalized', label: 'For You', icon: Target },
          { key: 'trending', label: 'Trending', icon: TrendingUp },
          { key: 'popular', label: 'Popular', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'personalized' && (
          <motion.div
            key="personalized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {recommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No personalized recommendations available</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'trending' && (
          <motion.div
            key="trending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {trendingItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {trendingItems.map(item => (
                  <TrendingCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No trending items available</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'popular' && (
          <motion.div
            key="popular"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {popularItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {popularItems.map(item => (
                  <PopularCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No popular items available</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time updates indicator */}
      {realTimeUpdates && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-2 rounded-full text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          Live updates enabled
        </div>
      )}
    </div>
  );
};
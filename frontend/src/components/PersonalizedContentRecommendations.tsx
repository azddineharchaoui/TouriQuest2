import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Heart,
  Star,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Filter,
  Search,
  RefreshCw,
  Settings,
  Users,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Plane,
  Hotel,
  Car,
  Activity,
  Utensils,
  Coffee,
  ShoppingBag,
  Camera,
  Music,
  Gamepad2,
  Book,
  Palette,
  Mountain,
  Waves,
  Sun,
  Snowflake,
  Leaf,
  Moon,
  Zap,
  Lightbulb,
  Award,
  Gem,
  Flag,
  Globe,
  Compass,
  Navigation,
  Route,
  Map,
  Layers,
  Grid,
  List,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Upload,
  Copy,
  Edit3,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Phone,
  Mail,
  MessageCircle,
  Bell,
  BellOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';

interface PersonalizedRecommendationsProps {
  onClose: () => void;
  userProfile?: UserProfile;
  currentLocation?: Location;
}

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  behavior: UserBehavior;
  demographics: UserDemographics;
  travelHistory: TravelHistory[];
  socialConnections: SocialConnection[];
}

interface UserPreferences {
  destinations: string[];
  activities: string[];
  accommodations: string[];
  budgetRange: { min: number; max: number };
  travelStyle: string[];
  foodPreferences: string[];
  accessibility: string[];
  interests: string[];
  seasonalPreferences: SeasonalPreference[];
  groupSize: 'solo' | 'couple' | 'family' | 'group';
  pace: 'relaxed' | 'moderate' | 'active';
}

interface UserBehavior {
  clickPatterns: ClickPattern[];
  searchHistory: SearchQuery[];
  bookingPatterns: BookingPattern[];
  engagementMetrics: EngagementMetric[];
  sessionData: SessionData[];
  conversionEvents: ConversionEvent[];
  feedbackHistory: FeedbackEvent[];
}

interface UserDemographics {
  ageRange: string;
  location: string;
  occupation: string;
  income: string;
  travelFrequency: string;
  primaryLanguage: string;
}

interface TravelHistory {
  id: string;
  destination: string;
  type: string;
  duration: number;
  rating: number;
  activities: string[];
  spending: number;
  companions: number;
  season: string;
  satisfaction: number;
}

interface SocialConnection {
  id: string;
  type: 'friend' | 'family' | 'colleague' | 'follower';
  preferences: UserPreferences;
  sharedTrips: string[];
  influence: number;
}

interface SeasonalPreference {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  destinations: string[];
  activities: string[];
  weight: number;
}

interface ClickPattern {
  itemType: string;
  itemId: string;
  timestamp: Date;
  duration: number;
  action: 'view' | 'click' | 'hover' | 'scroll';
  context: any;
}

interface SearchQuery {
  query: string;
  filters: any;
  results: number;
  clicked: string[];
  timestamp: Date;
  intent: string;
}

interface BookingPattern {
  type: string;
  advanceBooking: number;
  priceRange: { min: number; max: number };
  modifications: number;
  cancellations: number;
  repeatBookings: number;
}

interface EngagementMetric {
  feature: string;
  timeSpent: number;
  interactions: number;
  satisfaction: number;
  frequency: number;
}

interface SessionData {
  id: string;
  duration: number;
  pageViews: number;
  interactions: number;
  conversions: number;
  exitPage: string;
  timestamp: Date;
}

interface ConversionEvent {
  type: 'booking' | 'signup' | 'subscription' | 'share' | 'review';
  value: number;
  context: any;
  timestamp: Date;
}

interface FeedbackEvent {
  type: 'like' | 'dislike' | 'rating' | 'review' | 'report';
  itemId: string;
  value: number | string;
  timestamp: Date;
}

interface Location {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: string;
}

interface RecommendationItem {
  id: string;
  type: 'property' | 'experience' | 'poi' | 'restaurant' | 'event' | 'deal' | 'article';
  title: string;
  description: string;
  image: string;
  rating: number;
  price?: number;
  currency: string;
  location: string;
  tags: string[];
  score: number;
  reasons: RecommendationReason[];
  alternatives: AlternativeItem[];
  metadata: RecommendationMetadata;
}

interface RecommendationReason {
  type: 'preference_match' | 'behavior_similarity' | 'social_influence' | 'trending' | 'seasonal' | 'location_based';
  title: string;
  description: string;
  confidence: number;
  weight: number;
  evidence: string[];
}

interface AlternativeItem {
  id: string;
  title: string;
  score: number;
  differences: string[];
  advantages: string[];
}

interface RecommendationMetadata {
  algorithm: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  confidence: number;
  freshness: number;
  diversity: number;
  novelty: number;
  explainability: number;
  lastUpdated: Date;
}

interface RecommendationSet {
  id: string;
  name: string;
  description: string;
  items: RecommendationItem[];
  algorithm: string;
  parameters: any;
  performance: RecommendationPerformance;
  createdAt: Date;
}

interface RecommendationPerformance {
  clickThroughRate: number;
  conversionRate: number;
  userSatisfaction: number;
  diversity: number;
  novelty: number;
  coverage: number;
}

interface RecommendationFeedback {
  itemId: string;
  action: 'like' | 'dislike' | 'not_interested' | 'irrelevant' | 'offensive' | 'seen_before';
  reason?: string;
  timestamp: Date;
  context: any;
}

interface RecommendationExplanation {
  primary: string;
  secondary: string[];
  evidence: Evidence[];
  alternatives: string[];
  confidence: number;
  personalizedFactors: PersonalizedFactor[];
}

interface Evidence {
  type: 'historical' | 'behavioral' | 'social' | 'contextual';
  description: string;
  strength: number;
}

interface PersonalizedFactor {
  factor: string;
  value: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function PersonalizedContentRecommendations({ onClose, userProfile, currentLocation }: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationSet[]>([]);
  const [activeSet, setActiveSet] = useState<RecommendationSet | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [showExplanations, setShowExplanations] = useState(true);
  const [personalizedOnly, setPersonalizedOnly] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [recommendationHistory, setRecommendationHistory] = useState<RecommendationSet[]>([]);
  const [preferencesForm, setPreferencesForm] = useState({
    interests: [] as string[],
    travelStyle: [] as string[],
    budget: { min: 0, max: 5000 },
    accessibility: [] as string[]
  });

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations();
    loadPreferences();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      refreshRecommendations();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Track user behavior for improved recommendations
  useEffect(() => {
    const trackBehavior = () => {
      trackUserInteraction('page_view', 'recommendations', {
        timestamp: new Date(),
        context: { activeTab, filterCategory, sortBy }
      });
    };

    trackBehavior();
  }, [activeTab, filterCategory, sortBy]);

  const loadRecommendations = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/personalized`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendationSets || []);
        
        // Set default active set
        if (data.recommendationSets?.length > 0) {
          setActiveSet(data.recommendationSets[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/preferences`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferencesForm({
          interests: data.interests || [],
          travelStyle: data.travelStyle || [],
          budget: data.budgetRange || { min: 0, max: 5000 },
          accessibility: data.accessibility || []
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const refreshRecommendations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/personalized?refresh=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if there are new recommendations
        const newItems = data.recommendationSets?.filter((newSet: RecommendationSet) => 
          !recommendations.some(existingSet => existingSet.id === newSet.id)
        );

        if (newItems?.length > 0) {
          setRecommendations(data.recommendationSets || []);
          
          // Notify user about new recommendations
          showNotification('New recommendations available!', 'info');
        }
      }
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    }
  };

  const provideFeedback = async (itemId: string, feedback: RecommendationFeedback) => {
    try {
      await fetch(`${API_BASE_URL}/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          itemId,
          ...feedback,
          context: {
            recommendationSet: activeSet?.id,
            algorithm: activeSet?.algorithm,
            position: activeSet?.items.findIndex(item => item.id === itemId),
            ...feedback.context
          }
        })
      });

      // Update UI optimistically
      if (activeSet) {
        const updatedItems = activeSet.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              metadata: {
                ...item.metadata,
                lastUpdated: new Date()
              }
            };
          }
          return item;
        });

        setActiveSet({
          ...activeSet,
          items: updatedItems
        });
      }

      // Trigger recommendation refresh for better personalization
      setTimeout(() => refreshRecommendations(), 1000);
      
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const updatePreferences = async (newPreferences: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        setPreferencesForm(newPreferences);
        
        // Refresh recommendations with new preferences
        await refreshRecommendations();
        
        showNotification('Preferences updated! Recommendations refreshed.', 'success');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      showNotification('Failed to update preferences', 'error');
    }
  };

  const trackUserInteraction = async (action: string, itemType: string, context: any) => {
    try {
      await fetch(`${API_BASE_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action,
          itemType,
          context,
          timestamp: new Date()
        })
      });
    } catch (error) {
      // Silently fail for analytics
      console.warn('Failed to track interaction:', error);
    }
  };

  const getRecommendationExplanation = (item: RecommendationItem): RecommendationExplanation => {
    const primaryReason = item.reasons.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    return {
      primary: primaryReason.title,
      secondary: item.reasons.slice(1, 3).map(r => r.title),
      evidence: item.reasons.map(r => ({
        type: r.type as Evidence['type'],
        description: r.description,
        strength: r.confidence
      })),
      alternatives: item.alternatives.map(alt => alt.title),
      confidence: item.score,
      personalizedFactors: [
        { factor: 'Travel Style', value: 'Adventure', impact: 'high', description: 'Based on your booking history' },
        { factor: 'Budget', value: '$200-500/night', impact: 'medium', description: 'Within your preferred range' },
        { factor: 'Season', value: 'Summer', impact: 'low', description: 'Current travel season' }
      ]
    };
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    // Implementation would show toast notification
    console.log(`${type}: ${message}`);
  };

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    if (!activeSet) return [];

    let filtered = activeSet.items;

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.type === filterCategory);
    }

    // Sort by selected criteria
    switch (sortBy) {
      case 'relevance':
        filtered.sort((a, b) => b.score - a.score);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [activeSet, filterCategory, sortBy]);

  // Recommendation categories
  const categories = useMemo(() => {
    if (!activeSet) return [];
    
    const categoryCount: { [key: string]: number } = {};
    activeSet.items.forEach(item => {
      categoryCount[item.type] = (categoryCount[item.type] || 0) + 1;
    });

    return Object.entries(categoryCount).map(([type, count]) => ({ type, count }));
  }, [activeSet]);

  // Recommendation Item Card Component
  const RecommendationCard = ({ item, position }: { item: RecommendationItem; position: number }) => (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => setSelectedItem(item)}>
      <div className="relative overflow-hidden">
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Recommendation Score Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="default" className="bg-black/70 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            {Math.round(item.score * 100)}% match
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                provideFeedback(item.id, {
                  itemId: item.id,
                  action: 'like',
                  timestamp: new Date(),
                  context: { position }
                });
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                // Share functionality
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trending/Popular Badge */}
        {item.metadata.novelty > 0.8 && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {item.title}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{item.rating}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center space-x-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-sm">{item.location}</span>
              </div>
            </div>
          </div>
          
          {item.price && (
            <div className="text-right">
              <div className="text-lg font-bold">
                {item.currency}{item.price}
              </div>
              <div className="text-xs text-muted-foreground">per night</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3} more
            </Badge>
          )}
        </div>

        {/* Recommendation Explanation */}
        {showExplanations && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Why recommended?</span>
            </div>
            <div className="space-y-1">
              {item.reasons.slice(0, 2).map((reason, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-xs text-muted-foreground">
                    {reason.title}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(reason.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                provideFeedback(item.id, {
                  itemId: item.id,
                  action: 'like',
                  timestamp: new Date(),
                  context: { position }
                });
              }}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Like
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                provideFeedback(item.id, {
                  itemId: item.id,
                  action: 'not_interested',
                  timestamp: new Date(),
                  context: { position }
                });
              }}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Not Interested
            </Button>
          </div>
          
          <Button size="sm">
            View Details
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Recommendation Set Tab Component
  const RecommendationSetTab = ({ set }: { set: RecommendationSet }) => (
    <div className="flex items-center space-x-2">
      <span>{set.name}</span>
      <Badge variant="outline" className="text-xs">
        {set.items.length}
      </Badge>
      {set.performance.clickThroughRate > 0.1 && (
        <Badge variant="default" className="text-xs">
          <TrendingUp className="h-2 w-2 mr-1" />
          Hot
        </Badge>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Sparkles className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">Personalized Recommendations</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <span>AI-powered suggestions</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Updated {refreshInterval ? 'real-time' : '5min ago'}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center space-x-1">
                    <Brain className="h-3 w-3" />
                    <span>Learning from your behavior</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm">Real-time updates:</label>
                <Switch
                  checked={refreshInterval !== null}
                  onCheckedChange={(enabled) => {
                    if (enabled) {
                      const interval = setInterval(refreshRecommendations, 30000);
                      setRefreshInterval(interval);
                    } else {
                      if (refreshInterval) clearInterval(refreshInterval);
                      setRefreshInterval(null);
                    }
                  }}
                />
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={refreshRecommendations}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <TabsList className="grid w-fit grid-cols-4">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="personalized">For You</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="analytics">Insights</TabsTrigger>
                </TabsList>
                
                {activeTab === 'personalized' && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4" />
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(({ type, count }) => (
                          <option key={type} value={type}>
                            {type} ({count})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="rating">Rating</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="text-sm">Show explanations:</label>
                      <Switch
                        checked={showExplanations}
                        onCheckedChange={setShowExplanations}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="dashboard" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Target className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {activeSet?.performance.clickThroughRate ? 
                                  Math.round(activeSet.performance.clickThroughRate * 100) : 0}%
                              </div>
                              <div className="text-sm text-muted-foreground">Click Rate</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Zap className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {activeSet?.performance.conversionRate ? 
                                  Math.round(activeSet.performance.conversionRate * 100) : 0}%
                              </div>
                              <div className="text-sm text-muted-foreground">Conversion</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Heart className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {activeSet?.performance.userSatisfaction ? 
                                  activeSet.performance.userSatisfaction.toFixed(1) : '0.0'}
                              </div>
                              <div className="text-sm text-muted-foreground">Satisfaction</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Gem className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {activeSet?.performance.diversity ? 
                                  Math.round(activeSet.performance.diversity * 100) : 0}%
                              </div>
                              <div className="text-sm text-muted-foreground">Diversity</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recommendation Sets */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendation Categories</CardTitle>
                        <CardDescription>
                          Different AI algorithms powering your personalized experience
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {recommendations.map((set) => (
                            <Card 
                              key={set.id} 
                              className={`cursor-pointer hover:shadow-md transition-shadow ${
                                activeSet?.id === set.id ? 'ring-2 ring-primary' : ''
                              }`}
                              onClick={() => setActiveSet(set)}
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">{set.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {set.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant="outline" className="text-xs">
                                    {set.algorithm}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {set.items.length} items
                                  </span>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span>Click Rate:</span>
                                    <span>{Math.round(set.performance.clickThroughRate * 100)}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Satisfaction:</span>
                                    <span>{set.performance.userSatisfaction.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span>{set.createdAt.toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="personalized" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {activeSet && (
                      <>
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-2">{activeSet.name}</h3>
                          <p className="text-muted-foreground mb-4">{activeSet.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Brain className="h-4 w-4" />
                              <span>Algorithm: {activeSet.algorithm}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Updated: {activeSet.createdAt.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4" />
                              <span>{filteredRecommendations.length} recommendations</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredRecommendations.map((item, index) => (
                            <RecommendationCard key={item.id} item={item} position={index} />
                          ))}
                        </div>

                        {filteredRecommendations.length === 0 && (
                          <div className="text-center py-12">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-medium mb-2">No Recommendations</h3>
                            <p className="text-muted-foreground mb-4">
                              Try adjusting your filters or updating your preferences
                            </p>
                            <Button onClick={() => setActiveTab('preferences')}>
                              Update Preferences
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preferences" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Travel Preferences</CardTitle>
                        <CardDescription>
                          Help us personalize your recommendations by sharing your preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Interests */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">Interests</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['Adventure', 'Culture', 'Relaxation', 'Food', 'Nature', 'History', 'Art', 'Nightlife'].map((interest) => (
                              <div
                                key={interest}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  preferencesForm.interests.includes(interest)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-primary/50'
                                }`}
                                onClick={() => {
                                  const newInterests = preferencesForm.interests.includes(interest)
                                    ? preferencesForm.interests.filter(i => i !== interest)
                                    : [...preferencesForm.interests, interest];
                                  setPreferencesForm(prev => ({ ...prev, interests: newInterests }));
                                }}
                              >
                                <div className="text-center">
                                  <div className="text-sm font-medium">{interest}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Travel Style */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">Travel Style</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {['Budget', 'Mid-range', 'Luxury', 'Backpacker', 'Business', 'Family'].map((style) => (
                              <div
                                key={style}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  preferencesForm.travelStyle.includes(style)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-primary/50'
                                }`}
                                onClick={() => {
                                  const newStyles = preferencesForm.travelStyle.includes(style)
                                    ? preferencesForm.travelStyle.filter(s => s !== style)
                                    : [...preferencesForm.travelStyle, style];
                                  setPreferencesForm(prev => ({ ...prev, travelStyle: newStyles }));
                                }}
                              >
                                <div className="text-center">
                                  <div className="text-sm font-medium">{style}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Budget Range */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">
                            Budget Range: ${preferencesForm.budget.min} - ${preferencesForm.budget.max}
                          </label>
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-muted-foreground mb-2 block">Minimum</label>
                              <Slider
                                value={[preferencesForm.budget.min]}
                                onValueChange={([value]) => 
                                  setPreferencesForm(prev => ({ 
                                    ...prev, 
                                    budget: { ...prev.budget, min: value } 
                                  }))
                                }
                                max={2000}
                                min={0}
                                step={50}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-2 block">Maximum</label>
                              <Slider
                                value={[preferencesForm.budget.max]}
                                onValueChange={([value]) => 
                                  setPreferencesForm(prev => ({ 
                                    ...prev, 
                                    budget: { ...prev.budget, max: value } 
                                  }))
                                }
                                max={5000}
                                min={100}
                                step={100}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Accessibility */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">Accessibility Needs</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {['Wheelchair Access', 'Visual Impairment', 'Hearing Impairment', 'Mobility Assistance', 'Service Animals', 'Other'].map((need) => (
                              <div
                                key={need}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  preferencesForm.accessibility.includes(need)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-primary/50'
                                }`}
                                onClick={() => {
                                  const newNeeds = preferencesForm.accessibility.includes(need)
                                    ? preferencesForm.accessibility.filter(n => n !== need)
                                    : [...preferencesForm.accessibility, need];
                                  setPreferencesForm(prev => ({ ...prev, accessibility: newNeeds }));
                                }}
                              >
                                <div className="text-center">
                                  <div className="text-xs font-medium">{need}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={loadPreferences}>
                            Reset
                          </Button>
                          <Button onClick={() => updatePreferences(preferencesForm)}>
                            Save Preferences
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Recommendation Performance */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendation Performance</CardTitle>
                        <CardDescription>
                          How well our AI understands your preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {recommendations.map((set) => (
                            <div key={set.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{set.name}</span>
                                <Badge variant="outline">{set.algorithm}</Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Click Rate</div>
                                  <div className="flex items-center space-x-2">
                                    <Progress 
                                      value={set.performance.clickThroughRate * 100} 
                                      className="h-2 flex-1" 
                                    />
                                    <span>{Math.round(set.performance.clickThroughRate * 100)}%</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-muted-foreground">Conversion</div>
                                  <div className="flex items-center space-x-2">
                                    <Progress 
                                      value={set.performance.conversionRate * 100} 
                                      className="h-2 flex-1" 
                                    />
                                    <span>{Math.round(set.performance.conversionRate * 100)}%</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-muted-foreground">Satisfaction</div>
                                  <div className="flex items-center space-x-2">
                                    <Progress 
                                      value={set.performance.userSatisfaction * 20} 
                                      className="h-2 flex-1" 
                                    />
                                    <span>{set.performance.userSatisfaction.toFixed(1)}/5</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-muted-foreground">Diversity</div>
                                  <div className="flex items-center space-x-2">
                                    <Progress 
                                      value={set.performance.diversity * 100} 
                                      className="h-2 flex-1" 
                                    />
                                    <span>{Math.round(set.performance.diversity * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Learning Progress */}
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Learning Progress</CardTitle>
                        <CardDescription>
                          How our recommendation engine is improving over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-muted/30 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">87%</div>
                              <div className="text-sm text-muted-foreground">Preference Accuracy</div>
                            </div>
                            
                            <div className="text-center p-4 bg-muted/30 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">156</div>
                              <div className="text-sm text-muted-foreground">Interactions Learned</div>
                            </div>
                            
                            <div className="text-center p-4 bg-muted/30 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">23</div>
                              <div className="text-sm text-muted-foreground">Days Active</div>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <h4 className="font-medium mb-3">Recent Improvements</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Better understanding of your budget preferences</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Improved seasonal activity recommendations</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Enhanced location-based suggestions</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
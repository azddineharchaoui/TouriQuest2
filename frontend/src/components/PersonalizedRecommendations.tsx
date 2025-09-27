import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Calendar, 
  MapPin, 
  Star,
  Heart,
  Clock,
  DollarSign,
  Thermometer,
  Sun,
  Cloud,
  Moon,
  Sunrise,
  Sunset,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  Target,
  Lightbulb,
  Compass,
  Route,
  Camera,
  Utensils,
  ShoppingBag,
  Music,
  Palette,
  Mountain,
  Globe,
  X,
  ChevronRight,
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart3,
  PieChart,
  Activity,
  Wifi,
  Signal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';

interface PersonalizedRecommendationsProps {
  onClose?: () => void;
  currentLocation?: { lat: number; lng: number; name: string };
  userPreferences?: UserBehaviorProfile;
  contextData?: ContextData;
}

interface UserBehaviorProfile {
  interests: string[];
  budgetPatterns: BudgetPattern[];
  seasonalPreferences: SeasonalPreference[];
  socialPreferences: SocialPreference;
  travelStyle: 'budget' | 'mid-range' | 'luxury' | 'mixed';
  activityLevel: 'low' | 'medium' | 'high' | 'variable';
  riskTolerance: 'conservative' | 'moderate' | 'adventurous';
  groupDynamics: GroupDynamics;
  learningProfile: LearningProfile;
}

interface BudgetPattern {
  category: string;
  averageSpend: number;
  seasonalVariation: number;
  splurgeItems: string[];
  savingAreas: string[];
}

interface SeasonalPreference {
  season: string;
  destinations: string[];
  activities: string[];
  budgetMultiplier: number;
}

interface SocialPreference {
  networkInfluence: number;
  friendRecommendations: boolean;
  socialSharing: boolean;
  groupBookingPreference: boolean;
}

interface GroupDynamics {
  decisionMaker: 'individual' | 'collaborative' | 'delegated';
  compromiseStyle: 'balanced' | 'majority' | 'rotation';
  conflictResolution: 'discussion' | 'voting' | 'authority';
}

interface LearningProfile {
  adaptationSpeed: 'fast' | 'medium' | 'slow';
  feedbackSensitivity: 'high' | 'medium' | 'low';
  explorationVsExploitation: number; // 0-100
}

interface ContextData {
  currentWeather: WeatherContext;
  timeOfDay: TimeContext;
  crowdLevels: CrowdContext;
  localEvents: EventContext[];
  seasonalFactors: SeasonalContext;
  userState: UserStateContext;
}

interface WeatherContext {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
  };
  forecast: {
    hourly: any[];
    daily: any[];
  };
  recommendations: string[];
  alerts: string[];
}

interface TimeContext {
  hour: number;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  dayType: 'weekday' | 'weekend' | 'holiday';
  energyLevel: 'high' | 'medium' | 'low';
}

interface CrowdContext {
  level: 'low' | 'medium' | 'high' | 'extreme';
  prediction: any[];
  alternatives: string[];
}

interface EventContext {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  location: string;
  relevanceScore: number;
  ticketsAvailable: boolean;
  priceRange: [number, number];
}

interface SeasonalContext {
  season: string;
  touristSeason: 'low' | 'medium' | 'high' | 'peak';
  localHolidays: string[];
  weatherTrends: any[];
}

interface UserStateContext {
  batteryLevel: number;
  connectivityQuality: 'excellent' | 'good' | 'poor' | 'offline';
  currentActivity: string;
  companionCount: number;
  stressLevel: 'low' | 'medium' | 'high';
  hungerLevel: 'low' | 'medium' | 'high';
  energyLevel: 'low' | 'medium' | 'high';
}

interface Recommendation {
  id: string;
  type: 'activity' | 'restaurant' | 'accommodation' | 'experience' | 'route' | 'event';
  title: string;
  description: string;
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    distance: number;
  };
  relevanceScore: number;
  personalizedScore: number;
  contextScore: number;
  socialScore: number;
  reasons: RecommendationReason[];
  timing: {
    optimal: string;
    duration: number;
    flexibility: 'fixed' | 'flexible' | 'variable';
  };
  cost: {
    amount: number;
    currency: string;
    priceLevel: 1 | 2 | 3 | 4 | 5;
    valueScore: number;
  };
  metadata: {
    confidence: number;
    source: string;
    lastUpdated: string;
    popularity: number;
    trendingScore: number;
  };
  alternatives: string[];
  booking: {
    required: boolean;
    provider: string;
    availability: 'immediate' | 'advance' | 'limited';
  };
}

interface RecommendationReason {
  type: 'preference' | 'behavior' | 'context' | 'social' | 'seasonal' | 'budget';
  description: string;
  weight: number;
  confidence: number;
}

export function PersonalizedRecommendations({ 
  onClose, 
  currentLocation,
  userPreferences,
  contextData 
}: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFrame, setTimeFrame] = useState('now');
  const [sortBy, setSortBy] = useState('relevance');
  const [showReasons, setShowReasons] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [socialInfluence, setSocialInfluence] = useState(50);
  const [refreshing, setRefreshing] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ [key: string]: 'like' | 'dislike' | null }>({});

  // Recommendation categories
  const categories = [
    { id: 'all', name: 'All', icon: Target },
    { id: 'activity', name: 'Activities', icon: Mountain },
    { id: 'restaurant', name: 'Dining', icon: Utensils },
    { id: 'experience', name: 'Experiences', icon: Camera },
    { id: 'event', name: 'Events', icon: Music },
    { id: 'route', name: 'Routes', icon: Route }
  ];

  // Time frame options
  const timeFrames = [
    { id: 'now', name: 'Right Now', description: 'Next 2 hours' },
    { id: 'today', name: 'Today', description: 'Rest of today' },
    { id: 'tomorrow', name: 'Tomorrow', description: 'Tomorrow' },
    { id: 'week', name: 'This Week', description: 'Next 7 days' },
    { id: 'custom', name: 'Custom', description: 'Choose dates' }
  ];

  // Fetch personalized recommendations
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: currentLocation,
          userProfile: userPreferences,
          context: contextData,
          filters: {
            category: selectedCategory,
            timeFrame,
            adaptiveMode,
            socialInfluence: socialInfluence / 100
          },
          personalization: {
            behaviorLearning: true,
            contextAwareness: true,
            socialNetworkIntegration: true,
            budgetOptimization: true,
            seasonalAdaptation: true
          }
        })
      });

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, userPreferences, contextData, selectedCategory, timeFrame, adaptiveMode, socialInfluence]);

  // Refresh recommendations
  const refreshRecommendations = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  // Handle user feedback
  const handleFeedback = async (recommendationId: string, feedback: 'like' | 'dislike') => {
    setUserFeedback(prev => ({ ...prev, [recommendationId]: feedback }));

    try {
      await fetch('/api/v1/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId,
          feedback,
          context: contextData,
          timestamp: new Date().toISOString()
        })
      });

      // Refresh recommendations to incorporate feedback
      if (adaptiveMode) {
        setTimeout(refreshRecommendations, 1000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Real-time context updates
  useEffect(() => {
    if (adaptiveMode) {
      const interval = setInterval(refreshRecommendations, 300000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [adaptiveMode, refreshRecommendations]);

  const renderRecommendationCard = (recommendation: Recommendation) => {
    const feedback = userFeedback[recommendation.id];
    
    return (
      <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{recommendation.title}</span>
                <Badge className="text-xs bg-blue-500">
                  {Math.round(recommendation.relevanceScore)}% match
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {recommendation.description}
              </CardDescription>
            </div>
            <div className="flex space-x-1 ml-3">
              <Button
                variant={feedback === 'like' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFeedback(recommendation.id, 'like')}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant={feedback === 'dislike' ? 'destructive' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFeedback(recommendation.id, 'dislike')}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{recommendation.location.distance}m away</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{recommendation.timing.duration}h</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="h-4 w-4" />
              <span>{'$'.repeat(recommendation.cost.priceLevel)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4" />
              <span>{recommendation.metadata.popularity}%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {showReasons && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <h5 className="text-sm font-medium mb-2 flex items-center space-x-2">
                <Lightbulb className="h-4 w-4" />
                <span>Why we recommend this</span>
              </h5>
              <div className="space-y-1">
                {recommendation.reasons.slice(0, 3).map((reason, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    • {reason.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              {Math.round(recommendation.personalizedScore)}% personalized
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {Math.round(recommendation.contextScore)}% context match
            </Badge>
            {recommendation.socialScore > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {Math.round(recommendation.socialScore)}% social
              </Badge>
            )}
            {recommendation.metadata.trendingScore > 70 && (
              <Badge className="text-xs bg-orange-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>

          <div className="flex space-x-2">
            <Button className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline">
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">Personalized Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered suggestions based on your preferences and current context
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshRecommendations}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Context Bar */}
      {contextData && (
        <div className="p-3 bg-muted/50 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Thermometer className="h-4 w-4" />
                <span>{contextData.currentWeather.current.temperature}°C</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{contextData.timeOfDay.period}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{contextData.crowdLevels.level} crowds</span>
              </div>
              {contextData.userState.batteryLevel < 30 && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Low battery</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs">Adaptive Mode</span>
              <Switch
                checked={adaptiveMode}
                onCheckedChange={setAdaptiveMode}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b space-y-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-6 w-full">
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center space-x-1">
                <category.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Time Frame</label>
            <div className="flex space-x-2">
              {timeFrames.map((frame) => (
                <Button
                  key={frame.id}
                  variant={timeFrame === frame.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFrame(frame.id)}
                >
                  {frame.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="w-48">
            <label className="text-sm font-medium mb-2 block">Social Influence</label>
            <Slider
              value={[socialInfluence]}
              onValueChange={(value) => setSocialInfluence(value[0])}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Personal</span>
              <span>Social</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowReasons(!showReasons)}
            className={showReasons ? 'bg-muted' : ''}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Finding Perfect Recommendations</h3>
              <p className="text-muted-foreground">Analyzing your preferences and current context...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or check back later for new suggestions.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {recommendations.map(renderRecommendationCard)}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Updates Indicator */}
      {adaptiveMode && (
        <div className="fixed bottom-4 right-4">
          <Card className="p-3">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Real-time updates active</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
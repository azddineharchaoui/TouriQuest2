import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Route,
  Zap,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Star,
  TrendingUp,
  Brain,
  Sparkles,
  Target,
  Navigation,
  Compass,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Wifi,
  WifiOff,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
  EyeOff,
  Settings,
  Filter,
  SortAsc,
  SortDesc,
  Maximize2,
  Minimize2,
  Copy,
  Share2,
  Lightbulb,
  Download,
  Save,
  Edit3,
  X,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack
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
import { Slider } from './ui/slider';

interface UserPreferences {
  interests: string[];
  budget: { min: number; max: number };
  travelStyle: string;
  groupSize: number;
}

interface TripContext {
  destination: string;
  dates: { start: Date; end: Date };
  groupType: string;
  purpose: string;
}

interface Location {
  lat: number;
  lng: number;
  address: string;
  name: string;
}

interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  location: Location;
  time: Date;
  cost: number;
}

interface Transportation {
  id: string;
  type: 'walking' | 'driving' | 'public' | 'taxi';
  from: Location;
  to: Location;
  duration: number;
  cost: number;
}

interface Accommodation {
  id: string;
  name: string;
  type: string;
  location: Location;
  checkIn: Date;
  checkOut: Date;
  cost: number;
}

interface TimeConstraint {
  startTime: Date;
  endTime: Date;
  type: 'fixed' | 'flexible';
}

interface OptimizationImprovement {
  type: string;
  description: string;
  impact: number;
}

interface SmartItineraryOptimizerProps {
  onClose: () => void;
  initialItinerary?: Itinerary;
  userPreferences?: UserPreferences;
  tripContext?: TripContext;
}

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  days: ItineraryDay[];
  budget: {
    total: number;
    spent: number;
    categories: Record<string, number>;
  };
  participants: number;
  optimizationScore: number;
  lastOptimized: Date;
}

interface ItineraryDay {
  date: Date;
  activities: Activity[];
  meals: Meal[];
  transportation: Transportation[];
  accommodation?: Accommodation;
  estimatedCost: number;
  totalDuration: number;
  walkingDistance: number;
  drivingTime: number;
  optimizationInsights: OptimizationInsight[];
}

interface Activity {
  id: string;
  name: string;
  type: string;
  location: Location;
  startTime: Date;
  endTime: Date;
  duration: number;
  cost: number;
  rating: number;
  description: string;
  bookingRequired: boolean;
  weatherDependent: boolean;
  crowdLevel: 'low' | 'medium' | 'high';
  energyRequired: 'low' | 'medium' | 'high';
  ageAppropriate: boolean;
  accessibility: string[];
  tags: string[];
}

interface OptimizationInsight {
  type: 'suggestion' | 'warning' | 'info' | 'success';
  category: 'timing' | 'cost' | 'logistics' | 'weather' | 'crowd' | 'energy';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    label: string;
    type: 'optimize' | 'replace' | 'reorder' | 'remove' | 'add';
    data?: any;
  };
}

interface OptimizationSettings {
  priorities: {
    cost: number;
    time: number;
    energy: number;
    weather: number;
    crowds: number;
    interests: number;
  };
  constraints: {
    maxBudget?: number;
    maxWalkingDistance?: number;
    maxDrivingTime?: number;
    mustVisit?: string[];
    avoid?: string[];
    timeConstraints?: TimeConstraint[];
  };
  preferences: {
    pacePreference: 'relaxed' | 'moderate' | 'intensive';
    mealPreferences: string[];
    transportPreference: 'walking' | 'driving' | 'public' | 'mixed';
    groupDynamics: 'family' | 'couple' | 'friends' | 'solo';
  };
}

interface OptimizationResult {
  score: number;
  improvements: OptimizationImprovement[];
  alternativeItineraries: Itinerary[];
  insights: OptimizationInsight[];
  estimatedSavings: {
    time: number;
    cost: number;
    energy: number;
  };
  confidenceScore: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function SmartItineraryOptimizer({ 
  onClose, 
  initialItinerary, 
  userPreferences, 
  tripContext 
}: SmartItineraryOptimizerProps) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(initialItinerary || null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    priorities: {
      cost: 70,
      time: 80,
      energy: 60,
      weather: 90,
      crowds: 50,
      interests: 85
    },
    constraints: {},
    preferences: {
      pacePreference: 'moderate',
      mealPreferences: [],
      transportPreference: 'mixed',
      groupDynamics: 'couple'
    }
  });
  const [selectedDay, setSelectedDay] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState({
    weather: null,
    traffic: null,
    crowdLevels: null,
    events: null
  });

  // Smart Itinerary Optimization
  const optimizeItinerary = useCallback(async () => {
    if (!itinerary) return;

    setIsOptimizing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/itinerary/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          itinerary: itinerary,
          settings: optimizationSettings,
          userPreferences: userPreferences,
          tripContext: tripContext,
          realTimeData: realTimeData,
          optimizationGoals: [
            'minimize_travel_time',
            'maximize_interest_alignment',
            'optimize_energy_distribution',
            'weather_awareness',
            'crowd_avoidance',
            'budget_optimization'
          ]
        })
      });

      if (response.ok) {
        const result = await response.json();
        setOptimizationResults(result);
        
        if (result.optimizedItinerary) {
          setItinerary(result.optimizedItinerary);
        }
      }
    } catch (error) {
      console.error('Failed to optimize itinerary:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [itinerary, optimizationSettings, userPreferences, tripContext, realTimeData]);

  // Real-time Data Updates
  useEffect(() => {
    const fetchRealTimeData = async () => {
      if (!itinerary) return;

      try {
        const [weatherRes, trafficRes, crowdRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/ai/real-time/weather?location=${itinerary.destination}`),
          fetch(`${API_BASE_URL}/ai/real-time/traffic?location=${itinerary.destination}`),
          fetch(`${API_BASE_URL}/ai/real-time/crowds?location=${itinerary.destination}`),
          fetch(`${API_BASE_URL}/ai/real-time/events?location=${itinerary.destination}`)
        ]);

        setRealTimeData({
          weather: weatherRes.ok ? await weatherRes.json() : null,
          traffic: trafficRes.ok ? await trafficRes.json() : null,
          crowdLevels: crowdRes.ok ? await crowdRes.json() : null,
          events: eventsRes.ok ? await eventsRes.json() : null
        });
      } catch (error) {
        console.error('Failed to fetch real-time data:', error);
      }
    };

    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 5 * 60 * 1000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [itinerary]);

  // Calculate Optimization Score
  const calculateOptimizationScore = useMemo(() => {
    if (!itinerary || !optimizationResults) return 0;
    
    const factors = {
      timeEfficiency: 0.25,
      costOptimization: 0.20,
      energyBalance: 0.15,
      weatherAdaptation: 0.15,
      crowdAvoidance: 0.10,
      interestAlignment: 0.15
    };

    let score = 0;
    score += optimizationResults.score * factors.timeEfficiency;
    // Add other factor calculations...
    
    return Math.round(score);
  }, [itinerary, optimizationResults]);

  // Apply Optimization Suggestion
  const applyOptimizationSuggestion = async (insight: OptimizationInsight) => {
    if (!insight.actionable || !insight.action) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ai/itinerary/apply-optimization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          itineraryId: itinerary?.id,
          action: insight.action,
          context: insight
        })
      });

      if (response.ok) {
        const updatedItinerary = await response.json();
        setItinerary(updatedItinerary);
        
        // Refresh optimization results
        optimizeItinerary();
      }
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  };

  // Optimization Insight Card
  const OptimizationInsightCard = ({ insight }: { insight: OptimizationInsight }) => {
    const getInsightIcon = () => {
      switch (insight.category) {
        case 'timing': return <Clock className="h-4 w-4" />;
        case 'cost': return <DollarSign className="h-4 w-4" />;
        case 'logistics': return <Route className="h-4 w-4" />;
        case 'weather': return <Sun className="h-4 w-4" />;
        case 'crowd': return <Users className="h-4 w-4" />;
        case 'energy': return <Activity className="h-4 w-4" />;
        default: return <Info className="h-4 w-4" />;
      }
    };

    const getInsightColor = () => {
      switch (insight.type) {
        case 'suggestion': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'info': return 'text-gray-600 bg-gray-50 border-gray-200';
        case 'success': return 'text-green-600 bg-green-50 border-green-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    return (
      <Card className={`border-l-4 ${getInsightColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="mt-1">
                {getInsightIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {insight.impact} impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {insight.description}
                </p>
                {insight.actionable && insight.action && (
                  <Button
                    size="sm"
                    onClick={() => applyOptimizationSuggestion(insight)}
                    className="text-xs"
                  >
                    {insight.action.label}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Optimization Settings Panel
  const OptimizationSettingsPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">Optimization Priorities</h3>
        <div className="space-y-4">
          {Object.entries(optimizationSettings.priorities).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <span className="text-sm text-muted-foreground">{value}%</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => 
                  setOptimizationSettings(prev => ({
                    ...prev,
                    priorities: { ...prev.priorities, [key]: newValue }
                  }))
                }
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-4">Travel Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Pace Preference</label>
            <div className="flex space-x-2">
              {['relaxed', 'moderate', 'intensive'].map((pace) => (
                <Button
                  key={pace}
                  variant={optimizationSettings.preferences.pacePreference === pace ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptimizationSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, pacePreference: pace as any }
                  }))}
                  className="capitalize"
                >
                  {pace}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Transportation</label>
            <div className="flex space-x-2">
              {['walking', 'driving', 'public', 'mixed'].map((transport) => (
                <Button
                  key={transport}
                  variant={optimizationSettings.preferences.transportPreference === transport ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptimizationSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, transportPreference: transport as any }
                  }))}
                  className="capitalize"
                >
                  {transport}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
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
                <AvatarFallback className="bg-primary text-black">
                  <Zap className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">Smart Itinerary Optimizer</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  {itinerary && (
                    <>
                      <span>{itinerary.destination}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{itinerary.days.length} days</span>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{calculateOptimizationScore}/100</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={optimizeItinerary}
                disabled={isOptimizing || !itinerary}
                className="flex items-center space-x-2"
              >
                {isOptimizing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 grid w-fit grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {itinerary ? (
                        <div className="space-y-6">
                          {/* Optimization Score Card */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <Target className="h-5 w-5" />
                                <span>Optimization Score</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-3xl font-bold text-primary">
                                  {calculateOptimizationScore}/100
                                </div>
                                <Badge variant={calculateOptimizationScore > 80 ? 'default' : 'secondary'}>
                                  {calculateOptimizationScore > 80 ? 'Excellent' : 
                                   calculateOptimizationScore > 60 ? 'Good' : 'Needs Improvement'}
                                </Badge>
                              </div>
                              <Progress value={calculateOptimizationScore} className="mb-4" />
                              
                              {optimizationResults?.estimatedSavings && (
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                                    <div className="font-medium text-blue-700">
                                      {optimizationResults.estimatedSavings.time}h saved
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
                                    <div className="font-medium text-green-700">
                                      ${optimizationResults.estimatedSavings.cost} saved
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <Activity className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                                    <div className="font-medium text-purple-700">
                                      {optimizationResults.estimatedSavings.energy}% less tiring
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Day-by-day Itinerary */}
                          <div className="space-y-4">
                            {itinerary.days.map((day, index) => (
                              <Card key={index} className="overflow-hidden">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center space-x-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>Day {index + 1}</span>
                                      <span className="text-sm font-normal text-muted-foreground">
                                        {day.date.toLocaleDateString()}
                                      </span>
                                    </CardTitle>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                      <div className="flex items-center space-x-1">
                                        <DollarSign className="h-3 w-3" />
                                        <span>${day.estimatedCost}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{Math.round(day.totalDuration / 60)}h</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Navigation className="h-3 w-3" />
                                        <span>{day.walkingDistance}km</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {day.activities.map((activity, actIndex) => (
                                      <div key={actIndex} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                                        <div className="text-sm font-medium text-muted-foreground mt-1">
                                          {activity.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex-1">
                                          <h4 className="font-medium">{activity.name}</h4>
                                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                                          <div className="flex items-center space-x-3 mt-2 text-xs">
                                            <Badge variant="outline">{activity.type}</Badge>
                                            <div className="flex items-center space-x-1">
                                              <Star className="h-3 w-3 text-yellow-500" />
                                              <span>{activity.rating}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <DollarSign className="h-3 w-3" />
                                              <span>${activity.cost}</span>
                                            </div>
                                            <Badge variant={activity.crowdLevel === 'low' ? 'default' : 'secondary'}>
                                              {activity.crowdLevel} crowd
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Day Insights */}
                                  {day.optimizationInsights.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                      <h5 className="font-medium mb-3 flex items-center space-x-2">
                                        <Brain className="h-4 w-4" />
                                        <span>AI Insights for this day</span>
                                      </h5>
                                      <div className="space-y-2">
                                        {day.optimizationInsights.slice(0, 3).map((insight, insightIndex) => (
                                          <div key={insightIndex} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                                            <span className="font-medium">{insight.title}:</span> {insight.description}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Itinerary Loaded</h3>
                          <p className="text-muted-foreground">
                            Upload or create an itinerary to start optimization
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="insights" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {optimizationResults?.insights ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-medium flex items-center space-x-2">
                              <Brain className="h-5 w-5" />
                              <span>AI Optimization Insights</span>
                            </h3>
                            <Badge variant="outline">
                              {optimizationResults.insights.length} insights
                            </Badge>
                          </div>
                          
                          {optimizationResults.insights.map((insight, index) => (
                            <OptimizationInsightCard key={index} insight={insight} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Insights Available</h3>
                          <p className="text-muted-foreground">
                            Run optimization to get AI-powered insights
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="alternatives" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {optimizationResults?.alternativeItineraries ? (
                        <div className="space-y-4">
                          <h3 className="font-medium flex items-center space-x-2">
                            <Target className="h-5 w-5" />
                            <span>Alternative Itineraries</span>
                          </h3>
                          
                          {optimizationResults.alternativeItineraries.map((alt, index) => (
                            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium mb-2">{alt.title}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-3 w-3" />
                                        <span>{alt.optimizationScore}/100</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <DollarSign className="h-3 w-3" />
                                        <span>${alt.budget.total}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{alt.days.length} days</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm">
                                    Select This Option
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Alternatives Generated</h3>
                          <p className="text-muted-foreground">
                            Run optimization to explore alternative itineraries
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="analytics" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cost Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <PieChart className="h-4 w-4" />
                              <span>Cost Analysis</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {itinerary?.budget.categories && Object.entries(itinerary.budget.categories).map(([category, amount]) => (
                                <div key={category} className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{category}</span>
                                  <span className="font-medium">${amount}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Time Distribution */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <BarChart3 className="h-4 w-4" />
                              <span>Time Distribution</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-6">
                              <LineChart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Analytics visualization would go here
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Settings Sidebar */}
          {showSettings && (
            <div className="w-80 border-l bg-muted/30 overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Optimization Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <OptimizationSettingsPanel />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
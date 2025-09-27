import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Cloud,
  Sun,
  CloudRain,
  Navigation,
  Users,
  Clock,
  Route,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  Activity,
  Battery,
  BatteryLow,
  Wifi,
  WifiOff,
  Signal,
  Car,
  Bus,
  Train,
  Plane,
  Timer,
  Target,
  Compass,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  FastForward,
  Rewind,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Edit3,
  Save,
  Share2,
  Download,
  Upload,
  Filter,
  Search,
  Star,
  Heart,
  Bookmark,
  Info,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';

interface DynamicOptimizationProps {
  onClose?: () => void;
  itinerary: Itinerary;
  onItineraryUpdate?: (updatedItinerary: Itinerary) => void;
  realTimeData?: RealTimeData;
  optimizationPreferences?: OptimizationPreferences;
}

interface Itinerary {
  id: string;
  title: string;
  days: ItineraryDay[];
  totalOptimizationScore: number;
  lastOptimized: string;
}

interface ItineraryDay {
  id: string;
  date: string;
  activities: Activity[];
  transportation: Transportation[];
  meals: Meal[];
  weather: WeatherInfo;
  crowdLevels: CrowdLevel[];
  energyProfile: EnergyProfile;
  optimization: DayOptimization;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  location: Location;
  scheduledTime: TimeSlot;
  duration: number;
  cost: number;
  priority: 'high' | 'medium' | 'low';
  flexibility: 'fixed' | 'flexible' | 'moveable';
  weatherDependency: 'indoor' | 'outdoor' | 'mixed';
  crowdSensitivity: 'high' | 'medium' | 'low';
  energyRequired: 'high' | 'medium' | 'low';
  alternatives: string[];
  optimizationScore: number;
  issues: OptimizationIssue[];
  suggestions: OptimizationSuggestion[];
}

interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  location: Location;
  scheduledTime: TimeSlot;
  cost: number;
  dietary: string[];
}

interface Transportation {
  id: string;
  mode: 'walking' | 'public' | 'taxi' | 'rental' | 'flight';
  from: Location;
  to: Location;
  scheduledTime: TimeSlot;
  estimatedDuration: number;
  realTimeDuration: number;
  cost: number;
  delays: Delay[];
  alternatives: TransportAlternative[];
}

interface Location {
  name: string;
  coordinates: { lat: number; lng: number };
  address: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface WeatherInfo {
  condition: string;
  temperature: { current: number; feels_like: number; min: number; max: number };
  precipitation: { probability: number; amount: number };
  wind: { speed: number; direction: string };
  visibility: number;
  uvIndex: number;
  alerts: WeatherAlert[];
  impact: WeatherImpact;
}

interface WeatherAlert {
  type: 'warning' | 'watch' | 'advisory';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  description: string;
  startTime: string;
  endTime: string;
  affectedActivities: string[];
}

interface WeatherImpact {
  overallScore: number;
  activityImpacts: { activityId: string; impact: number; reasons: string[] }[];
  recommendations: string[];
}

interface CrowdLevel {
  location: string;
  level: 'low' | 'medium' | 'high' | 'extreme';
  timeSlots: { time: string; level: number }[];
  prediction: { time: string; level: number }[];
  factors: string[];
}

interface EnergyProfile {
  requiredEnergy: number;
  availableEnergy: number;
  balance: number;
  recommendations: string[];
}

interface DayOptimization {
  score: number;
  issues: OptimizationIssue[];
  suggestions: OptimizationSuggestion[];
  lastOptimized: string;
}

interface OptimizationIssue {
  id: string;
  type: 'weather' | 'crowd' | 'traffic' | 'energy' | 'budget' | 'timing' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedActivities: string[];
  impact: string;
  autoFixAvailable: boolean;
}

interface OptimizationSuggestion {
  id: string;
  type: 'reschedule' | 'replace' | 'add' | 'remove' | 'reorder' | 'transport_change';
  title: string;
  description: string;
  impact: ImpactAnalysis;
  confidence: number;
  implementation: 'automatic' | 'user_approval' | 'manual';
}

interface ImpactAnalysis {
  timeChange: number;
  costChange: number;
  experienceChange: number;
  energyChange: number;
  weatherAdaptation: number;
  crowdAvoidance: number;
}

interface Delay {
  type: 'traffic' | 'weather' | 'mechanical' | 'strike' | 'accident';
  duration: number;
  probability: number;
  description: string;
}

interface TransportAlternative {
  mode: string;
  duration: number;
  cost: number;
  reliability: number;
  description: string;
}

interface RealTimeData {
  weather: WeatherInfo;
  traffic: TrafficData;
  crowds: CrowdData;
  events: EventData[];
  incidents: IncidentData[];
  pricing: PricingData;
}

interface TrafficData {
  overallCondition: 'light' | 'moderate' | 'heavy' | 'severe';
  delays: { route: string; delay: number; reason: string }[];
  incidents: { location: string; type: string; impact: string }[];
  alternatives: { route: string; time: number; distance: number }[];
}

interface CrowdData {
  venues: { location: string; level: number; trend: 'increasing' | 'decreasing' | 'stable' }[];
  predictions: { location: string; time: string; level: number }[];
  recommendations: string[];
}

interface EventData {
  id: string;
  name: string;
  type: string;
  location: string;
  startTime: string;
  endTime: string;
  impact: 'positive' | 'negative' | 'neutral';
  crowdImpact: number;
  trafficImpact: number;
  relevance: number;
}

interface IncidentData {
  id: string;
  type: 'closure' | 'construction' | 'accident' | 'weather' | 'event';
  location: string;
  severity: 'minor' | 'moderate' | 'major';
  impact: string;
  estimatedResolution: string;
}

interface PricingData {
  surgeMultipliers: { service: string; multiplier: number }[];
  discounts: { venue: string; discount: number; until: string }[];
  recommendations: string[];
}

interface OptimizationPreferences {
  autoOptimization: boolean;
  optimizationFrequency: number; // minutes
  priorities: {
    weather: number;
    crowds: number;
    traffic: number;
    energy: number;
    budget: number;
    time: number;
  };
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  notificationLevel: 'critical' | 'important' | 'all' | 'minimal';
}

export function DynamicOptimization({ 
  onClose, 
  itinerary, 
  onItineraryUpdate,
  realTimeData,
  optimizationPreferences 
}: DynamicOptimizationProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(optimizationPreferences?.autoOptimization || false);
  const [optimizationMode, setOptimizationMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [showDetails, setShowDetails] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [appliedOptimizations, setAppliedOptimizations] = useState<string[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Optimization categories
  const optimizationCategories = [
    { 
      id: 'weather', 
      name: 'Weather', 
      icon: Cloud, 
      color: 'bg-blue-500',
      description: 'Adapt to weather conditions'
    },
    { 
      id: 'crowds', 
      name: 'Crowds', 
      icon: Users, 
      color: 'bg-purple-500',
      description: 'Avoid busy times and places'
    },
    { 
      id: 'traffic', 
      name: 'Traffic', 
      icon: Navigation, 
      color: 'bg-red-500',
      description: 'Optimize routes and timing'
    },
    { 
      id: 'energy', 
      name: 'Energy', 
      icon: Battery, 
      color: 'bg-green-500',
      description: 'Balance activity levels'
    },
    { 
      id: 'budget', 
      name: 'Budget', 
      icon: Target, 
      color: 'bg-yellow-500',
      description: 'Optimize costs and value'
    },
    { 
      id: 'events', 
      name: 'Events', 
      icon: Calendar, 
      color: 'bg-pink-500',
      description: 'Integrate local events'
    }
  ];

  // Run optimization
  const optimizeItinerary = useCallback(async (mode: string = 'full') => {
    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/v1/ai/itinerary/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: itinerary.id,
          optimizationMode: mode,
          realTimeFactors: {
            weather: realTimeData?.weather,
            traffic: realTimeData?.traffic,
            crowds: realTimeData?.crowds,
            events: realTimeData?.events,
            incidents: realTimeData?.incidents,
            pricing: realTimeData?.pricing
          },
          preferences: optimizationPreferences,
          autoApply: mode === 'auto',
          priority: {
            safety: 1.0,
            satisfaction: 0.9,
            efficiency: 0.8,
            budget: 0.7,
            convenience: 0.6
          }
        })
      });

      const result = await response.json();
      
      clearInterval(progressInterval);
      setOptimizationProgress(100);

      if (result.optimizedItinerary) {
        onItineraryUpdate?.(result.optimizedItinerary);
      }

      setPendingSuggestions(result.suggestions || []);
      setLastUpdateTime(new Date());

    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setTimeout(() => {
        setIsOptimizing(false);
        setOptimizationProgress(0);
      }, 1000);
    }
  }, [itinerary.id, realTimeData, optimizationPreferences, onItineraryUpdate]);

  // Apply suggestion
  const applySuggestion = async (suggestion: OptimizationSuggestion) => {
    try {
      const response = await fetch('/api/v1/ai/itinerary/apply-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: itinerary.id,
          suggestionId: suggestion.id,
          userContext: {
            timestamp: new Date().toISOString(),
            mode: optimizationMode
          }
        })
      });

      const result = await response.json();
      
      if (result.updatedItinerary) {
        onItineraryUpdate?.(result.updatedItinerary);
        setAppliedOptimizations(prev => [...prev, suggestion.id]);
        setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  // Auto optimization effect
  useEffect(() => {
    if (autoOptimizeEnabled && realTimeUpdates) {
      const interval = setInterval(() => {
        optimizeItinerary('auto');
      }, (optimizationPreferences?.optimizationFrequency || 15) * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [autoOptimizeEnabled, realTimeUpdates, optimizeItinerary, optimizationPreferences]);

  // Real-time data updates
  useEffect(() => {
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setLastUpdateTime(new Date());
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeUpdates]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Optimization Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Optimization Score</span>
            <Badge className={`text-lg px-3 py-1 ${
              itinerary.totalOptimizationScore >= 80 ? 'bg-green-500' : 
              itinerary.totalOptimizationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {itinerary.totalOptimizationScore}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={itinerary.totalOptimizationScore} className="h-3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {optimizationCategories.map((category) => (
              <div key={category.id} className="text-center">
                <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center mx-auto mb-2`}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-sm font-medium">{category.name}</h4>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span>Real-Time Status</span>
            <div className={`w-2 h-2 rounded-full ${realTimeUpdates ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Weather Conditions</span>
                <Badge variant="outline">
                  {realTimeData?.weather?.condition || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Traffic Status</span>
                <Badge variant="outline">
                  {realTimeData?.traffic?.overallCondition || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Crowd Levels</span>
                <Badge variant="outline">
                  {realTimeData?.crowds?.venues?.[0]?.trend || 'Stable'}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Events</span>
                <Badge variant="outline">
                  {realTimeData?.events?.length || 0} events
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Incidents</span>
                <Badge variant="outline">
                  {realTimeData?.incidents?.length || 0} incidents
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Optimization</span>
                <Switch
                  checked={autoOptimizeEnabled}
                  onCheckedChange={setAutoOptimizeEnabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Optimization Suggestions</span>
              <Badge>{pendingSuggestions.length}</Badge>
            </CardTitle>
            <CardDescription>
              AI-recommended improvements to your itinerary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingSuggestions.slice(0, 3).map((suggestion) => (
                <div key={suggestion.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                    <Badge className="ml-2">
                      {Math.round(suggestion.confidence)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-4 text-xs text-muted-foreground">
                      {suggestion.impact.timeChange !== 0 && (
                        <span>Time: {suggestion.impact.timeChange > 0 ? '+' : ''}{suggestion.impact.timeChange}min</span>
                      )}
                      {suggestion.impact.costChange !== 0 && (
                        <span>Cost: {suggestion.impact.costChange > 0 ? '+' : ''}${suggestion.impact.costChange}</span>
                      )}
                      {suggestion.impact.experienceChange !== 0 && (
                        <span>Experience: {suggestion.impact.experienceChange > 0 ? '+' : ''}{suggestion.impact.experienceChange}%</span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingSuggestions.length > 3 && (
                <Button variant="outline" className="w-full">
                  View all {pendingSuggestions.length} suggestions
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDayOptimization = () => {
    const day = itinerary.days[selectedDay];
    if (!day) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <Badge className={`${
                day.optimization.score >= 80 ? 'bg-green-500' : 
                day.optimization.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {day.optimization.score}% optimized
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {day.activities.map((activity, index) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{activity.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.scheduledTime.start} - {activity.scheduledTime.end}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{activity.optimizationScore}%</Badge>
                      {activity.issues.length > 0 && (
                        <Badge variant="destructive">{activity.issues.length} issues</Badge>
                      )}
                    </div>
                  </div>
                  
                  {activity.issues.length > 0 && (
                    <div className="space-y-2">
                      {activity.issues.map((issue) => (
                        <div key={issue.id} className={`p-2 rounded border-l-4 ${
                          issue.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                          issue.severity === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="text-sm font-medium">{issue.title}</h5>
                              <p className="text-xs text-muted-foreground">{issue.description}</p>
                            </div>
                            {issue.autoFixAvailable && (
                              <Button size="sm" className="ml-2">
                                Auto Fix
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">Dynamic Optimization</h1>
          <p className="text-sm text-muted-foreground">
            Real-time itinerary optimization powered by AI
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => optimizeItinerary('full')}
            disabled={isOptimizing}
            className="relative"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Real-time Updates</span>
              <Switch
                checked={realTimeUpdates}
                onCheckedChange={setRealTimeUpdates}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Auto Optimization</span>
              <Switch
                checked={autoOptimizeEnabled}
                onCheckedChange={setAutoOptimizeEnabled}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">Mode:</span>
            {['conservative', 'balanced', 'aggressive'].map((mode) => (
              <Button
                key={mode}
                variant={optimizationMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOptimizationMode(mode as any)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="daily">Daily Optimization</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <TabsContent value="overview" className="mt-0">
                {renderOverview()}
              </TabsContent>
              
              <TabsContent value="daily" className="mt-0">
                <div className="mb-4">
                  <div className="flex space-x-2 mb-4">
                    {itinerary.days.map((day, index) => (
                      <Button
                        key={index}
                        variant={selectedDay === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDay(index)}
                      >
                        Day {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
                {renderDayOptimization()}
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground">Optimization analytics coming soon...</p>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Optimization Progress Overlay */}
      {isOptimizing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <Card className="w-80">
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <h3 className="font-semibold mb-2">Optimizing Your Itinerary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Analyzing real-time data and finding the best adjustments...
              </p>
              <Progress value={optimizationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{optimizationProgress}% complete</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
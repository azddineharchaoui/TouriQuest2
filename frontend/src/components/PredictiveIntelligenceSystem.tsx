import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  Cloud,
  Calendar,
  MapPin,
  Activity,
  Target,
  Lightbulb,
  Bell,
  RefreshCw,
  Settings,
  X,
  LineChart,
  BarChart3,
  PieChart,
  Timer,
  Zap,
  Brain,
  Sparkles,
  Eye,
  Shield,
  Compass,
  Clock,
  Thermometer,
  Umbrella,
  Car,
  Plane,
  Hotel
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PredictiveIntelligenceProps {
  onClose: () => void;
  currentLocation: { lat: number; lng: number; name: string };
  userProfile: {
    travelHistory: Array<{
      destination: string;
      dates: { start: string; end: string };
      budget: number;
      satisfaction: number;
    }>;
    preferences: {
      activities: string[];
      budget: { min: number; max: number };
      groupSize: number;
      riskTolerance: 'low' | 'medium' | 'high';
    };
  };
}

interface DisruptionPrediction {
  id: string;
  type: 'weather' | 'transport' | 'event' | 'political' | 'health' | 'economic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  timeframe: string;
  location: string;
  impact: {
    flights: number;
    accommodation: number;
    activities: number;
    safety: number;
  };
  description: string;
  alternatives: Array<{
    type: 'route' | 'timing' | 'location' | 'activity';
    description: string;
    cost_impact: number;
    feasibility: number;
  }>;
  recommendations: string[];
  lastUpdated: Date;
}

interface PriceFluctuationPrediction {
  id: string;
  category: 'flights' | 'hotels' | 'activities' | 'dining' | 'transport';
  location: string;
  currentPrice: { amount: number; currency: string };
  predictions: Array<{
    date: string;
    predictedPrice: number;
    confidence: number;
    factors: string[];
  }>;
  optimalBookingWindow: {
    start: string;
    end: string;
    expectedSavings: number;
  };
  priceDrivers: Array<{
    factor: string;
    impact: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  recommendations: Array<{
    action: 'book_now' | 'wait' | 'monitor' | 'alternative';
    reason: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
}

interface CrowdDensityPrediction {
  id: string;
  location: string;
  venue: string;
  predictions: Array<{
    dateTime: string;
    crowdLevel: number; // 0-100
    waitTime: number; // minutes
    factors: string[];
  }>;
  alternativeVenues: Array<{
    name: string;
    distance: number;
    crowdLevel: number;
    similarity: number;
  }>;
  optimalVisitTimes: Array<{
    timeSlot: string;
    crowdLevel: number;
    advantages: string[];
  }>;
}

interface WeatherImpactAssessment {
  id: string;
  location: string;
  timeframe: string;
  weatherPrediction: {
    condition: string;
    temperature: { min: number; max: number };
    precipitation: number;
    wind: number;
    humidity: number;
    uvIndex: number;
  };
  activityImpacts: Array<{
    activity: string;
    impactScore: number;
    recommendation: 'proceed' | 'modify' | 'reschedule' | 'cancel';
    alternatives: string[];
  }>;
  clothingRecommendations: string[];
  equipmentNeeded: string[];
  safetyConsiderations: string[];
}

interface EventDiscovery {
  id: string;
  name: string;
  type: 'festival' | 'concert' | 'sports' | 'cultural' | 'business' | 'seasonal';
  location: string;
  dates: { start: string; end: string };
  description: string;
  relevanceScore: number;
  impact: {
    accommodation: 'positive' | 'negative' | 'neutral';
    pricing: 'increase' | 'decrease' | 'stable';
    crowds: 'high' | 'medium' | 'low';
    availability: 'limited' | 'normal' | 'abundant';
  };
  opportunities: string[];
  considerations: string[];
  ticketInfo?: {
    required: boolean;
    priceRange: { min: number; max: number };
    availability: 'high' | 'medium' | 'low';
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function PredictiveIntelligenceSystem({ onClose, currentLocation, userProfile }: PredictiveIntelligenceProps) {
  const [activeTab, setActiveTab] = useState('disruptions');
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState({
    disruptions: [] as DisruptionPrediction[],
    pricing: [] as PriceFluctuationPrediction[],
    crowds: [] as CrowdDensityPrediction[],
    weather: [] as WeatherImpactAssessment[],
    events: [] as EventDiscovery[]
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15); // minutes
  const [notificationSettings, setNotificationSettings] = useState({
    disruptions: true,
    priceAlerts: true,
    weatherAlerts: true,
    eventDiscovery: true,
    crowdUpdates: false
  });
  
  const refreshTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadPredictions();
    
    if (autoRefresh) {
      refreshTimer.current = setInterval(() => {
        loadPredictions();
      }, refreshInterval * 60 * 1000);
    }
    
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Load all predictions
  const loadPredictions = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDisruptionPredictions(),
        loadPriceFluctuations(),
        loadCrowdPredictions(),
        loadWeatherAssessments(),
        loadEventDiscovery()
      ]);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disruption Forecasting & Alternatives
  const loadDisruptionPredictions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/predict/disruptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          location: currentLocation,
          timeframe: '7d', // Next 7 days
          riskTolerance: userProfile.preferences.riskTolerance,
          travelHistory: userProfile.travelHistory,
          includeAlternatives: true,
          severityThreshold: 'medium'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(prev => ({ ...prev, disruptions: data.predictions || [] }));
      }
    } catch (error) {
      console.error('Disruption prediction failed:', error);
    }
  };

  // Price Fluctuation Predictions
  const loadPriceFluctuations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/predict/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          location: currentLocation,
          categories: ['flights', 'hotels', 'activities'],
          budget: userProfile.preferences.budget,
          timeframe: '30d',
          optimizationGoal: 'savings',
          includeBookingRecommendations: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(prev => ({ ...prev, pricing: data.predictions || [] }));
      }
    } catch (error) {
      console.error('Price prediction failed:', error);
    }
  };

  // Crowd Density Predictions
  const loadCrowdPredictions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/predict/crowds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          location: currentLocation,
          venues: 'popular_attractions',
          timeframe: '7d',
          preferences: userProfile.preferences.activities,
          includeAlternatives: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(prev => ({ ...prev, crowds: data.predictions || [] }));
      }
    } catch (error) {
      console.error('Crowd prediction failed:', error);
    }
  };

  // Weather Impact Assessment
  const loadWeatherAssessments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/predict/weather-impact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          location: currentLocation,
          activities: userProfile.preferences.activities,
          timeframe: '7d',
          includeRecommendations: true,
          detailLevel: 'comprehensive'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(prev => ({ ...prev, weather: data.assessments || [] }));
      }
    } catch (error) {
      console.error('Weather assessment failed:', error);
    }
  };

  // Event Discovery
  const loadEventDiscovery = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/predict/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          location: currentLocation,
          interests: userProfile.preferences.activities,
          timeframe: '30d',
          includeImpactAnalysis: true,
          relevanceThreshold: 0.6
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(prev => ({ ...prev, events: data.events || [] }));
      }
    } catch (error) {
      console.error('Event discovery failed:', error);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-blue-600 bg-blue-100 border-blue-300';
    }
  };

  // Get prediction icon
  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'weather': return <Cloud className="h-4 w-4" />;
      case 'transport': return <Car className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'political': return <Shield className="h-4 w-4" />;
      case 'health': return <Activity className="h-4 w-4" />;
      case 'economic': return <DollarSign className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Get crowd level color
  const getCrowdLevelColor = (level: number) => {
    if (level >= 80) return 'text-red-600 bg-red-100';
    if (level >= 60) return 'text-orange-600 bg-orange-100';
    if (level >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Predictive Intelligence</h2>
              <p className="text-sm text-muted-foreground">
                AI-powered predictions for disruptions, pricing, crowds, and events
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Auto-refresh: {autoRefresh ? 'On' : 'Off'}
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="disruptions" className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Disruptions</span>
                {predictions.disruptions.some(d => d.severity === 'high' || d.severity === 'critical') && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">!</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Pricing</span>
                <Badge variant="secondary" className="text-xs">{predictions.pricing.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="crowds" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Crowds</span>
              </TabsTrigger>
              <TabsTrigger value="weather" className="flex items-center space-x-2">
                <Cloud className="h-4 w-4" />
                <span>Weather</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Events</span>
                <Badge variant="secondary" className="text-xs">{predictions.events.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              {/* Disruption Predictions */}
              <TabsContent value="disruptions" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {predictions.disruptions.length > 0 ? (
                      predictions.disruptions.map((disruption) => (
                        <Card key={disruption.id} className={`border-l-4 ${getSeverityColor(disruption.severity)}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getPredictionIcon(disruption.type)}
                                <div>
                                  <CardTitle className="text-base">
                                    {disruption.type.charAt(0).toUpperCase() + disruption.type.slice(1)} Disruption
                                  </CardTitle>
                                  <CardDescription>
                                    {disruption.location} • {disruption.timeframe}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getSeverityColor(disruption.severity)}>
                                  {disruption.severity} risk
                                </Badge>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {Math.round(disruption.probability * 100)}% probability
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm">{disruption.description}</p>

                            {/* Impact Visualization */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <Plane className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-sm font-medium">Flights</div>
                                <Progress value={disruption.impact.flights} className="mt-1" />
                              </div>
                              <div className="text-center">
                                <Hotel className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-sm font-medium">Hotels</div>
                                <Progress value={disruption.impact.accommodation} className="mt-1" />
                              </div>
                              <div className="text-center">
                                <MapPin className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-sm font-medium">Activities</div>
                                <Progress value={disruption.impact.activities} className="mt-1" />
                              </div>
                              <div className="text-center">
                                <Shield className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-sm font-medium">Safety</div>
                                <Progress value={disruption.impact.safety} className="mt-1" />
                              </div>
                            </div>

                            {/* Alternatives */}
                            {disruption.alternatives.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                  <Compass className="h-4 w-4 mr-1" />
                                  Alternatives
                                </h4>
                                <div className="space-y-2">
                                  {disruption.alternatives.slice(0, 3).map((alt, index) => (
                                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                      <div className="flex items-start justify-between mb-1">
                                        <span className="font-medium text-sm capitalize">{alt.type}</span>
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline" className="text-xs">
                                            {alt.cost_impact > 0 ? '+' : ''}{alt.cost_impact}% cost
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(alt.feasibility * 100)}% feasible
                                          </Badge>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{alt.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommendations */}
                            {disruption.recommendations.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                  <Lightbulb className="h-4 w-4 mr-1" />
                                  Recommendations
                                </h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {disruption.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No disruptions predicted</p>
                        <p className="text-sm">Your travel plans look smooth!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Price Fluctuation Predictions */}
              <TabsContent value="pricing" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {predictions.pricing.length > 0 ? (
                      predictions.pricing.map((price) => (
                        <Card key={price.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <div>
                                  <CardTitle className="text-base capitalize">
                                    {price.category} Pricing
                                  </CardTitle>
                                  <CardDescription>{price.location}</CardDescription>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold">
                                  {price.currentPrice.amount} {price.currentPrice.currency}
                                </div>
                                <div className="text-sm text-muted-foreground">Current Price</div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Optimal Booking Window */}
                            <Alert>
                              <Timer className="h-4 w-4" />
                              <AlertTitle>Optimal Booking Window</AlertTitle>
                              <AlertDescription>
                                Book between {new Date(price.optimalBookingWindow.start).toLocaleDateString()} - {new Date(price.optimalBookingWindow.end).toLocaleDateString()} 
                                to save up to {price.optimalBookingWindow.expectedSavings}%
                              </AlertDescription>
                            </Alert>

                            {/* Price Drivers */}
                            <div>
                              <h4 className="font-medium mb-2 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Price Drivers
                              </h4>
                              <div className="space-y-2">
                                {price.priceDrivers.slice(0, 4).map((driver, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-sm">{driver.factor}</span>
                                    <div className="flex items-center space-x-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          driver.trend === 'increasing' ? 'text-red-600' : 
                                          driver.trend === 'decreasing' ? 'text-green-600' : 
                                          'text-gray-600'
                                        }`}
                                      >
                                        {driver.trend}
                                      </Badge>
                                      <span className="text-sm font-medium">
                                        {Math.abs(driver.impact)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div>
                              <h4 className="font-medium mb-2 flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                Booking Recommendations
                              </h4>
                              <div className="space-y-2">
                                {price.recommendations.map((rec, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-3 rounded-lg border ${
                                      rec.urgency === 'high' ? 'border-red-300 bg-red-50' :
                                      rec.urgency === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                                      'border-green-300 bg-green-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-1">
                                      <span className="font-medium text-sm capitalize">
                                        {rec.action.replace('_', ' ')}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          rec.urgency === 'high' ? 'border-red-300 text-red-700' :
                                          rec.urgency === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                          'border-green-300 text-green-700'
                                        }`}
                                      >
                                        {rec.urgency} urgency
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No pricing data available</p>
                        <p className="text-sm">Add destinations to see price predictions</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Crowd Density Predictions */}
              <TabsContent value="crowds" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {predictions.crowds.length > 0 ? (
                      predictions.crowds.map((crowd) => (
                        <Card key={crowd.id}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center space-x-2">
                              <Users className="h-5 w-5" />
                              <span>{crowd.venue}</span>
                            </CardTitle>
                            <CardDescription>{crowd.location}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Current Crowd Level */}
                            {crowd.predictions.length > 0 && (
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">Current Crowd Level</span>
                                  <Badge className={getCrowdLevelColor(crowd.predictions[0].crowdLevel)}>
                                    {Math.round(crowd.predictions[0].crowdLevel)}%
                                  </Badge>
                                </div>
                                <Progress value={crowd.predictions[0].crowdLevel} className="mb-2" />
                                <div className="text-sm text-muted-foreground">
                                  Expected wait time: {crowd.predictions[0].waitTime} minutes
                                </div>
                              </div>
                            )}

                            {/* Optimal Visit Times */}
                            {crowd.optimalVisitTimes.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  Best Times to Visit
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {crowd.optimalVisitTimes.slice(0, 3).map((time, index) => (
                                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="font-medium text-sm text-green-800">
                                        {time.timeSlot}
                                      </div>
                                      <div className="text-xs text-green-600 mb-1">
                                        {Math.round(time.crowdLevel)}% crowd level
                                      </div>
                                      <ul className="text-xs text-green-700 space-y-0.5">
                                        {time.advantages.slice(0, 2).map((adv, i) => (
                                          <li key={i}>• {adv}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Alternative Venues */}
                            {crowd.alternativeVenues.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                  <Compass className="h-4 w-4 mr-1" />
                                  Alternative Venues
                                </h4>
                                <div className="space-y-2">
                                  {crowd.alternativeVenues.slice(0, 3).map((venue, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                      <div>
                                        <div className="font-medium text-sm">{venue.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {venue.distance}km away • {Math.round(venue.similarity * 100)}% similar
                                        </div>
                                      </div>
                                      <Badge className={getCrowdLevelColor(venue.crowdLevel)}>
                                        {Math.round(venue.crowdLevel)}%
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No crowd data available</p>
                        <p className="text-sm">Visit popular attractions to see crowd predictions</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Weather Impact Assessment */}
              <TabsContent value="weather" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {predictions.weather.length > 0 ? (
                      predictions.weather.map((weather) => (
                        <Card key={weather.id}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center space-x-2">
                              <Cloud className="h-5 w-5" />
                              <span>Weather Impact Assessment</span>
                            </CardTitle>
                            <CardDescription>{weather.location} • {weather.timeframe}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Weather Prediction Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <Thermometer className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                                <div className="text-sm font-medium">Temperature</div>
                                <div className="text-xs text-muted-foreground">
                                  {weather.weatherPrediction.temperature.min}° - {weather.weatherPrediction.temperature.max}°C
                                </div>
                              </div>
                              <div className="text-center">
                                <Umbrella className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                                <div className="text-sm font-medium">Rain</div>
                                <div className="text-xs text-muted-foreground">
                                  {weather.weatherPrediction.precipitation}%
                                </div>
                              </div>
                              <div className="text-center">
                                <Activity className="h-6 w-6 mx-auto mb-1 text-gray-500" />
                                <div className="text-sm font-medium">Wind</div>
                                <div className="text-xs text-muted-foreground">
                                  {weather.weatherPrediction.wind} km/h
                                </div>
                              </div>
                              <div className="text-center">
                                <Eye className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                                <div className="text-sm font-medium">UV Index</div>
                                <div className="text-xs text-muted-foreground">
                                  {weather.weatherPrediction.uvIndex}/10
                                </div>
                              </div>
                            </div>

                            {/* Activity Impacts */}
                            {weather.activityImpacts.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                  <Activity className="h-4 w-4 mr-1" />
                                  Activity Impacts
                                </h4>
                                <div className="space-y-2">
                                  {weather.activityImpacts.map((impact, index) => (
                                    <div 
                                      key={index} 
                                      className={`p-3 rounded-lg border ${
                                        impact.recommendation === 'cancel' ? 'border-red-300 bg-red-50' :
                                        impact.recommendation === 'modify' ? 'border-yellow-300 bg-yellow-50' :
                                        impact.recommendation === 'reschedule' ? 'border-orange-300 bg-orange-50' :
                                        'border-green-300 bg-green-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{impact.activity}</span>
                                        <div className="flex items-center space-x-2">
                                          <Progress value={impact.impactScore} className="w-16" />
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${
                                              impact.recommendation === 'cancel' ? 'border-red-300 text-red-700' :
                                              impact.recommendation === 'modify' ? 'border-yellow-300 text-yellow-700' :
                                              impact.recommendation === 'reschedule' ? 'border-orange-300 text-orange-700' :
                                              'border-green-300 text-green-700'
                                            }`}
                                          >
                                            {impact.recommendation}
                                          </Badge>
                                        </div>
                                      </div>
                                      {impact.alternatives.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                          Alternatives: {impact.alternatives.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommendations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-medium text-sm mb-2">What to Wear</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {weather.clothingRecommendations.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-2">Equipment Needed</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {weather.equipmentNeeded.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Safety Considerations */}
                            {weather.safetyConsiderations.length > 0 && (
                              <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertTitle>Safety Considerations</AlertTitle>
                                <AlertDescription>
                                  <ul className="list-disc list-inside space-y-1">
                                    {weather.safetyConsiderations.map((safety, index) => (
                                      <li key={index}>{safety}</li>
                                    ))}
                                  </ul>
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No weather assessments available</p>
                        <p className="text-sm">Add activities to get weather impact analysis</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Event Discovery */}
              <TabsContent value="events" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {predictions.events.length > 0 ? (
                      predictions.events.map((event) => (
                        <Card key={event.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-5 w-5" />
                                <div>
                                  <CardTitle className="text-base">{event.name}</CardTitle>
                                  <CardDescription>{event.location}</CardDescription>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="mb-1">
                                  {event.type}
                                </Badge>
                                <div className="text-sm text-muted-foreground">
                                  {Math.round(event.relevanceScore * 100)}% match
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              {new Date(event.dates.start).toLocaleDateString()} - {new Date(event.dates.end).toLocaleDateString()}
                            </div>
                            
                            <p className="text-sm">{event.description}</p>

                            {/* Impact Analysis */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <Hotel className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Hotels</div>
                                <div className={`text-xs ${
                                  event.impact.accommodation === 'positive' ? 'text-green-600' :
                                  event.impact.accommodation === 'negative' ? 'text-red-600' :
                                  'text-gray-600'
                                }`}>
                                  {event.impact.accommodation}
                                </div>
                              </div>
                              <div className="text-center">
                                <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Pricing</div>
                                <div className={`text-xs ${
                                  event.impact.pricing === 'increase' ? 'text-red-600' :
                                  event.impact.pricing === 'decrease' ? 'text-green-600' :
                                  'text-gray-600'
                                }`}>
                                  {event.impact.pricing}
                                </div>
                              </div>
                              <div className="text-center">
                                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Crowds</div>
                                <div className={`text-xs ${
                                  event.impact.crowds === 'high' ? 'text-red-600' :
                                  event.impact.crowds === 'medium' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {event.impact.crowds}
                                </div>
                              </div>
                              <div className="text-center">
                                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Availability</div>
                                <div className={`text-xs ${
                                  event.impact.availability === 'limited' ? 'text-red-600' :
                                  event.impact.availability === 'normal' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {event.impact.availability}
                                </div>
                              </div>
                            </div>

                            {/* Opportunities & Considerations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-medium text-sm mb-2 flex items-center text-green-700">
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  Opportunities
                                </h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {event.opportunities.map((opp, index) => (
                                    <li key={index}>• {opp}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-2 flex items-center text-yellow-700">
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  Considerations
                                </h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {event.considerations.map((con, index) => (
                                    <li key={index}>• {con}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Ticket Information */}
                            {event.ticketInfo && (
                              <Alert>
                                <Calendar className="h-4 w-4" />
                                <AlertTitle>Ticket Information</AlertTitle>
                                <AlertDescription>
                                  {event.ticketInfo.required && (
                                    <>
                                      Tickets required • 
                                      Price: {event.ticketInfo.priceRange.min} - {event.ticketInfo.priceRange.max} EUR • 
                                      Availability: {event.ticketInfo.availability}
                                    </>
                                  )}
                                  {!event.ticketInfo.required && 'Free entry event'}
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No events discovered</p>
                        <p className="text-sm">Check back later for new events in your area</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <span>•</span>
            <span>Auto-refresh: {refreshInterval}m</span>
          </div>
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Real-time alerts enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
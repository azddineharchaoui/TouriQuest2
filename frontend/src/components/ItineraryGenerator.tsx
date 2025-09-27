import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  Heart, 
  Utensils, 
  Camera, 
  Mountain, 
  Palette, 
  Music, 
  ShoppingBag,
  Plane,
  Car,
  Train,
  Bus,
  Cloud,
  Sun,
  CloudRain,
  ThermometerSun,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
  Star,
  TrendingUp,
  Settings,
  RefreshCw,
  Download,
  Share2,
  Edit3,
  Plus,
  Minus,
  Move,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Navigation,
  Route,
  Timer,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface ItineraryGeneratorProps {
  onClose?: () => void;
  initialRequest?: string;
  currentLocation?: { lat: number; lng: number; name: string };
  userPreferences?: UserPreferences;
}

interface UserPreferences {
  interests: string[];
  budgetRange: [number, number];
  groupSize: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  mobility: 'walking' | 'public-transport' | 'car' | 'mixed';
  energyLevel: 'low' | 'medium' | 'high';
  socialPreference: 'solo' | 'small-groups' | 'crowds' | 'flexible';
}

interface TripRequest {
  destination: string;
  dates: {
    startDate: string;
    endDate: string;
    flexible: boolean;
  };
  budget: {
    total: number;
    currency: string;
    breakdown: {
      accommodation: number;
      food: number;
      activities: number;
      transportation: number;
      shopping: number;
      misc: number;
    };
  };
  group: {
    adults: number;
    children: number;
    ages: number[];
    relationships: string[];
  };
  interests: string[];
  preferences: UserPreferences;
  constraints: {
    accessibility: string[];
    dietary: string[];
    language: string[];
    visa: boolean;
  };
}

interface ItineraryDay {
  date: string;
  theme: string;
  weather: WeatherInfo;
  activities: Activity[];
  transportation: Transportation[];
  meals: Meal[];
  accommodation: Accommodation;
  budget: DayBudget;
  energyProfile: EnergyProfile;
  alternatives: Alternative[];
}

interface Activity {
  id: string;
  name: string;
  type: string;
  location: Location;
  time: {
    start: string;
    end: string;
    duration: number;
    buffer: number;
  };
  cost: number;
  rating: number;
  description: string;
  highlights: string[];
  requirements: string[];
  alternatives: string[];
  crowdLevel: 'low' | 'medium' | 'high';
  energyRequired: 'low' | 'medium' | 'high';
  photos: string[];
  reviews: number;
  bookingRequired: boolean;
  accessibility: string[];
}

interface Transportation {
  id: string;
  mode: 'walking' | 'public' | 'taxi' | 'rental-car' | 'bike' | 'flight';
  from: Location;
  to: Location;
  time: {
    departure: string;
    arrival: string;
    duration: number;
  };
  cost: number;
  provider: string;
  bookingInfo: string;
  carbonFootprint: number;
  alternatives: string[];
}

interface WeatherInfo {
  condition: string;
  temperature: { min: number; max: number };
  precipitation: number;
  wind: number;
  humidity: number;
  uv: number;
  recommendations: string[];
  alerts: string[];
}

interface Location {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  district: string;
  landmarks: string[];
}

interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  restaurant: string;
  cuisine: string;
  location: Location;
  time: string;
  cost: number;
  rating: number;
  dietary: string[];
  highlights: string[];
}

interface Accommodation {
  name: string;
  type: string;
  location: Location;
  checkIn: string;
  checkOut: string;
  rating: number;
  amenities: string[];
  cost: number;
}

interface DayBudget {
  total: number;
  spent: number;
  breakdown: {
    activities: number;
    food: number;
    transportation: number;
    shopping: number;
    misc: number;
  };
  savings: number;
  splurges: number;
}

interface EnergyProfile {
  morning: 'low' | 'medium' | 'high';
  afternoon: 'low' | 'medium' | 'high';
  evening: 'low' | 'medium' | 'high';
  totalRequired: 'low' | 'medium' | 'high';
  recovery: string[];
}

interface Alternative {
  id: string;
  reason: string;
  suggestion: string;
  impact: string;
  probability: number;
}

interface GeneratedItinerary {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalCost: number;
  currency: string;
  destinations: string[];
  highlights: string[];
  days: ItineraryDay[];
  optimization: {
    score: number;
    factors: string[];
    improvements: string[];
  };
  alternatives: {
    budget: GeneratedItinerary[];
    timeframe: GeneratedItinerary[];
    interests: GeneratedItinerary[];
  };
  metadata: {
    generatedAt: string;
    version: string;
    confidence: number;
    personalizedScore: number;
  };
}

export function ItineraryGenerator({ 
  onClose, 
  initialRequest,
  currentLocation,
  userPreferences 
}: ItineraryGeneratorProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'results' | 'editing'>('input');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState(initialRequest || '');
  const [tripRequest, setTripRequest] = useState<Partial<TripRequest>>({});
  const [generatedItinerary, setGeneratedItinerary] = useState<GeneratedItinerary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<string[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<string[]>([]);
  const [eventSuggestions, setEventSuggestions] = useState<any[]>([]);

  // Interest categories with icons
  const interestCategories = [
    { id: 'food', name: 'Foodie', icon: Utensils, color: 'bg-orange-500' },
    { id: 'culture', name: 'Culture', icon: Palette, color: 'bg-purple-500' },
    { id: 'adventure', name: 'Adventure', icon: Mountain, color: 'bg-green-500' },
    { id: 'photography', name: 'Photography', icon: Camera, color: 'bg-blue-500' },
    { id: 'music', name: 'Music & Arts', icon: Music, color: 'bg-pink-500' },
    { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-yellow-500' },
    { id: 'history', name: 'History', icon: Globe, color: 'bg-indigo-500' },
    { id: 'nature', name: 'Nature', icon: Sun, color: 'bg-emerald-500' }
  ];

  // Transportation modes
  const transportModes = [
    { id: 'walking', name: 'Walking', icon: Navigation },
    { id: 'public', name: 'Public Transit', icon: Bus },
    { id: 'car', name: 'Car Rental', icon: Car },
    { id: 'flight', name: 'Flights', icon: Plane },
    { id: 'train', name: 'Train', icon: Train }
  ];

  // Parse natural language input
  const parseNaturalLanguage = useCallback(async (input: string) => {
    try {
      const response = await fetch('/api/v1/ai/extract/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, context: 'trip-planning' })
      });

      const entities = await response.json();
      
      // Extract structured data from natural language
      const parsed = {
        destination: entities.locations?.[0] || '',
        duration: entities.duration || 2,
        budget: entities.budget || 1000,
        interests: entities.interests || [],
        groupSize: entities.groupSize || 2,
        dates: entities.dates || { flexible: true }
      };

      setTripRequest(prev => ({
        ...prev,
        destination: parsed.destination,
        budget: {
          total: parsed.budget,
          currency: 'USD',
          breakdown: {
            accommodation: parsed.budget * 0.4,
            food: parsed.budget * 0.3,
            activities: parsed.budget * 0.2,
            transportation: parsed.budget * 0.1,
            shopping: 0,
            misc: 0
          }
        },
        interests: parsed.interests,
        group: {
          adults: parsed.groupSize,
          children: 0,
          ages: [],
          relationships: []
        }
      }));

    } catch (error) {
      console.error('Failed to parse natural language:', error);
    }
  }, []);

  // Generate itinerary
  const generateItinerary = async () => {
    setIsGenerating(true);
    setStep('generating');
    setOptimizationProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/v1/ai/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: tripRequest,
          preferences: userPreferences,
          currentLocation,
          optimizationLevel: 'high'
        })
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setOptimizationProgress(100);
      
      setTimeout(() => {
        setGeneratedItinerary(data.itinerary);
        setAlternatives(data.alternatives || []);
        setStep('results');
        setIsGenerating(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to generate itinerary:', error);
      setIsGenerating(false);
      setStep('input');
    }
  };

  // Optimize itinerary
  const optimizeItinerary = async (optimizationType: string) => {
    if (!generatedItinerary) return;

    setIsOptimizing(true);
    setOptimizationProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await fetch('/api/v1/ai/itinerary/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: generatedItinerary.id,
          optimizationType,
          realTimeFactors: {
            weather: true,
            traffic: true,
            crowds: true,
            events: true,
            prices: true
          },
          userContext: {
            currentLocation,
            energyLevel: userPreferences?.energyLevel || 'medium',
            timeOfDay: new Date().getHours()
          }
        })
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setOptimizationProgress(100);
      
      setTimeout(() => {
        setGeneratedItinerary(data.optimizedItinerary);
        setWeatherAlerts(data.weatherAlerts || []);
        setTrafficAlerts(data.trafficAlerts || []);
        setEventSuggestions(data.eventSuggestions || []);
        setIsOptimizing(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to optimize itinerary:', error);
      setIsOptimizing(false);
    }
  };

  // Real-time optimization effects
  useEffect(() => {
    if (generatedItinerary) {
      const interval = setInterval(() => {
        // Check for real-time updates
        optimizeItinerary('real-time');
      }, 300000); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [generatedItinerary]);

  // Parse initial natural language input
  useEffect(() => {
    if (naturalLanguageInput) {
      parseNaturalLanguage(naturalLanguageInput);
    }
  }, [naturalLanguageInput, parseNaturalLanguage]);

  const renderInputStep = () => (
    <div className="space-y-6">
      {/* Natural Language Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Describe Your Perfect Trip</span>
          </CardTitle>
          <CardDescription>
            Tell us what you're looking for and we'll create a personalized itinerary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              placeholder="e.g., 'Plan a romantic weekend in Paris under $1500 for 2 people who love art and great food'"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              className="text-lg h-16 pr-12"
            />
            <Button
              onClick={() => parseNaturalLanguage(naturalLanguageInput)}
              className="absolute right-2 top-2 h-12 w-12"
              size="icon"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setNaturalLanguageInput("Plan a family vacation to Tokyo for 7 days under $3000")}>
              Family Tokyo Trip
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNaturalLanguageInput("Romantic weekend in Santorini for couples under $2000")}>
              Romantic Getaway
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNaturalLanguageInput("Adventure backpacking in Peru for 10 days under $1500")}>
              Adventure Peru
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNaturalLanguageInput("Luxury shopping and dining in Milan for 4 days")}>
              Luxury Milan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interests Selection */}
      <Card>
        <CardHeader>
          <CardTitle>What interests you most?</CardTitle>
          <CardDescription>Select your travel interests to personalize your itinerary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {interestCategories.map((interest) => (
              <Button
                key={interest.id}
                variant={tripRequest.interests?.includes(interest.id) ? "default" : "outline"}
                className="h-20 flex flex-col items-center space-y-2"
                onClick={() => {
                  const current = tripRequest.interests || [];
                  const updated = current.includes(interest.id)
                    ? current.filter(i => i !== interest.id)
                    : [...current, interest.id];
                  setTripRequest(prev => ({ ...prev, interests: updated }));
                }}
              >
                <div className={`p-2 rounded-full ${interest.color} text-white`}>
                  <interest.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium">{interest.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget and Group Settings */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span>Budget</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Total Budget</label>
              <Input
                type="number"
                placeholder="1000"
                value={tripRequest.budget?.total || ''}
                onChange={(e) => setTripRequest(prev => ({
                  ...prev,
                  budget: { ...prev.budget, total: parseInt(e.target.value) || 0, currency: 'USD' }
                }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Travel Style</label>
              <div className="grid grid-cols-3 gap-2">
                {['budget', 'mid-range', 'luxury'].map((style) => (
                  <Button
                    key={style}
                    variant={tripRequest.preferences?.travelStyle === style ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripRequest(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, travelStyle: style as any }
                    }))}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Group Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Adults</label>
              <Input
                type="number"
                min="1"
                value={tripRequest.group?.adults || 1}
                onChange={(e) => setTripRequest(prev => ({
                  ...prev,
                  group: { ...prev.group, adults: parseInt(e.target.value) || 1 }
                }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Children</label>
              <Input
                type="number"
                min="0"
                value={tripRequest.group?.children || 0}
                onChange={(e) => setTripRequest(prev => ({
                  ...prev,
                  group: { ...prev.group, children: parseInt(e.target.value) || 0 }
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Button */}
      <Button 
        onClick={generateItinerary}
        className="w-full h-12 text-lg"
        disabled={!tripRequest.destination || !tripRequest.budget?.total}
      >
        <Zap className="h-5 w-5 mr-2" />
        Generate My Perfect Itinerary
      </Button>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="text-center space-y-6 py-12">
      <div className="relative">
        <div className="w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          <div className="absolute inset-4 rounded-full bg-blue-500 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Creating Your Perfect Itinerary</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Our AI is analyzing your preferences, checking real-time data, and crafting a personalized travel experience just for you.
        </p>
        
        <div className="max-w-xs mx-auto">
          <Progress value={optimizationProgress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">{optimizationProgress}% complete</p>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          {optimizationProgress < 30 && <p>🔍 Analyzing your preferences...</p>}
          {optimizationProgress >= 30 && optimizationProgress < 60 && <p>🌍 Finding the best destinations...</p>}
          {optimizationProgress >= 60 && optimizationProgress < 90 && <p>⚡ Optimizing for weather and crowds...</p>}
          {optimizationProgress >= 90 && <p>✨ Adding final touches...</p>}
        </div>
      </div>
    </div>
  );

  const renderResultsStep = () => {
    if (!generatedItinerary) return null;

    return (
      <div className="space-y-6">
        {/* Itinerary Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{generatedItinerary.title}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {generatedItinerary.description}
                </CardDescription>
              </div>
              <div className="text-right space-y-2">
                <div className="text-3xl font-bold text-green-600">
                  ${generatedItinerary.totalCost}
                </div>
                <div className="text-sm text-muted-foreground">
                  {generatedItinerary.duration} days
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-4">
              <Badge className="bg-blue-500">
                <Star className="h-3 w-3 mr-1" />
                {generatedItinerary.optimization.score}% optimized
              </Badge>
              <Badge className="bg-green-500">
                <Heart className="h-3 w-3 mr-1" />
                {generatedItinerary.metadata.personalizedScore}% personalized
              </Badge>
              <Badge className="bg-purple-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                {generatedItinerary.metadata.confidence}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {generatedItinerary.highlights.map((highlight, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {highlight}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Alerts */}
        {(weatherAlerts.length > 0 || trafficAlerts.length > 0) && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
                <span>Real-time Updates</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weatherAlerts.map((alert, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Cloud className="h-4 w-4" />
                    <span>{alert}</span>
                  </div>
                ))}
                {trafficAlerts.map((alert, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Navigation className="h-4 w-4" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimization Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Optimization</CardTitle>
            <CardDescription>
              Automatically adjust your itinerary based on real-time conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-16 flex flex-col space-y-1"
                onClick={() => optimizeItinerary('weather')}
                disabled={isOptimizing}
              >
                <Cloud className="h-5 w-5" />
                <span className="text-xs">Weather</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col space-y-1"
                onClick={() => optimizeItinerary('traffic')}
                disabled={isOptimizing}
              >
                <Route className="h-5 w-5" />
                <span className="text-xs">Traffic</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col space-y-1"
                onClick={() => optimizeItinerary('crowds')}
                disabled={isOptimizing}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Crowds</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col space-y-1"
                onClick={() => optimizeItinerary('energy')}
                disabled={isOptimizing}
              >
                <Battery className="h-5 w-5" />
                <span className="text-xs">Energy</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Itinerary */}
        <Card>
          <CardHeader>
            <CardTitle>Your Daily Itinerary</CardTitle>
            <CardDescription>
              Tap any day to see details or make modifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedItinerary.days.map((day, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setEditingDay(editingDay === index ? null : index)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
                        <p className="text-sm text-muted-foreground">{day.theme}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <ThermometerSun className="h-4 w-4" />
                        <span>{day.weather.temperature.max}°/{day.weather.temperature.min}°</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${day.budget.total}</div>
                        <div className="text-xs text-muted-foreground">{day.activities.length} activities</div>
                      </div>
                      {editingDay === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {editingDay === index && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex} className="flex items-center space-x-3 p-3 bg-background rounded border">
                          <div className="text-sm font-mono text-muted-foreground min-w-16">
                            {activity.time.start}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium">{activity.name}</h5>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {activity.time.duration}h
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="h-3 w-3 mr-1" />
                                ${activity.cost}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                {activity.rating}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export Itinerary
          </Button>
          <Button variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">Intelligent Trip Planner</h1>
          <p className="text-sm text-muted-foreground">AI-powered itinerary generation with real-time optimization</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {step === 'input' && renderInputStep()}
          {step === 'generating' && renderGeneratingStep()}
          {step === 'results' && renderResultsStep()}
        </div>
      </div>

      {/* Loading Overlay */}
      {isOptimizing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <Card className="w-80">
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <h3 className="font-semibold mb-2">Optimizing Your Itinerary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adjusting for real-time conditions...
              </p>
              <Progress value={optimizationProgress} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
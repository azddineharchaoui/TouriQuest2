import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  Users,
  Calendar,
  Heart,
  Star,
  Target,
  BookOpen,
  Clock,
  MapPin,
  TrendingUp,
  Settings,
  X,
  Lightbulb,
  Award,
  Activity,
  Cake,
  Gift,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Globe,
  Compass,
  Camera,
  Music,
  Utensils,
  Plane,
  Car,
  Coffee,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';

interface MemoryLearningSystemProps {
  onClose: () => void;
  userId: string;
}

interface TravelPreference {
  category: 'accommodation' | 'dining' | 'activities' | 'transport' | 'budget' | 'timing' | 'social';
  preference: string;
  confidence: number;
  learnedFrom: Array<{
    tripId: string;
    destination: string;
    date: string;
    context: string;
  }>;
  adaptations: Array<{
    date: string;
    change: string;
    reason: string;
    impact: number;
  }>;
  seasonalVariations: Array<{
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    modification: string;
    strength: number;
  }>;
}

interface FamilyGroupProfile {
  id: string;
  name: string;
  type: 'family' | 'friends' | 'colleagues' | 'couple' | 'solo_plus_locals';
  members: Array<{
    id: string;
    name: string;
    role: 'decision_maker' | 'influencer' | 'follower' | 'special_needs';
    preferences: TravelPreference[];
    constraints: Array<{
      type: 'budget' | 'mobility' | 'dietary' | 'time' | 'interest';
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    age_group: 'child' | 'teen' | 'young_adult' | 'adult' | 'senior';
  }>;
  groupDynamics: {
    decisionMakingStyle: 'democratic' | 'hierarchical' | 'rotational' | 'consensus';
    conflictResolution: 'compromiser' | 'avoider' | 'collaborator' | 'competitor';
    planningStyle: 'spontaneous' | 'structured' | 'flexible' | 'detailed';
    budgetManagement: 'shared' | 'individual' | 'pooled' | 'split';
  };
  sharedPreferences: TravelPreference[];
  commonConstraints: string[];
  successfulTripPatterns: Array<{
    pattern: string;
    frequency: number;
    satisfaction: number;
    examples: string[];
  }>;
  lastUpdated: Date;
}

interface SeasonalBehavior {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  patterns: Array<{
    behavior: string;
    frequency: number;
    confidence: number;
    examples: Array<{
      year: number;
      destination: string;
      activities: string[];
      satisfaction: number;
    }>;
  }>;
  preferredDestinations: Array<{
    destination: string;
    visitCount: number;
    avgSatisfaction: number;
    reasonsForChoice: string[];
  }>;
  adaptations: Array<{
    change: string;
    triggerEvent: string;
    impact: number;
    date: string;
  }>;
}

interface OccasionMemory {
  id: string;
  type: 'birthday' | 'anniversary' | 'graduation' | 'retirement' | 'holiday' | 'milestone' | 'celebration';
  person: {
    name: string;
    relationship: string;
    preferences: string[];
  };
  date: {
    recurring: boolean;
    frequency?: 'yearly' | 'monthly' | 'one_time';
    nextOccurrence: string;
  };
  historicalCelebrations: Array<{
    year: number;
    activity: string;
    location: string;
    budget: number;
    satisfaction: number;
    notes: string;
  }>;
  preferences: {
    scale: 'intimate' | 'small_group' | 'large_celebration' | 'public_event';
    style: 'quiet' | 'adventurous' | 'luxurious' | 'traditional' | 'unique';
    budget: { min: number; max: number; preferred: number };
  };
  upcomingPlans: Array<{
    proposal: string;
    confidence: number;
    reasoning: string;
    alternatives: string[];
  }>;
  reminderSettings: {
    advanceNotice: number; // days
    followUpReminders: boolean;
    invitationHelp: boolean;
  };
}

interface TravelGoal {
  id: string;
  title: string;
  category: 'destinations' | 'experiences' | 'skills' | 'cultural' | 'personal' | 'adventure' | 'relaxation';
  description: string;
  targetDate?: string;
  priority: 'low' | 'medium' | 'high';
  progress: {
    current: number;
    target: number;
    unit: string;
    milestones: Array<{
      title: string;
      completed: boolean;
      date?: string;
      notes?: string;
    }>;
  };
  relatedTrips: Array<{
    tripId: string;
    contribution: number;
    activities: string[];
  }>;
  recommendations: Array<{
    type: 'destination' | 'activity' | 'timing' | 'preparation';
    suggestion: string;
    reasoning: string;
    urgency: number;
  }>;
  inspiration: {
    sources: string[];
    motivations: string[];
    influences: string[];
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function MemoryLearningSystem({ onClose, userId }: MemoryLearningSystemProps) {
  const [activeTab, setActiveTab] = useState('preferences');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [memoryData, setMemoryData] = useState({
    preferences: [] as TravelPreference[],
    familyProfiles: [] as FamilyGroupProfile[],
    seasonalBehaviors: [] as SeasonalBehavior[],
    occasions: [] as OccasionMemory[],
    goals: [] as TravelGoal[]
  });

  const [insights, setInsights] = useState({
    totalTrips: 0,
    preferencesLearned: 0,
    goalsAchieved: 0,
    adaptationRate: 0,
    satisfactionTrend: 'improving' as 'improving' | 'stable' | 'declining'
  });

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [newGoalDialog, setNewGoalDialog] = useState(false);

  useEffect(() => {
    loadMemoryData();
  }, [userId]);

  // Load all memory and learning data
  const loadMemoryData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPreferences(),
        loadFamilyProfiles(),
        loadSeasonalBehaviors(),
        loadOccasionMemories(),
        loadTravelGoals(),
        loadInsights()
      ]);
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Preference Learning API
  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryData(prev => ({ ...prev, preferences: data.preferences || [] }));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  // Family & Group Profiles API
  const loadFamilyProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryData(prev => ({ ...prev, familyProfiles: data.profiles || [] }));
      }
    } catch (error) {
      console.error('Failed to load family profiles:', error);
    }
  };

  // Seasonal Behavior Recognition API
  const loadSeasonalBehaviors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/seasonal`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryData(prev => ({ ...prev, seasonalBehaviors: data.behaviors || [] }));
      }
    } catch (error) {
      console.error('Failed to load seasonal behaviors:', error);
    }
  };

  // Occasion Tracking API
  const loadOccasionMemories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/occasions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryData(prev => ({ ...prev, occasions: data.occasions || [] }));
      }
    } catch (error) {
      console.error('Failed to load occasion memories:', error);
    }
  };

  // Travel Goal Progress API
  const loadTravelGoals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/goals`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryData(prev => ({ ...prev, goals: data.goals || [] }));
      }
    } catch (error) {
      console.error('Failed to load travel goals:', error);
    }
  };

  // Load insights and statistics
  const loadInsights = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/insights`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || insights);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  // Create new travel goal
  const createTravelGoal = async (goalData: Partial<TravelGoal>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(goalData)
      });

      if (response.ok) {
        const newGoal = await response.json();
        setMemoryData(prev => ({ 
          ...prev, 
          goals: [newGoal, ...prev.goals] 
        }));
        setNewGoalDialog(false);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  // Update goal progress
  const updateGoalProgress = async (goalId: string, progressUpdate: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/memory/goals/${goalId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(progressUpdate)
      });

      if (response.ok) {
        await loadTravelGoals(); // Refresh goals
      }
    } catch (error) {
      console.error('Failed to update goal progress:', error);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accommodation': return <Coffee className="h-4 w-4" />;
      case 'dining': return <Utensils className="h-4 w-4" />;
      case 'activities': return <Activity className="h-4 w-4" />;
      case 'transport': return <Car className="h-4 w-4" />;
      case 'budget': return <Target className="h-4 w-4" />;
      case 'timing': return <Clock className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      case 'destinations': return <Globe className="h-4 w-4" />;
      case 'experiences': return <Camera className="h-4 w-4" />;
      case 'skills': return <BookOpen className="h-4 w-4" />;
      case 'cultural': return <Music className="h-4 w-4" />;
      case 'personal': return <Heart className="h-4 w-4" />;
      case 'adventure': return <Compass className="h-4 w-4" />;
      case 'relaxation': return <Sparkles className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100';
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  // Get season icon
  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      default: return '🌍';
    }
  };

  // Get occasion icon
  const getOccasionIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="h-4 w-4" />;
      case 'anniversary': return <Heart className="h-4 w-4" />;
      case 'graduation': return <Award className="h-4 w-4" />;
      case 'retirement': return <Gift className="h-4 w-4" />;
      case 'holiday': return <Calendar className="h-4 w-4" />;
      case 'milestone': return <Target className="h-4 w-4" />;
      case 'celebration': return <Sparkles className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Filter data based on search
  const getFilteredData = (data: any[], searchFields: string[]) => {
    if (!searchQuery.trim()) return data;
    
    return data.filter(item => 
      searchFields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Memory & Learning System</h2>
              <p className="text-sm text-muted-foreground">
                AI-powered preference learning, family profiles, and travel goal tracking
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMemoryData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-b p-4 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{insights.totalTrips}</div>
              <div className="text-xs text-muted-foreground">Total Trips</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.preferencesLearned}</div>
              <div className="text-xs text-muted-foreground">Preferences Learned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{insights.goalsAchieved}</div>
              <div className="text-xs text-muted-foreground">Goals Achieved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(insights.adaptationRate * 100)}%</div>
              <div className="text-xs text-muted-foreground">Adaptation Rate</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                insights.satisfactionTrend === 'improving' ? 'text-green-600' :
                insights.satisfactionTrend === 'declining' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {insights.satisfactionTrend === 'improving' ? '↗' :
                 insights.satisfactionTrend === 'declining' ? '↘' : '→'}
              </div>
              <div className="text-xs text-muted-foreground">Satisfaction Trend</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search preferences, profiles, occasions, or goals..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="preferences" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Preferences</span>
                <Badge variant="secondary" className="text-xs">{memoryData.preferences.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Groups</span>
                <Badge variant="secondary" className="text-xs">{memoryData.familyProfiles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Seasonal</span>
              </TabsTrigger>
              <TabsTrigger value="occasions" className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Occasions</span>
                <Badge variant="secondary" className="text-xs">{memoryData.occasions.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Goals</span>
                <Badge variant="secondary" className="text-xs">{memoryData.goals.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              {/* Preference Learning */}
              <TabsContent value="preferences" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {getFilteredData(memoryData.preferences, ['preference', 'category']).length > 0 ? (
                      getFilteredData(memoryData.preferences, ['preference', 'category']).map((pref, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getCategoryIcon(pref.category)}
                                <div>
                                  <CardTitle className="text-base capitalize">{pref.category}</CardTitle>
                                  <CardDescription>{pref.preference}</CardDescription>
                                </div>
                              </div>
                              <Badge className={getConfidenceColor(pref.confidence)}>
                                {Math.round(pref.confidence * 100)}% confident
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Learning Sources */}
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center">
                                <BookOpen className="h-4 w-4 mr-1" />
                                Learned From ({pref.learnedFrom.length} trips)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {pref.learnedFrom.slice(0, 4).map((source, idx) => (
                                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                                    <div className="font-medium">{source.destination}</div>
                                    <div className="text-xs text-muted-foreground">{source.date} • {source.context}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Adaptations */}
                            {pref.adaptations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Recent Adaptations
                                </h4>
                                <div className="space-y-2">
                                  {pref.adaptations.slice(0, 3).map((adapt, idx) => (
                                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="text-sm font-medium">{adapt.change}</div>
                                          <div className="text-xs text-muted-foreground">{adapt.reason}</div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          +{adapt.impact}% impact
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Seasonal Variations */}
                            {pref.seasonalVariations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Seasonal Variations
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {pref.seasonalVariations.map((seasonal, idx) => (
                                    <div key={idx} className="p-2 bg-muted/50 rounded text-center">
                                      <div className="text-lg mb-1">{getSeasonIcon(seasonal.season)}</div>
                                      <div className="text-xs font-medium capitalize">{seasonal.season}</div>
                                      <div className="text-xs text-muted-foreground">{seasonal.modification}</div>
                                      <Progress value={seasonal.strength * 100} className="mt-1 h-1" />
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
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No preferences learned yet</p>
                        <p className="text-sm">Take more trips to help AI learn your preferences</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Family & Group Profiles */}
              <TabsContent value="profiles" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {getFilteredData(memoryData.familyProfiles, ['name', 'type']).length > 0 ? (
                      getFilteredData(memoryData.familyProfiles, ['name', 'type']).map((profile) => (
                        <Card key={profile.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    <Users className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-base">{profile.name}</CardTitle>
                                  <CardDescription className="capitalize">
                                    {profile.type.replace('_', ' ')} • {profile.members.length} members
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedProfile(selectedProfile === profile.id ? null : profile.id)}
                              >
                                {selectedProfile === profile.id ? 'Collapse' : 'Expand'}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Group Dynamics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <Settings className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Decision Making</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {profile.groupDynamics.decisionMakingStyle}
                                </div>
                              </div>
                              <div className="text-center">
                                <Heart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Conflict Style</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {profile.groupDynamics.conflictResolution}
                                </div>
                              </div>
                              <div className="text-center">
                                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Planning</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {profile.groupDynamics.planningStyle}
                                </div>
                              </div>
                              <div className="text-center">
                                <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Budget</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {profile.groupDynamics.budgetManagement}
                                </div>
                              </div>
                            </div>

                            {/* Members Preview */}
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                Group Members
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {profile.members.slice(0, 6).map((member, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {member.name} ({member.role.replace('_', ' ')})
                                  </Badge>
                                ))}
                                {profile.members.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{profile.members.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Successful Patterns */}
                            {profile.successfulTripPatterns.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Successful Trip Patterns
                                </h4>
                                <div className="space-y-2">
                                  {profile.successfulTripPatterns.slice(0, 3).map((pattern, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                      <div>
                                        <div className="text-sm font-medium">{pattern.pattern}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Used {pattern.frequency} times • {Math.round(pattern.satisfaction * 100)}% satisfaction
                                        </div>
                                      </div>
                                      <Badge className="bg-green-100 text-green-800">
                                        <Star className="h-3 w-3 mr-1" />
                                        {pattern.satisfaction.toFixed(1)}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Expanded Details */}
                            {selectedProfile === profile.id && (
                              <div className="space-y-4 border-t pt-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Individual Members</h4>
                                  <div className="space-y-2">
                                    {profile.members.map((member, idx) => (
                                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-medium text-sm">{member.name}</div>
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {member.role.replace('_', ' ')}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs capitalize">
                                              {member.age_group.replace('_', ' ')}
                                            </Badge>
                                          </div>
                                        </div>
                                        {member.constraints.length > 0 && (
                                          <div className="text-xs text-muted-foreground">
                                            Constraints: {member.constraints.map(c => c.description).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No group profiles yet</p>
                        <p className="text-sm">Travel with others to create group profiles</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Seasonal Behavior */}
              <TabsContent value="seasonal" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {memoryData.seasonalBehaviors.length > 0 ? (
                      memoryData.seasonalBehaviors.map((seasonal, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center space-x-2">
                              <span className="text-2xl">{getSeasonIcon(seasonal.season)}</span>
                              <span className="capitalize">{seasonal.season} Travel Behavior</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Behavior Patterns */}
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Behavior Patterns
                              </h4>
                              <div className="space-y-2">
                                {seasonal.patterns.slice(0, 4).map((pattern, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <div>
                                      <div className="text-sm font-medium">{pattern.behavior}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Frequency: {pattern.frequency} times
                                      </div>
                                    </div>
                                    <Badge className={getConfidenceColor(pattern.confidence)}>
                                      {Math.round(pattern.confidence * 100)}%
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Preferred Destinations */}
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center">
                                <Globe className="h-4 w-4 mr-1" />
                                Preferred Destinations
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {seasonal.preferredDestinations.slice(0, 4).map((dest, idx) => (
                                  <div key={idx} className="p-2 bg-muted/50 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm">{dest.destination}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {dest.visitCount} visits
                                      </Badge>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={dest.avgSatisfaction * 100} className="flex-1 h-1" />
                                      <span className="text-xs text-muted-foreground">
                                        {Math.round(dest.avgSatisfaction * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recent Adaptations */}
                            {seasonal.adaptations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <Zap className="h-4 w-4 mr-1" />
                                  Recent Adaptations
                                </h4>
                                <div className="space-y-2">
                                  {seasonal.adaptations.slice(0, 3).map((adapt, idx) => (
                                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="text-sm font-medium">{adapt.change}</div>
                                          <div className="text-xs text-muted-foreground">
                                            Triggered by: {adapt.triggerEvent}
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {adapt.impact > 0 ? '+' : ''}{adapt.impact}%
                                        </Badge>
                                      </div>
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
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No seasonal patterns detected</p>
                        <p className="text-sm">Travel across different seasons to see patterns</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Occasion Tracking */}
              <TabsContent value="occasions" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {getFilteredData(memoryData.occasions, ['person.name', 'type']).length > 0 ? (
                      getFilteredData(memoryData.occasions, ['person.name', 'type']).map((occasion) => (
                        <Card key={occasion.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getOccasionIcon(occasion.type)}
                                <div>
                                  <CardTitle className="text-base">{occasion.person.name}'s {occasion.type}</CardTitle>
                                  <CardDescription className="capitalize">
                                    {occasion.person.relationship} • Next: {new Date(occasion.date.nextOccurrence).toLocaleDateString()}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={occasion.date.recurring ? "default" : "secondary"}>
                                  {occasion.date.recurring ? 'Recurring' : 'One-time'}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Math.round((new Date(occasion.date.nextOccurrence).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days away
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Celebration Preferences */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Scale</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {occasion.preferences.scale.replace('_', ' ')}
                                </div>
                              </div>
                              <div className="text-center">
                                <Sparkles className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Style</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {occasion.preferences.style}
                                </div>
                              </div>
                              <div className="text-center">
                                <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-xs font-medium">Budget</div>
                                <div className="text-xs text-muted-foreground">
                                  €{occasion.preferences.budget.preferred}
                                </div>
                              </div>
                            </div>

                            {/* Historical Celebrations */}
                            {occasion.historicalCelebrations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  Past Celebrations
                                </h4>
                                <div className="space-y-2">
                                  {occasion.historicalCelebrations.slice(0, 3).map((celebration, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                      <div>
                                        <div className="text-sm font-medium">{celebration.activity}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {celebration.location} • {celebration.year} • €{celebration.budget}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-3 w-3 text-yellow-500" />
                                        <span className="text-xs">{celebration.satisfaction.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Upcoming Plans */}
                            {occasion.upcomingPlans.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center">
                                  <Lightbulb className="h-4 w-4 mr-1" />
                                  AI Suggestions for This Year
                                </h4>
                                <div className="space-y-2">
                                  {occasion.upcomingPlans.slice(0, 2).map((plan, idx) => (
                                    <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded">
                                      <div className="flex items-start justify-between mb-1">
                                        <div className="text-sm font-medium">{plan.proposal}</div>
                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                          {Math.round(plan.confidence * 100)}% match
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">{plan.reasoning}</div>
                                      {plan.alternatives.length > 0 && (
                                        <div className="text-xs">
                                          <span className="text-muted-foreground">Alternatives: </span>
                                          {plan.alternatives.join(', ')}
                                        </div>
                                      )}
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
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No occasions tracked yet</p>
                        <p className="text-sm">Add important dates to get celebration suggestions</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Travel Goals */}
              <TabsContent value="goals" className="h-full">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Travel Goals & Progress</h3>
                    <Button onClick={() => setNewGoalDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Goal
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="space-y-4">
                      {getFilteredData(memoryData.goals, ['title', 'category', 'description']).length > 0 ? (
                        getFilteredData(memoryData.goals, ['title', 'category', 'description']).map((goal) => (
                          <Card key={goal.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  {getCategoryIcon(goal.category)}
                                  <div>
                                    <CardTitle className="text-base">{goal.title}</CardTitle>
                                    <CardDescription className="capitalize">
                                      {goal.category} goal • {goal.priority} priority
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant={goal.priority === 'high' ? 'destructive' : 
                                            goal.priority === 'medium' ? 'default' : 'secondary'}
                                  >
                                    {goal.priority} priority
                                  </Badge>
                                  {goal.targetDate && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm">{goal.description}</p>

                              {/* Progress */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Progress</span>
                                  <span className="text-sm text-muted-foreground">
                                    {goal.progress.current} / {goal.progress.target} {goal.progress.unit}
                                  </span>
                                </div>
                                <Progress 
                                  value={(goal.progress.current / goal.progress.target) * 100} 
                                  className="mb-2"
                                />
                                <div className="text-xs text-muted-foreground">
                                  {Math.round((goal.progress.current / goal.progress.target) * 100)}% complete
                                </div>
                              </div>

                              {/* Milestones */}
                              {goal.progress.milestones.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Milestones
                                  </h4>
                                  <div className="space-y-1">
                                    {goal.progress.milestones.map((milestone, idx) => (
                                      <div key={idx} className="flex items-center space-x-2 text-sm">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                          milestone.completed 
                                            ? 'bg-green-500 border-green-500' 
                                            : 'border-gray-300'
                                        }`}>
                                          {milestone.completed && <CheckCircle className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                                          {milestone.title}
                                        </span>
                                        {milestone.date && (
                                          <span className="text-xs text-muted-foreground">
                                            ({new Date(milestone.date).toLocaleDateString()})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Related Trips */}
                              {goal.relatedTrips.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Contributing Trips
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {goal.relatedTrips.slice(0, 4).map((trip, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        Trip #{trip.tripId} (+{trip.contribution}%)
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendations */}
                              {goal.recommendations.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center">
                                    <Lightbulb className="h-4 w-4 mr-1" />
                                    AI Recommendations
                                  </h4>
                                  <div className="space-y-2">
                                    {goal.recommendations.slice(0, 2).map((rec, idx) => (
                                      <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <div className="text-sm font-medium capitalize">{rec.type}</div>
                                            <div className="text-xs text-muted-foreground">{rec.suggestion}</div>
                                          </div>
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${
                                              rec.urgency > 0.7 ? 'border-red-300 text-red-700' :
                                              rec.urgency > 0.4 ? 'border-yellow-300 text-yellow-700' :
                                              'border-green-300 text-green-700'
                                            }`}
                                          >
                                            {rec.urgency > 0.7 ? 'High' : rec.urgency > 0.4 ? 'Medium' : 'Low'} urgency
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">{rec.reasoning}</div>
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
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No travel goals set yet</p>
                          <p className="text-sm">Create goals to track your travel aspirations</p>
                          <Button className="mt-4" onClick={() => setNewGoalDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Goal
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Memory updated: {new Date().toLocaleTimeString()}</span>
            <span>•</span>
            <span>Learning from {insights.totalTrips} trips</span>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI continuously learning your preferences</span>
          </div>
        </div>
      </div>
    </div>
  );
}
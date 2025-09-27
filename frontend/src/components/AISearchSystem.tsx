import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Star,
  Compass,
  Brain,
  Zap,
  Clock,
  TrendingUp,
  Filter,
  X,
  Mic,
  Camera,
  Globe,
  Heart,
  Bookmark,
  Share2,
  ChevronRight,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Target,
  Lightbulb
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

interface AISearchSystemProps {
  onClose: () => void;
  initialQuery?: string;
  searchContext?: 'properties' | 'pois' | 'experiences' | 'general';
}

interface SearchSuggestion {
  id: string;
  query: string;
  type: 'location' | 'activity' | 'cuisine' | 'budget' | 'date' | 'preference';
  confidence: number;
  icon: React.ReactNode;
  description: string;
  trending?: boolean;
  personalized?: boolean;
}

interface SearchResult {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'article' | 'tip';
  title: string;
  description: string;
  image?: string;
  rating?: number;
  price?: number;
  location: string;
  relevanceScore: number;
  aiInsights?: string[];
  tags: string[];
  bookmarked?: boolean;
}

interface SearchAnalytics {
  totalResults: number;
  searchTime: number;
  aiProcessingTime: number;
  confidence: number;
  queryUnderstanding: {
    intent: string;
    entities: Array<{ type: string; value: string; confidence: number }>;
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  suggestions: {
    refinements: string[];
    alternatives: string[];
    related: string[];
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AISearchSystem({ onClose, initialQuery = '', searchContext = 'general' }: AISearchSystemProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // AI-Powered Search Suggestions
  const getAISearchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/search/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: searchQuery,
          context: searchContext,
          userPreferences: JSON.parse(localStorage.getItem('user_preferences') || '{}'),
          searchHistory: searchHistory.slice(-10),
          location: await getUserLocation()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get AI search suggestions:', error);
    }
  }, [searchContext, searchHistory]);

  // Intelligent Search with AI Analysis
  const performAISearch = async (searchQuery: string, filters: string[] = []) => {
    setIsSearching(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/ai/search/intelligent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: searchQuery,
          context: searchContext,
          filters: filters,
          userProfile: JSON.parse(localStorage.getItem('user_profile') || '{}'),
          location: await getUserLocation(),
          preferences: JSON.parse(localStorage.getItem('user_preferences') || '{}'),
          searchIntent: await analyzeSearchIntent(searchQuery)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const searchTime = Date.now() - startTime;

        setSearchResults(data.results || []);
        setSearchAnalytics({
          ...data.analytics,
          searchTime,
          aiProcessingTime: data.processingTime || 0
        });

        // Add to search history
        if (searchQuery && !searchHistory.includes(searchQuery)) {
          setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
        }
      }
    } catch (error) {
      console.error('Failed to perform AI search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Analyze Search Intent using AI
  const analyzeSearchIntent = async (searchQuery: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ query: searchQuery })
      });

      if (response.ok) {
        const data = await response.json();
        return data.intent;
      }
    } catch (error) {
      console.error('Failed to analyze search intent:', error);
    }
    return null;
  };

  // Get User Location for Context
  const getUserLocation = async () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  };

  // Voice Search Integration
  const startVoiceSearch = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsVoiceSearch(true);
      recognition.onend = () => setIsVoiceSearch(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        performAISearch(transcript, selectedFilters);
      };
      
      recognition.onerror = () => setIsVoiceSearch(false);
      recognition.start();
    }
  }, [selectedFilters]);

  // Debounced Search Suggestions
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (query) {
        getAISearchSuggestions(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, getAISearchSuggestions]);

  // Handle Search Input
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      performAISearch(searchQuery, selectedFilters);
      setSuggestions([]);
    }
  };

  // Handle Suggestion Click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    handleSearch(suggestion.query);
  };

  // Handle Filter Toggle
  const toggleFilter = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter];
    
    setSelectedFilters(newFilters);
    
    if (query) {
      performAISearch(query, newFilters);
    }
  };

  // Smart Suggestions Based on Context
  const smartSuggestions = useMemo(() => {
    const baseSuggestions: SearchSuggestion[] = [
      {
        id: '1',
        query: 'romantic restaurants near me',
        type: 'cuisine',
        confidence: 0.95,
        icon: <Heart className="h-4 w-4" />,
        description: 'Perfect for date night',
        personalized: true
      },
      {
        id: '2',
        query: 'family-friendly activities',
        type: 'activity',
        confidence: 0.92,
        icon: <Users className="h-4 w-4" />,
        description: 'Great for kids and adults',
        trending: true
      },
      {
        id: '3',
        query: 'budget hotels under $100',
        type: 'budget',
        confidence: 0.88,
        icon: <DollarSign className="h-4 w-4" />,
        description: 'Affordable accommodations'
      },
      {
        id: '4',
        query: 'weekend getaway ideas',
        type: 'date',
        confidence: 0.85,
        icon: <Calendar className="h-4 w-4" />,
        description: 'Quick escape plans'
      },
      {
        id: '5',
        query: 'hidden gems and local favorites',
        type: 'preference',
        confidence: 0.90,
        icon: <Compass className="h-4 w-4" />,
        description: 'Off the beaten path',
        trending: true
      }
    ];

    return baseSuggestions;
  }, []);

  // Result Card Component
  const ResultCard = ({ result }: { result: SearchResult }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          {result.image && (
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={result.image} 
                alt={result.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium truncate">{result.title}</h3>
              <div className="flex items-center space-x-1 ml-2">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(result.relevanceScore * 100)}% match
                </Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Bookmark className={`h-3 w-3 ${result.bookmarked ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {result.description}
            </p>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span className="text-muted-foreground">{result.location}</span>
                </div>
                
                {result.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{result.rating}</span>
                  </div>
                )}
              </div>
              
              {result.price && (
                <div className="font-medium">
                  ${result.price}
                </div>
              )}
            </div>
            
            {result.aiInsights && result.aiInsights.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-1 mb-1">
                  <Brain className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">AI Insights</span>
                </div>
                <p className="text-xs text-blue-600">
                  {result.aiInsights[0]}
                </p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-1 mt-2">
              {result.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-black">
                  <Brain className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">AI-Powered Search</h2>
                <p className="text-sm text-muted-foreground">
                  Intelligent search with personalized recommendations
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b bg-muted/20">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search destinations, activities, restaurants..."
                className="pl-10 pr-20 bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(query);
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={startVoiceSearch}
                  disabled={isVoiceSearch}
                >
                  {isVoiceSearch ? (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleSearch(query)}
                  disabled={isSearching || !query.trim()}
                  className="h-8 px-3"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Search Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10 mt-1 max-h-80 overflow-y-auto"
              >
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-muted-foreground">
                        {suggestion.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{suggestion.query}</span>
                          {suggestion.trending && (
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="h-2 w-2 mr-1" />
                              Trending
                            </Badge>
                          )}
                          {suggestion.personalized && (
                            <Badge variant="outline" className="text-xs">
                              <Sparkles className="h-2 w-2 mr-1" />
                              For You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.description}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          {!query && (
            <div className="mt-3">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Smart Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.slice(0, 5).map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center space-x-1"
                  >
                    {suggestion.icon}
                    <span>{suggestion.query}</span>
                    {suggestion.trending && (
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {selectedFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleFilter(filter)}
                >
                  {filter}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Search Analytics */}
        {searchAnalytics && (
          <div className="p-4 border-b bg-muted/10">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span>
                  <span className="font-medium">{searchAnalytics.totalResults}</span> results
                </span>
                <span className="text-muted-foreground">
                  in {searchAnalytics.searchTime}ms
                </span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{Math.round(searchAnalytics.confidence * 100)}% confidence</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  Intent: {searchAnalytics.queryUnderstanding.intent}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Sentiment: {searchAnalytics.queryUnderstanding.sentiment}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 grid w-fit grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="properties">Hotels</TabsTrigger>
              <TabsTrigger value="pois">Attractions</TabsTrigger>
              <TabsTrigger value="experiences">Experiences</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value={activeTab} className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                          <p className="text-muted-foreground">AI is searching and analyzing...</p>
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults
                          .filter(result => activeTab === 'all' || result.type === activeTab.slice(0, -1))
                          .map((result) => (
                            <ResultCard key={result.id} result={result} />
                          ))}
                      </>
                    ) : query ? (
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No results found</h3>
                        <p className="text-muted-foreground mb-4">
                          Try adjusting your search or removing some filters
                        </p>
                        {searchAnalytics?.suggestions.alternatives.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Did you mean:</p>
                            {searchAnalytics.suggestions.alternatives.slice(0, 3).map((alt, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSearch(alt)}
                              >
                                {alt}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">AI-Powered Search</h3>
                        <p className="text-muted-foreground">
                          Start typing to get intelligent suggestions and personalized results
                        </p>
                      </div>
                    )}
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
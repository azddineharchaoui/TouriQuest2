import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Brain,
  FileText,
  Globe,
  Cloud,
  CreditCard as Passport,
  TrendingUp,
  Search,
  Filter,
  Download,
  Loader2,
  X,
  Eye,
  Languages,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Heart,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  Bookmark,
  Share2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';

interface ContentAnalysisSystemProps {
  onClose: () => void;
}

interface AnalysisResult {
  id: string;
  type: 'guide' | 'review' | 'news' | 'weather' | 'visa' | 'general';
  originalContent: string;
  summary: string;
  keyPoints: string[];
  entities: {
    locations: Array<{ name: string; confidence: number; coordinates?: { lat: number; lng: number } }>;
    dates: Array<{ date: string; context: string; confidence: number }>;
    prices: Array<{ amount: number; currency: string; context: string; confidence: number }>;
    preferences: Array<{ category: string; items: string[]; confidence: number }>;
    groupDetails: Array<{ type: string; size: number; details: string; confidence: number }>;
    organizations: Array<{ name: string; type: string; confidence: number }>;
    activities: Array<{ name: string; category: string; confidence: number }>;
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    aspects: Array<{ aspect: string; sentiment: string; confidence: number }>;
  };
  actionableInsights: Array<{
    type: 'recommendation' | 'warning' | 'opportunity' | 'requirement';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    action?: string;
  }>;
  metadata: {
    processingTime: number;
    language: string;
    readability: number;
    reliability: number;
    lastUpdated: Date;
    sourceType: string;
  };
}

interface SummarizationRequest {
  content: string;
  type: 'guide' | 'review' | 'news' | 'weather' | 'visa' | 'general';
  summaryLength: 'brief' | 'detailed' | 'comprehensive';
  focus?: Array<'locations' | 'dates' | 'prices' | 'activities' | 'requirements'>;
  targetAudience: 'general' | 'family' | 'business' | 'adventure' | 'luxury';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function ContentAnalysisSystem({ onClose }: ContentAnalysisSystemProps) {
  const [activeTab, setActiveTab] = useState('summarize');
  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<'guide' | 'review' | 'news' | 'weather' | 'visa' | 'general'>('general');
  const [summaryLength, setSummaryLength] = useState<'brief' | 'detailed' | 'comprehensive'>('detailed');
  const [targetAudience, setTargetAudience] = useState<'general' | 'family' | 'business' | 'adventure' | 'luxury'>('general');
  const [focusAreas, setFocusAreas] = useState<Array<'locations' | 'dates' | 'prices' | 'activities' | 'requirements'>>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<AnalysisResult[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Filter results based on search query
    if (searchQuery.trim()) {
      const filtered = analysisResults.filter(result =>
        result.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.keyPoints.some(point => point.toLowerCase().includes(searchQuery.toLowerCase())) ||
        result.entities.locations.some(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredResults(filtered);
    } else {
      setFilteredResults(analysisResults);
    }
  }, [searchQuery, analysisResults]);

  // Advanced Content Summarization API
  const summarizeContent = async (request: SummarizationRequest): Promise<AnalysisResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          content: request.content,
          type: request.type,
          summaryLength: request.summaryLength,
          focus: request.focus,
          targetAudience: request.targetAudience,
          extractEntities: true,
          analyzeSentiment: true,
          generateInsights: true,
          includeMetadata: true
        })
      });

      if (!response.ok) {
        throw new Error('Summarization failed');
      }

      const result = await response.json();
      
      return {
        id: `analysis_${Date.now()}`,
        type: request.type,
        originalContent: request.content,
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        entities: result.entities || {
          locations: [],
          dates: [],
          prices: [],
          preferences: [],
          groupDetails: [],
          organizations: [],
          activities: []
        },
        sentiment: result.sentiment || {
          overall: 'neutral',
          confidence: 0,
          aspects: []
        },
        actionableInsights: result.insights || [],
        metadata: {
          processingTime: result.processingTime || 0,
          language: result.language || 'en',
          readability: result.readability || 0,
          reliability: result.reliability || 0,
          lastUpdated: new Date(),
          sourceType: result.sourceType || 'user-input'
        }
      };
    } catch (error) {
      console.error('Content summarization error:', error);
      throw new Error('Failed to analyze content. Please try again.');
    }
  };

  // Advanced Entity Extraction API
  const extractEntities = async (content: string, options?: {
    types?: Array<'locations' | 'dates' | 'prices' | 'preferences' | 'group_details'>;
    context?: string;
    includeCoordinates?: boolean;
  }): Promise<AnalysisResult['entities']> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/extract/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text: content,
          extractTypes: options?.types || ['locations', 'dates', 'prices', 'preferences', 'group_details'],
          context: options?.context || 'travel-planning',
          includeCoordinates: options?.includeCoordinates || true,
          confidence_threshold: 0.7,
          language: 'auto-detect',
          culturalContext: true
        })
      });

      if (!response.ok) {
        throw new Error('Entity extraction failed');
      }

      const result = await response.json();
      return result.entities;
    } catch (error) {
      console.error('Entity extraction error:', error);
      return {
        locations: [],
        dates: [],
        prices: [],
        preferences: [],
        groupDetails: [],
        organizations: [],
        activities: []
      };
    }
  };

  // Handle content analysis
  const handleAnalyzeContent = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const request: SummarizationRequest = {
        content: inputText,
        type: selectedContentType,
        summaryLength,
        focus: focusAreas.length > 0 ? focusAreas : undefined,
        targetAudience
      };

      const result = await summarizeContent(request);
      setAnalysisResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      setRecentAnalyses(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 for recent
      setInputText('');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload for content analysis
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedContentType);
      formData.append('summaryLength', summaryLength);
      formData.append('targetAudience', targetAudience);

      const response = await fetch(`${API_BASE_URL}/ai/summarize/file`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('File analysis failed');
      }

      const result = await response.json();
      const analysisResult: AnalysisResult = {
        id: `file_analysis_${Date.now()}`,
        type: selectedContentType,
        originalContent: `File: ${file.name}`,
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        entities: result.entities || {
          locations: [], dates: [], prices: [], preferences: [], 
          groupDetails: [], organizations: [], activities: []
        },
        sentiment: result.sentiment || { overall: 'neutral', confidence: 0, aspects: [] },
        actionableInsights: result.insights || [],
        metadata: {
          processingTime: result.processingTime || 0,
          language: result.language || 'en',
          readability: result.readability || 0,
          reliability: result.reliability || 0,
          lastUpdated: new Date(),
          sourceType: `file-${file.type}`
        }
      };

      setAnalysisResults(prev => [analysisResult, ...prev.slice(0, 9)]);
      setRecentAnalyses(prev => [analysisResult, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('File analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Entity extraction only
  const handleExtractEntities = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const entities = await extractEntities(inputText, {
        types: focusAreas.length > 0 ? focusAreas.filter(f => f !== 'activities') as any : undefined,
        context: 'travel-content-analysis',
        includeCoordinates: true
      });

      const result: AnalysisResult = {
        id: `entity_extraction_${Date.now()}`,
        type: 'general',
        originalContent: inputText,
        summary: `Entity extraction completed. Found ${entities.locations?.length || 0} locations, ${entities.dates?.length || 0} dates, ${entities.prices?.length || 0} prices.`,
        keyPoints: [],
        entities,
        sentiment: { overall: 'neutral', confidence: 0, aspects: [] },
        actionableInsights: [],
        metadata: {
          processingTime: 0,
          language: 'auto-detected',
          readability: 0,
          reliability: 0,
          lastUpdated: new Date(),
          sourceType: 'entity-extraction'
        }
      };

      setAnalysisResults(prev => [result, ...prev.slice(0, 9)]);
      setInputText('');
    } catch (error) {
      console.error('Entity extraction failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle focus area
  const toggleFocusArea = (area: 'locations' | 'dates' | 'prices' | 'activities' | 'requirements') => {
    setFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(f => f !== area)
        : [...prev, area]
    );
  };

  // Content type icons
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <FileText className="h-4 w-4" />;
      case 'review': return <Star className="h-4 w-4" />;
      case 'news': return <Globe className="h-4 w-4" />;
      case 'weather': return <Cloud className="h-4 w-4" />;
      case 'visa': return <Passport className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  // Sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Priority color for insights
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">AI Content Analysis & Summarization</h2>
              <p className="text-sm text-muted-foreground">
                Analyze and extract insights from travel guides, reviews, news, and documents
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summarize" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Summarize Content</span>
              </TabsTrigger>
              <TabsTrigger value="extract" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Extract Entities</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Results ({analysisResults.length})</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              <TabsContent value="summarize" className="h-full flex flex-col space-y-4">
                {/* Content Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5" />
                      <span>Content Summarization</span>
                    </CardTitle>
                    <CardDescription>
                      Paste text or upload a document to get AI-powered summaries and insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Content Type</label>
                        <select
                          value={selectedContentType}
                          onChange={(e) => setSelectedContentType(e.target.value as any)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="general">General Content</option>
                          <option value="guide">Travel Guide</option>
                          <option value="review">Reviews</option>
                          <option value="news">News Article</option>
                          <option value="weather">Weather Report</option>
                          <option value="visa">Visa Requirements</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Summary Length</label>
                        <select
                          value={summaryLength}
                          onChange={(e) => setSummaryLength(e.target.value as any)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="brief">Brief (1-2 sentences)</option>
                          <option value="detailed">Detailed (paragraph)</option>
                          <option value="comprehensive">Comprehensive (multiple points)</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Audience</label>
                        <select
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value as any)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="general">General Travelers</option>
                          <option value="family">Families</option>
                          <option value="business">Business Travelers</option>
                          <option value="adventure">Adventure Seekers</option>
                          <option value="luxury">Luxury Travelers</option>
                        </select>
                      </div>
                    </div>

                    {/* Focus Areas */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Focus Areas (Optional)</label>
                      <div className="flex flex-wrap gap-2">
                        {(['locations', 'dates', 'prices', 'activities', 'requirements'] as const).map(area => (
                          <Button
                            key={area}
                            variant={focusAreas.includes(area) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleFocusArea(area)}
                            className="text-xs"
                          >
                            {area === 'locations' && <MapPin className="h-3 w-3 mr-1" />}
                            {area === 'dates' && <Calendar className="h-3 w-3 mr-1" />}
                            {area === 'prices' && <DollarSign className="h-3 w-3 mr-1" />}
                            {area === 'activities' && <Heart className="h-3 w-3 mr-1" />}
                            {area === 'requirements' && <Info className="h-3 w-3 mr-1" />}
                            {area.charAt(0).toUpperCase() + area.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Text Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content to Analyze</label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your travel content here (guides, reviews, articles, etc.)..."
                        className="w-full h-32 p-3 border rounded resize-none text-sm"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Upload File</span>
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="text-xs text-muted-foreground">
                        Supports: TXT, PDF, DOC, DOCX (max 10MB)
                      </span>
                    </div>

                    {/* Analyze Button */}
                    <Button
                      onClick={handleAnalyzeContent}
                      disabled={!inputText.trim() || isAnalyzing}
                      className="w-full"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing Content...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Analyze & Summarize
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="extract" className="h-full flex flex-col space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Entity Extraction</span>
                    </CardTitle>
                    <CardDescription>
                      Extract specific information like locations, dates, prices, and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Entity Types Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Extract These Entities</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(['locations', 'dates', 'prices', 'activities', 'requirements'] as const).map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={focusAreas.includes(type)}
                              onChange={() => toggleFocusArea(type)}
                              className="rounded"
                            />
                            <span className="text-sm">
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Text Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Text to Analyze</label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter text to extract entities from..."
                        className="w-full h-32 p-3 border rounded resize-none text-sm"
                      />
                    </div>

                    <Button
                      onClick={handleExtractEntities}
                      disabled={!inputText.trim() || isAnalyzing}
                      className="w-full"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting Entities...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Extract Entities
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="h-full flex flex-col space-y-4">
                {/* Search and Filter */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search analysis results..."
                      className="w-full"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Results */}
                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => (
                        <Card key={result.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getContentTypeIcon(result.type)}
                                <div>
                                  <CardTitle className="text-base">
                                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)} Analysis
                                  </CardTitle>
                                  <CardDescription>
                                    {new Date(result.metadata.lastUpdated).toLocaleString()}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge variant="outline" className={getSentimentColor(result.sentiment.overall)}>
                                {result.sentiment.overall} ({Math.round(result.sentiment.confidence * 100)}%)
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Summary */}
                            <div>
                              <h4 className="font-medium mb-2">Summary</h4>
                              <p className="text-sm text-muted-foreground">{result.summary}</p>
                            </div>

                            {/* Key Points */}
                            {result.keyPoints.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Key Points</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {result.keyPoints.map((point, index) => (
                                    <li key={index}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Entities */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {result.entities.locations.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-sm mb-2 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Locations
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {result.entities.locations.slice(0, 3).map((location, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {location.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {result.entities.dates.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-sm mb-2 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Dates
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {result.entities.dates.slice(0, 3).map((date, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {date.date}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {result.entities.prices.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-sm mb-2 flex items-center">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Prices
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {result.entities.prices.slice(0, 3).map((price, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {price.amount} {price.currency}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actionable Insights */}
                            {result.actionableInsights.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Actionable Insights</h4>
                                <div className="space-y-2">
                                  {result.actionableInsights.slice(0, 3).map((insight, index) => (
                                    <div key={index} className={`p-3 rounded-lg border ${getPriorityColor(insight.priority)}`}>
                                      <div className="flex items-start justify-between mb-1">
                                        <h5 className="font-medium text-sm">{insight.title}</h5>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            insight.priority === 'high' ? 'border-red-300 text-red-700' :
                                            insight.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                            'border-gray-300 text-gray-700'
                                          }`}
                                        >
                                          {insight.priority} priority
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>Processing: {result.metadata.processingTime}ms</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span>Reliability: {Math.round(result.metadata.reliability * 100)}%</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Bookmark className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Share2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No analysis results yet.</p>
                        <p className="text-sm">Start by analyzing some content in the other tabs.</p>
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
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Globe,
  BookOpen,
  Newspaper,
  MapPin,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  BarChart3,
  PieChart,
  Eye,
  EyeOff,
  Download,
  Share2,
  Bookmark,
  Heart,
  Copy,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Zap,
  Brain,
  Lightbulb,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Mic,
  Camera,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Hash,
  Percent,
  DollarSign,
  Users,
  Plane,
  Hotel,
  Car,
  Activity,
  Utensils,
  Coffee,
  ShoppingBag,
  Wifi,
  Phone,
  Mail,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Shield,
  Award,
  Layers,
  Grid,
  List,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';

interface ContentSummarizationProps {
  onClose: () => void;
  initialContent?: ContentItem[];
  userProfile?: UserProfile;
}

interface UserProfile {
  id: string;
  preferences: {
    summaryLength: 'brief' | 'detailed' | 'comprehensive';
    languages: string[];
    topics: string[];
    sources: string[];
    autoSummarize: boolean;
  };
  readingHistory: ReadingSession[];
  savedSummaries: Summary[];
}

interface ContentItem {
  id: string;
  type: 'article' | 'guide' | 'review' | 'news' | 'blog' | 'research' | 'report' | 'document' | 'webpage' | 'video' | 'podcast';
  title: string;
  url?: string;
  content: string;
  author?: string;
  source: string;
  publishedAt: Date;
  language: string;
  topics: string[];
  metadata: ContentMetadata;
  summary?: Summary;
  isProcessing?: boolean;
  readingTime?: number;
  wordCount: number;
}

interface ContentMetadata {
  category: string;
  location?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  credibility: number;
  popularity: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  entities: Entity[];
  images?: string[];
  videos?: string[];
}

interface Entity {
  type: 'person' | 'place' | 'organization' | 'event' | 'product' | 'service';
  name: string;
  confidence: number;
  description?: string;
  wikiUrl?: string;
}

interface Summary {
  id: string;
  contentId: string;
  type: 'extractive' | 'abstractive' | 'hybrid';
  length: 'brief' | 'detailed' | 'comprehensive';
  content: string;
  keyPoints: string[];
  highlights: Highlight[];
  insights: Insight[];
  questions: string[];
  relatedTopics: string[];
  confidence: number;
  readingTime: number;
  createdAt: Date;
  feedback?: SummaryFeedback;
  versions?: Summary[];
}

interface Highlight {
  text: string;
  importance: 'high' | 'medium' | 'low';
  type: 'fact' | 'opinion' | 'statistic' | 'quote' | 'recommendation';
  context?: string;
  sourceLocation?: number;
}

interface Insight {
  type: 'trend' | 'comparison' | 'conclusion' | 'prediction' | 'recommendation' | 'warning';
  title: string;
  description: string;
  confidence: number;
  supporting_evidence: string[];
  implications: string[];
}

interface SummaryFeedback {
  accuracy: number;
  completeness: number;
  clarity: number;
  usefulness: number;
  comments?: string;
  timestamp: Date;
}

interface ReadingSession {
  id: string;
  contentId: string;
  startTime: Date;
  endTime?: Date;
  progress: number;
  bookmarks: number[];
  notes: string[];
}

interface SummarizationRequest {
  content?: string;
  url?: string;
  length: 'brief' | 'detailed' | 'comprehensive';
  focus?: string[];
  language?: string;
  includeInsights?: boolean;
  includeQuestions?: boolean;
}

interface BatchSummaryJob {
  id: string;
  items: ContentItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: Summary[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function IntelligentContentSummarization({ onClose, initialContent = [], userProfile }: ContentSummarizationProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>(initialContent);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [summaryLength, setSummaryLength] = useState<'brief' | 'detailed' | 'comprehensive'>('detailed');
  const [batchJobs, setBatchJobs] = useState<BatchSummaryJob[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newContentForm, setNewContentForm] = useState({
    url: '',
    text: '',
    type: 'article' as ContentItem['type'],
    focus: [] as string[]
  });

  // Load saved content and summaries
  useEffect(() => {
    loadSavedContent();
    loadSummaries();
  }, []);

  const loadSavedContent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/content/saved`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContentItems(prev => [...prev, ...(data.content || [])]);
      }
    } catch (error) {
      console.error('Failed to load saved content:', error);
    }
  };

  const loadSummaries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/summaries`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Failed to load summaries:', error);
    }
  };

  const summarizeContent = async (item: ContentItem, options: Partial<SummarizationRequest> = {}) => {
    setIsLoading(true);
    
    // Update item processing state
    setContentItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, isProcessing: true } : i
    ));

    try {
      const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          contentId: item.id,
          content: item.content,
          url: item.url,
          title: item.title,
          type: item.type,
          length: options.length || summaryLength,
          focus: options.focus || [],
          language: options.language || item.language,
          includeInsights: true,
          includeQuestions: true,
          metadata: item.metadata
        })
      });

      if (response.ok) {
        const data = await response.json();
        const summary: Summary = {
          id: data.id,
          contentId: item.id,
          type: data.type,
          length: data.length,
          content: data.summary,
          keyPoints: data.keyPoints || [],
          highlights: data.highlights || [],
          insights: data.insights || [],
          questions: data.questions || [],
          relatedTopics: data.relatedTopics || [],
          confidence: data.confidence || 0.95,
          readingTime: data.readingTime || 0,
          createdAt: new Date()
        };

        setSummaries(prev => [summary, ...prev]);
        setActiveSummary(summary);
        
        // Update content item with summary
        setContentItems(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, summary, isProcessing: false, readingTime: data.originalReadingTime }
            : i
        ));

        // Switch to summary tab
        setActiveTab('summary');
      }
    } catch (error) {
      console.error('Failed to summarize content:', error);
      
      // Update item processing state
      setContentItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, isProcessing: false } : i
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const batchSummarize = async (items: ContentItem[]) => {
    const jobId = Date.now().toString();
    const job: BatchSummaryJob = {
      id: jobId,
      items,
      status: 'processing',
      progress: 0,
      results: [],
      createdAt: new Date()
    };

    setBatchJobs(prev => [job, ...prev]);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/summarize/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            content: item.content,
            url: item.url,
            title: item.title,
            type: item.type
          })),
          length: summaryLength,
          includeInsights: true,
          includeQuestions: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Poll for progress
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/ai/summarize/batch/${data.jobId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              setBatchJobs(prev => prev.map(j => 
                j.id === jobId ? {
                  ...j,
                  status: statusData.status,
                  progress: statusData.progress,
                  results: statusData.results || [],
                  completedAt: statusData.completedAt ? new Date(statusData.completedAt) : undefined,
                  error: statusData.error
                } : j
              ));

              if (statusData.status === 'completed' || statusData.status === 'failed') {
                clearInterval(pollInterval);
                
                if (statusData.status === 'completed') {
                  setSummaries(prev => [...(statusData.results || []), ...prev]);
                }
              }
            }
          } catch (error) {
            console.error('Failed to poll batch job status:', error);
            clearInterval(pollInterval);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to start batch summarization:', error);
      setBatchJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'failed', error: 'Failed to start job' } : j
      ));
    }
  };

  const addContentFromUrl = async (url: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/content/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        const newItem: ContentItem = {
          id: data.id || Date.now().toString(),
          type: data.type || 'webpage',
          title: data.title,
          url,
          content: data.content,
          author: data.author,
          source: data.source,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
          language: data.language || 'en',
          topics: data.topics || [],
          metadata: data.metadata || {
            category: 'general',
            difficulty: 'intermediate',
            credibility: 0.8,
            popularity: 0.5,
            sentiment: 'neutral',
            keywords: [],
            entities: []
          },
          wordCount: data.wordCount || 0,
          readingTime: data.readingTime || 0
        };

        setContentItems(prev => [newItem, ...prev]);
        setSelectedContent(newItem);
        setShowAddContent(false);
        setNewContentForm({ url: '', text: '', type: 'article', focus: [] });

        // Auto-summarize if enabled
        if (userProfile?.preferences.autoSummarize) {
          summarizeContent(newItem);
        }
      }
    } catch (error) {
      console.error('Failed to extract content from URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addContentFromText = async (text: string, type: ContentItem['type']) => {
    const newItem: ContentItem = {
      id: Date.now().toString(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${new Date().toLocaleDateString()}`,
      content: text,
      source: 'User Input',
      publishedAt: new Date(),
      language: 'en',
      topics: [],
      metadata: {
        category: 'user_content',
        difficulty: 'intermediate',
        credibility: 1.0,
        popularity: 0.0,
        sentiment: 'neutral',
        keywords: [],
        entities: []
      },
      wordCount: text.split(' ').length,
      readingTime: Math.ceil(text.split(' ').length / 200)
    };

    setContentItems(prev => [newItem, ...prev]);
    setSelectedContent(newItem);
    setShowAddContent(false);
    setNewContentForm({ url: '', text: '', type: 'article', focus: [] });

    // Auto-summarize
    summarizeContent(newItem);
  };

  const provideFeedback = async (summaryId: string, feedback: Partial<SummaryFeedback>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/summaries/${summaryId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...feedback,
          timestamp: new Date()
        })
      });

      if (response.ok) {
        setSummaries(prev => prev.map(s => 
          s.id === summaryId 
            ? { ...s, feedback: { ...s.feedback, ...feedback, timestamp: new Date() } }
            : s
        ));
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const speakSummary = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackRate;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  // Filter and search content
  const filteredContent = useMemo(() => {
    return contentItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTopic = !filterTopic || 
        item.topics.some(topic => topic.toLowerCase().includes(filterTopic.toLowerCase())) ||
        item.metadata.category.toLowerCase().includes(filterTopic.toLowerCase());

      return matchesSearch && matchesTopic;
    });
  }, [contentItems, searchQuery, filterTopic]);

  // Get unique topics for filtering
  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    contentItems.forEach(item => {
      item.topics.forEach(topic => topics.add(topic));
      topics.add(item.metadata.category);
    });
    return Array.from(topics);
  }, [contentItems]);

  // Content Item Card Component
  const ContentCard = ({ item }: { item: ContentItem }) => (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${selectedContent?.id === item.id ? 'ring-2 ring-primary' : ''}`}
      onClick={() => setSelectedContent(item)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {item.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {item.language}
              </Badge>
              {item.summary && (
                <Badge variant="default" className="text-xs">
                  <Sparkles className="h-2 w-2 mr-1" />
                  Summarized
                </Badge>
              )}
            </div>
            
            <CardTitle className="text-sm font-medium line-clamp-2">
              {item.title}
            </CardTitle>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
              {item.author && <span>By {item.author}</span>}
              <span>{item.source}</span>
              <span>{item.publishedAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {item.isProcessing ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {!item.summary ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      summarizeContent(item);
                    }}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    Summarize
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSummary(item.summary!);
                      setActiveTab('summary');
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
                
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newSelected = new Set(selectedItems);
                    if (e.target.checked) {
                      newSelected.add(item.id);
                    } else {
                      newSelected.delete(item.id);
                    }
                    setSelectedItems(newSelected);
                  }}
                  className="rounded"
                />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {item.content.substring(0, 200)}...
        </p>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{item.wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{item.readingTime} min read</span>
            </div>
            {item.summary && (
              <div className="flex items-center space-x-1 text-green-600">
                <Zap className="h-3 w-3" />
                <span>{item.summary.readingTime} min summary</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-500 fill-current" />
            <span>{Math.round(item.metadata.credibility * 5)}/5</span>
          </div>
        </div>
        
        {item.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
            {item.topics.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.topics.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Summary Display Component
  const SummaryDisplay = ({ summary }: { summary: Summary }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg">Summary</h3>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <Badge variant="outline">{summary.type}</Badge>
            <Badge variant="outline">{summary.length}</Badge>
            <span>{summary.readingTime} min read</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>{Math.round(summary.confidence * 100)}% confidence</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => audioEnabled ? speakSummary(summary.content) : setAudioEnabled(true)}
          >
            {isPlaying ? (
              <VolumeX className="h-3 w-3 mr-1" />
            ) : (
              <Headphones className="h-3 w-3 mr-1" />
            )}
            {isPlaying ? 'Stop' : 'Listen'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(summary.content)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          
          <Button variant="outline" size="sm">
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed">
              {summary.content}
            </div>
          </div>
        </CardContent>
      </Card>

      {summary.keyPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Key Points</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {summary.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Highlights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.highlights.map((highlight, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {highlight.type}
                    </Badge>
                    <Badge 
                      variant={highlight.importance === 'high' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {highlight.importance}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{highlight.text}</p>
                  {highlight.context && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Context: {highlight.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4" />
              <span>AI Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.insights.map((insight, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {insight.type}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs">{Math.round(insight.confidence * 100)}% confidence</span>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm mb-2">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  
                  {insight.supporting_evidence.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium">Evidence:</span>
                      <ul className="text-xs text-muted-foreground ml-4 list-disc">
                        {insight.supporting_evidence.slice(0, 2).map((evidence, i) => (
                          <li key={i}>{evidence}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insight.implications.length > 0 && (
                    <div>
                      <span className="text-xs font-medium">Implications:</span>
                      <ul className="text-xs text-muted-foreground ml-4 list-disc">
                        {insight.implications.slice(0, 2).map((implication, i) => (
                          <li key={i}>{implication}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Discussion Questions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.questions.map((question, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">?</span>
                  </div>
                  <span className="text-sm">{question}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ThumbsUp className="h-4 w-4" />
            <span>Rate This Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['accuracy', 'completeness', 'clarity', 'usefulness'].map((aspect) => (
              <div key={aspect} className="text-center">
                <label className="text-sm font-medium capitalize mb-2 block">{aspect}</label>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      className="w-6 h-6 text-yellow-400 hover:text-yellow-500"
                      onClick={() => provideFeedback(summary.id, { [aspect]: rating })}
                    >
                      <Star className={`h-4 w-4 ${
                        (summary.feedback?.[aspect as keyof SummaryFeedback] as number) >= rating 
                          ? 'fill-current' 
                          : ''
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
                <AvatarFallback className="bg-primary text-white">
                  <Brain className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">Intelligent Content Summarization</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <span>{contentItems.length} items</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{summaries.length} summaries</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>AI-powered insights</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedItems.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const items = contentItems.filter(item => selectedItems.has(item.id));
                    batchSummarize(items);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>Summarize Selected ({selectedItems.size})</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => setShowAddContent(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Content</span>
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
            <TabsList className="mx-4 mt-4 grid w-fit grid-cols-4">
              <TabsTrigger value="content">Content ({contentItems.length})</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="batch">Batch Jobs</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="content" className="h-full m-0">
                <div className="h-full flex">
                  {/* Content List */}
                  <div className="w-1/2 border-r">
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search content..."
                            className="pl-8"
                          />
                        </div>
                        
                        <select
                          value={filterTopic}
                          onChange={(e) => setFilterTopic(e.target.value)}
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">All Topics</option>
                          {availableTopics.map((topic) => (
                            <option key={topic} value={topic}>{topic}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {filteredContent.length} items
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          <label className="text-sm">Summary length:</label>
                          <select
                            value={summaryLength}
                            onChange={(e) => setSummaryLength(e.target.value as any)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="brief">Brief</option>
                            <option value="detailed">Detailed</option>
                            <option value="comprehensive">Comprehensive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      <div className="p-4 space-y-4">
                        {filteredContent.map((item) => (
                          <ContentCard key={item.id} item={item} />
                        ))}
                        {filteredContent.length === 0 && (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-medium mb-2">No Content Found</h3>
                            <p className="text-muted-foreground mb-4">
                              Add content to start creating AI-powered summaries
                            </p>
                            <Button onClick={() => setShowAddContent(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Content
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Content Detail */}
                  <div className="w-1/2">
                    {selectedContent ? (
                      <div className="h-full flex flex-col">
                        <div className="p-4 border-b">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium mb-2">{selectedContent.title}</h3>
                              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                <span>{selectedContent.source}</span>
                                {selectedContent.author && <span>by {selectedContent.author}</span>}
                                <span>{selectedContent.publishedAt.toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            {!selectedContent.summary && !selectedContent.isProcessing && (
                              <Button
                                onClick={() => summarizeContent(selectedContent)}
                                className="flex items-center space-x-2"
                              >
                                <Brain className="h-4 w-4" />
                                <span>Summarize</span>
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <ScrollArea className="flex-1 p-4">
                          {selectedContent.isProcessing ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                              <h3 className="font-medium mb-2">Processing Content</h3>
                              <p className="text-muted-foreground">
                                Creating intelligent summary with AI insights...
                              </p>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <div className="whitespace-pre-wrap">
                                {selectedContent.content}
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">Select Content</h3>
                          <p className="text-muted-foreground">
                            Choose an item from the list to view details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {activeSummary ? (
                      <SummaryDisplay summary={activeSummary} />
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No Summary Selected</h3>
                        <p className="text-muted-foreground">
                          Create or select a summary to view AI-powered insights
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="batch" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="space-y-4">
                      {batchJobs.map((job) => (
                        <Card key={job.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Batch Job #{job.id.slice(-6)}</span>
                              <Badge 
                                variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'failed' ? 'destructive' :
                                  job.status === 'processing' ? 'secondary' : 'outline'
                                }
                              >
                                {job.status}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {job.items.length} items • {job.createdAt.toLocaleString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {job.status === 'processing' && (
                              <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Progress</span>
                                  <span>{job.progress}%</span>
                                </div>
                                <Progress value={job.progress} className="h-2" />
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                {job.results.length} summaries completed
                              </div>
                              
                              {job.status === 'completed' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSummaries(prev => [...job.results, ...prev]);
                                    setActiveTab('summary');
                                  }}
                                >
                                  View Results
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {batchJobs.length === 0 && (
                        <div className="text-center py-12">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Batch Jobs</h3>
                          <p className="text-muted-foreground">
                            Select multiple items and batch summarize to see jobs here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="saved" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summaries.map((summary) => (
                        <Card 
                          key={summary.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setActiveSummary(summary);
                            setActiveTab('summary');
                          }}
                        >
                          <CardHeader>
                            <CardTitle className="text-sm">
                              {contentItems.find(item => item.id === summary.contentId)?.title || 'Unknown Content'}
                            </CardTitle>
                            <CardDescription className="flex items-center justify-between">
                              <span>{summary.createdAt.toLocaleDateString()}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{summary.type}</Badge>
                                <Badge variant="secondary">{summary.length}</Badge>
                              </div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {summary.content.substring(0, 150)}...
                            </p>
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <span>{summary.readingTime} min read</span>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>{Math.round(summary.confidence * 100)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Add Content Modal */}
        {showAddContent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Add Content to Summarize</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddContent(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">From URL</TabsTrigger>
                    <TabsTrigger value="text">From Text</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Content URL
                      </label>
                      <Input
                        value={newContentForm.url}
                        onChange={(e) => setNewContentForm(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://example.com/article..."
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Content Type
                      </label>
                      <select
                        value={newContentForm.type}
                        onChange={(e) => setNewContentForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="article">Article</option>
                        <option value="guide">Guide</option>
                        <option value="review">Review</option>
                        <option value="news">News</option>
                        <option value="blog">Blog Post</option>
                        <option value="research">Research</option>
                        <option value="document">Document</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Content Text
                      </label>
                      <Textarea
                        value={newContentForm.text}
                        onChange={(e) => setNewContentForm(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="Paste your content here..."
                        rows={6}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="p-4 border-t flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddContent(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newContentForm.url) {
                      addContentFromUrl(newContentForm.url);
                    } else if (newContentForm.text) {
                      addContentFromText(newContentForm.text, newContentForm.type);
                    }
                  }}
                  disabled={!newContentForm.url && !newContentForm.text || isLoading}
                >
                  {isLoading ? 'Processing...' : 'Add & Summarize'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Controls */}
        {audioEnabled && (
          <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 border rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs">Speed:</span>
                <Slider
                  value={[playbackRate]}
                  onValueChange={(value) => setPlaybackRate(value[0])}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-20"
                />
                <span className="text-xs">{playbackRate}x</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAudioEnabled(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
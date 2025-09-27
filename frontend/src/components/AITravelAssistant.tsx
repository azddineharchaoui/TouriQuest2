import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plane,
  Hotel,
  Car,
  Activity,
  Camera,
  Utensils,
  Coffee,
  ShoppingBag,
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Clock,
  Globe,
  Wifi,
  Phone,
  Mail,
  ExternalLink,
  Download,
  Share2,
  Bookmark,
  Heart,
  Star,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
  Copy,
  Edit3,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  Navigation,
  Compass,
  Map,
  Route,
  Flag,
  Eye,
  Filter,
  Search,
  ImageIcon,
  FileText,
  Link,
  Paperclip,
  Smile,
  Frown,
  Meh
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

interface AITravelAssistantProps {
  onClose: () => void;
  userProfile?: UserProfile;
  currentTrip?: TripContext;
}

interface Trip {
  id: string;
  destination: string;
  dates: { start: Date; end: Date };
  travelers: number;
  purpose: string;
  status: 'planned' | 'completed' | 'cancelled';
  experiences: Experience[];
}

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  duration: number;
  activities: Activity[];
  createdAt: Date;
  isPublic: boolean;
}

interface Experience {
  type: 'flight' | 'hotel' | 'activity' | 'restaurant' | 'transportation';
  name: string;
  location: string;
  rating?: number;
  cost: number;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  duration: number;
  location: string;
  time?: string;
  description?: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  preferences: {
    destinations: string[];
    travelStyle: string[];
    budget: { min: number; max: number };
    activities: string[];
    accommodations: string[];
    transportation: string[];
    dietary: string[];
    accessibility: string[];
  };
  travelHistory: Trip[];
  savedItineraries: Itinerary[];
}

interface TripContext {
  id?: string;
  destination?: string;
  dates?: { start: Date; end: Date; flexible: boolean };
  travelers?: number;
  budget?: number;
  purpose?: string;
  preferences?: string[];
  currentPlanning?: PlanningState;
}

interface PlanningState {
  phase: 'discovery' | 'planning' | 'booking' | 'finalization';
  progress: number;
  completedSteps: string[];
  nextSteps: string[];
  blockers: string[];
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  attachments?: Attachment[];
  suggestions?: Suggestion[];
  actions?: Action[];
  feedback?: Feedback;
}

interface MessageMetadata {
  intent: string;
  confidence: number;
  entities: Entity[];
  context: any;
  responseType: 'text' | 'itinerary' | 'recommendations' | 'booking' | 'media' | 'analysis';
}

interface Entity {
  type: 'location' | 'date' | 'duration' | 'budget' | 'activity' | 'person' | 'accommodation';
  value: string;
  confidence: number;
  resolved?: any;
}

interface Attachment {
  id: string;
  type: 'image' | 'document' | 'link' | 'location' | 'itinerary';
  name: string;
  url: string;
  thumbnail?: string;
  description?: string;
  metadata?: any;
}

interface Suggestion {
  id: string;
  type: 'quick_reply' | 'action' | 'follow_up';
  text: string;
  action?: string;
  data?: any;
  priority: number;
}

interface Action {
  id: string;
  type: 'book' | 'save' | 'share' | 'explore' | 'compare' | 'calculate';
  title: string;
  description: string;
  url?: string;
  handler?: () => void;
  icon?: string;
  priority: 'high' | 'medium' | 'low';
}

interface Feedback {
  helpful: boolean;
  rating?: number;
  comment?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  context: TripContext;
  created: Date;
  updated: Date;
  status: 'active' | 'completed' | 'archived';
  summary?: string;
  bookings?: Booking[];
}

interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'rental' | 'experience' | 'restaurant';
  name: string;
  details: any;
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;
  currency: string;
}

interface SmartResponse {
  content: string;
  confidence: number;
  sources: string[];
  visualizations?: Visualization[];
  recommendations?: Recommendation[];
  alternatives?: Alternative[];
  nextSteps?: string[];
}

interface Visualization {
  type: 'map' | 'chart' | 'timeline' | 'comparison' | 'gallery';
  data: any;
  title: string;
  description?: string;
}

interface Recommendation {
  type: 'destination' | 'activity' | 'accommodation' | 'restaurant' | 'experience';
  item: any;
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  alternatives?: any[];
}

interface Alternative {
  type: string;
  item: any;
  differences: string[];
  pros: string[];
  cons: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AITravelAssistant({ onClose, userProfile, currentTrip }: AITravelAssistantProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [context, setContext] = useState<TripContext>(currentTrip || {});
  const [activeTab, setActiveTab] = useState('chat');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
        };
      }

      // Speech Synthesis
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate contextual suggestions
  useEffect(() => {
    if (messages.length > 0) {
      generateSuggestions();
    }
  }, [messages, context]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/travel-assistant/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        
        // Load or create current conversation
        if (data.conversations.length > 0 && !currentConversation) {
          const activeConv = data.conversations.find((c: Conversation) => c.status === 'active') || data.conversations[0];
          setCurrentConversation(activeConv);
          setMessages(activeConv.messages || []);
          setContext(activeConv.context || {});
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const createNewConversation = async () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Trip Planning',
      messages: [],
      context: currentTrip || {},
      created: new Date(),
      updated: new Date(),
      status: 'active'
    };

    setCurrentConversation(newConversation);
    setMessages([]);
    setContext(newConversation.context);
    
    // Add welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: "Hi! I'm your AI travel planning assistant. I can help you discover destinations, create itineraries, find the best deals, and answer any travel questions. What trip are you planning?",
      timestamp: new Date(),
      suggestions: [
        { id: '1', type: 'quick_reply', text: 'Plan a vacation', action: 'plan_vacation', data: {}, priority: 1 },
        { id: '2', type: 'quick_reply', text: 'Find cheap flights', action: 'find_flights', data: {}, priority: 2 },
        { id: '3', type: 'quick_reply', text: 'Suggest destinations', action: 'suggest_destinations', data: {}, priority: 3 },
        { id: '4', type: 'quick_reply', text: 'Create itinerary', action: 'create_itinerary', data: {}, priority: 4 }
      ]
    };

    setMessages([welcomeMessage]);
  };

  const sendMessage = async (text: string, attachments?: Attachment[]) => {
    if (!text.trim() && !attachments?.length) return;

    setIsLoading(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      attachments
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/travel-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          message: text,
          attachments,
          context,
          conversationId: currentConversation?.id,
          userProfile
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: data.messageId || (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          metadata: data.metadata,
          suggestions: data.suggestions,
          actions: data.actions
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        
        // Update context if provided
        if (data.context) {
          setContext(prev => ({ ...prev, ...data.context }));
        }

        // Speak response if voice is enabled
        if (voiceEnabled && data.response) {
          speakText(data.response);
        }

        // Save conversation
        if (currentConversation) {
          const updatedConversation = {
            ...currentConversation,
            messages: updatedMessages,
            updated: new Date(),
            context: { ...context, ...data.context }
          };
          
          setCurrentConversation(updatedConversation);
          setConversations(prev => 
            prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
          );
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current && voiceEnabled) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.action) {
      switch (suggestion.action) {
        case 'plan_vacation':
          setInputText('I want to plan a vacation. Can you help me choose a destination?');
          break;
        case 'find_flights':
          setInputText('Help me find the cheapest flights for my trip');
          break;
        case 'suggest_destinations':
          setInputText('Suggest some travel destinations based on my preferences');
          break;
        case 'create_itinerary':
          setInputText('Create a detailed itinerary for my trip');
          break;
        default:
          setInputText(suggestion.text);
      }
    } else {
      setInputText(suggestion.text);
    }
    
    inputRef.current?.focus();
  };

  const provideFeedback = async (messageId: string, helpful: boolean, rating?: number, comment?: string) => {
    try {
      await fetch(`${API_BASE_URL}/ai/travel-assistant/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          messageId,
          helpful,
          rating,
          comment,
          conversationId: currentConversation?.id
        })
      });

      // Update message with feedback
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback: { helpful, rating, comment, timestamp: new Date() } }
          : msg
      ));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const generateSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/travel-assistant/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          context,
          recentMessages: messages.slice(-3),
          userProfile
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Message Component
  const MessageBubble = ({ message }: { message: Message }) => (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={message.type === 'user' ? 'bg-primary text-white' : 'bg-blue-100'}>
            {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        
        <div className={`mx-2 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block p-3 rounded-lg ${
            message.type === 'user' 
              ? 'bg-primary text-white' 
              : message.type === 'system'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-muted'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                    <Paperclip className="h-3 w-3" />
                    <span>{attachment.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString()}
            </span>
            
            {message.type === 'assistant' && !message.feedback && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => provideFeedback(message.id, true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => provideFeedback(message.id, false)}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {message.feedback && (
              <div className="flex items-center space-x-1 text-xs">
                {message.feedback.helpful ? (
                  <ThumbsUp className="h-3 w-3 text-green-600" />
                ) : (
                  <ThumbsDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            )}
          </div>

          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.suggestions.slice(0, 3).map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  className="mr-2 mb-1"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.text}
                </Button>
              ))}
            </div>
          )}

          {message.actions && message.actions.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.actions.map((action) => (
                <Card key={action.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{action.title}</h4>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={action.handler || (() => action.url && window.open(action.url, '_blank'))}
                    >
                      {action.type === 'book' ? 'Book Now' : 'View'}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">AI Travel Assistant</h3>
                  <p className="text-xs text-muted-foreground">Your personal travel planner</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={createNewConversation}
              className="w-full flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="p-4">
              <h4 className="font-medium mb-3">Recent Conversations</h4>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`p-3 cursor-pointer hover:shadow-sm transition-shadow ${
                      currentConversation?.id === conv.id ? 'ring-2 ring-primary/50' : ''
                    }`}
                    onClick={() => {
                      setCurrentConversation(conv);
                      setMessages(conv.messages || []);
                      setContext(conv.context || {});
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{conv.title}</h5>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.messages[conv.messages.length - 1]?.content || 'No messages'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {conv.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {conv.updated.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          
          {/* Context Panel */}
          {context && Object.keys(context).length > 0 && (
            <div className="p-4 border-t bg-background">
              <h4 className="font-medium mb-2">Trip Context</h4>
              <div className="space-y-2 text-sm">
                {context.destination && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3" />
                    <span>{context.destination}</span>
                  </div>
                )}
                {context.dates && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {context.dates.start?.toLocaleDateString()} - {context.dates.end?.toLocaleDateString()}
                    </span>
                  </div>
                )}
                {context.travelers && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-3 w-3" />
                    <span>{context.travelers} travelers</span>
                  </div>
                )}
                {context.budget && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-3 w-3" />
                    <span>${context.budget.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b bg-gradient-to-r from-background to-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">
                  {currentConversation?.title || 'Travel Planning Assistant'}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online and ready to help</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={voiceEnabled ? 'text-primary' : ''}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                
                {isSpeaking && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={stopSpeaking}
                  >
                    <VolumeX className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {messages.length === 0 && !currentConversation ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">Welcome to AI Travel Assistant!</h3>
                    <p className="text-muted-foreground mb-4">
                      I'm here to help you plan amazing trips, find the best deals, and answer all your travel questions.
                    </p>
                    <Button onClick={createNewConversation}>
                      Start Planning Your Trip
                    </Button>
                  </div>
                ) : (
                  <div>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start mb-4">
                        <div className="flex max-w-[80%]">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-blue-100">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="mx-2">
                            <div className="inline-block p-3 rounded-lg bg-muted">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-sm text-muted-foreground">Thinking...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Suggestions Bar */}
          {suggestions.length > 0 && (
            <div className="p-2 border-t bg-muted/30">
              <div className="flex items-center space-x-2 overflow-x-auto">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                {suggestions.slice(0, 4).map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex-shrink-0"
                  >
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about travel planning..."
                  className="min-h-[60px] max-h-32 resize-none pr-12"
                  disabled={isLoading}
                />
                
                <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={() => sendMessage(inputText)}
                disabled={(!inputText.trim() && !isLoading) || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>Press Enter to send, Shift+Enter for new line</span>
                {isListening && (
                  <div className="flex items-center space-x-1 text-primary">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Listening...</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
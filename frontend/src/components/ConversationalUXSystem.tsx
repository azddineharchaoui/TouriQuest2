import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Search,
  History,
  Download,
  Share2,
  Copy,
  Bookmark,
  MoreHorizontal,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Map,
  CreditCard,
  Calendar,
  MapPin,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Loader2,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  WifiOff,
  Wifi,
  Clock,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Sparkles,
  RefreshCw,
  Filter,
  Archive,
  Trash2,
  Edit3,
  FileText,
  Camera,
  Phone
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

interface ConversationalUXSystemProps {
  onClose: () => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onVoiceInput: () => void;
  isTyping: boolean;
  isVoiceMode: boolean;
  conversationId?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  richContent?: {
    type: 'image' | 'map' | 'card' | 'carousel' | 'list' | 'chart';
    data: any;
  };
  voiceData?: {
    audioUrl?: string;
    duration?: number;
    waveform?: number[];
    isPlaying?: boolean;
    transcript?: string;
  };
  reactions?: {
    thumbsUp: number;
    thumbsDown: number;
    helpful: number;
    emoji: Record<string, number>;
  };
  bookmarked?: boolean;
  metadata?: {
    responseTime: number;
    confidence: number;
    sources?: string[];
  };
}

interface QuickReply {
  id: string;
  text: string;
  type: 'question' | 'action' | 'preference' | 'navigation';
  category?: string;
  icon?: React.ReactNode;
}

interface ConversationHistory {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messageCount: number;
  category: 'planning' | 'booking' | 'recommendations' | 'support' | 'general';
  tags: string[];
  starred: boolean;
}

interface VoiceWaveform {
  isRecording: boolean;
  isPlaying: boolean;
  waveformData: number[];
  audioLevel: number;
  duration: number;
}

interface TypingIndicator {
  isVisible: boolean;
  dots: boolean[];
  message: string;
}

interface OfflineMessage {
  id: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function ConversationalUXSystem({ 
  onClose, 
  messages, 
  onSendMessage, 
  onVoiceInput, 
  isTyping, 
  isVoiceMode, 
  conversationId 
}: ConversationalUXSystemProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  
  // Voice & Audio State
  const [voiceState, setVoiceState] = useState<VoiceWaveform>({
    isRecording: false,
    isPlaying: false,
    waveformData: new Array(32).fill(0),
    audioLevel: 0,
    duration: 0
  });
  
  // Typing Indicator State
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator>({
    isVisible: false,
    dots: [false, false, false],
    message: 'AI is thinking...'
  });
  
  // Conversation History
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  
  // Quick Replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([
    {
      id: '1',
      text: 'Find hotels',
      type: 'action',
      category: 'accommodation',
      icon: <MapPin className="h-3 w-3" />
    },
    {
      id: '2',
      text: 'Plan my day',
      type: 'action',
      category: 'planning',
      icon: <Calendar className="h-3 w-3" />
    },
    {
      id: '3',
      text: 'Show weather',
      type: 'question',
      category: 'information',
      icon: <Sparkles className="h-3 w-3" />
    },
    {
      id: '4',
      text: 'Book restaurant',
      type: 'action',
      category: 'dining',
      icon: <Star className="h-3 w-3" />
    },
    {
      id: '5',
      text: 'What can you do?',
      type: 'question',
      category: 'help',
      icon: <Brain className="h-3 w-3" />
    },
    {
      id: '6',
      text: 'Call support',
      type: 'navigation',
      category: 'support',
      icon: <Phone className="h-3 w-3" />
    }
  ]);
  
  // Offline Queue
  const [offlineQueue, setOfflineQueue] = useState<OfflineMessage[]>([]);
  
  // UI Settings
  const [uiSettings, setUISettings] = useState({
    messageAnimation: true,
    audioAutoplay: false,
    typingIndicators: true,
    voiceVisualization: true,
    darkMode: false,
    compactMode: false,
    showTimestamps: true,
    showAvatars: true,
    autoScroll: true,
    offlineMode: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Auto-scroll to bottom
  useEffect(() => {
    if (uiSettings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, uiSettings.autoScroll]);

  // Typing indicator animation
  useEffect(() => {
    if (isTyping && uiSettings.typingIndicators) {
      setTypingIndicator(prev => ({ ...prev, isVisible: true }));
      
      const interval = setInterval(() => {
        setTypingIndicator(prev => ({
          ...prev,
          dots: prev.dots.map((_, index) => Math.random() > 0.5)
        }));
      }, 500);

      return () => clearInterval(interval);
    } else {
      setTypingIndicator(prev => ({ ...prev, isVisible: false }));
    }
  }, [isTyping, uiSettings.typingIndicators]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineMessages();
    };
    
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load conversation history
  useEffect(() => {
    loadConversationHistory();
  }, []);

  // Sync offline messages when back online
  const syncOfflineMessages = async () => {
    if (offlineQueue.length === 0) return;

    const pendingMessages = offlineQueue.filter(msg => msg.status === 'pending');
    
    for (const message of pendingMessages) {
      try {
        await sendMessage(message.content);
        setOfflineQueue(prev => prev.filter(msg => msg.id !== message.id));
      } catch (error) {
        setOfflineQueue(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'failed', retryCount: msg.retryCount + 1 }
            : msg
        ));
      }
    }
  };

  // Load conversation history
  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversationHistory(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  // Send message (with offline support)
  const sendMessage = async (content: string) => {
    if (isOffline) {
      const offlineMessage: OfflineMessage = {
        id: Date.now().toString(),
        content,
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0
      };
      setOfflineQueue(prev => [...prev, offlineMessage]);
      return;
    }

    try {
      await onSendMessage(content);
      
      // Update quick replies based on context
      updateQuickReplies(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Update quick replies based on conversation context
  const updateQuickReplies = (lastMessage: string) => {
    const lower = lastMessage.toLowerCase();
    
    let contextualReplies: QuickReply[] = [];
    
    if (lower.includes('hotel') || lower.includes('accommodation')) {
      contextualReplies = [
        { id: 'h1', text: 'Check availability', type: 'action', icon: <Calendar className="h-3 w-3" /> },
        { id: 'h2', text: 'Compare prices', type: 'action', icon: <CreditCard className="h-3 w-3" /> },
        { id: 'h3', text: 'Show reviews', type: 'question', icon: <Star className="h-3 w-3" /> },
        { id: 'h4', text: 'Book now', type: 'action', icon: <Heart className="h-3 w-3" /> }
      ];
    } else if (lower.includes('restaurant') || lower.includes('food')) {
      contextualReplies = [
        { id: 'r1', text: 'Make reservation', type: 'action', icon: <Calendar className="h-3 w-3" /> },
        { id: 'r2', text: 'View menu', type: 'question', icon: <FileText className="h-3 w-3" /> },
        { id: 'r3', text: 'Get directions', type: 'action', icon: <MapPin className="h-3 w-3" /> },
        { id: 'r4', text: 'Similar places', type: 'question', icon: <Search className="h-3 w-3" /> }
      ];
    } else if (lower.includes('weather') || lower.includes('forecast')) {
      contextualReplies = [
        { id: 'w1', text: '7-day forecast', type: 'question', icon: <Calendar className="h-3 w-3" /> },
        { id: 'w2', text: 'What to wear?', type: 'question', icon: <Sparkles className="h-3 w-3" /> },
        { id: 'w3', text: 'Indoor activities', type: 'action', icon: <MapPin className="h-3 w-3" /> },
        { id: 'w4', text: 'Weather alerts', type: 'question', icon: <Zap className="h-3 w-3" /> }
      ];
    }
    
    if (contextualReplies.length > 0) {
      setQuickReplies(contextualReplies);
      setShowQuickReplies(true);
    }
  };

  // Handle quick reply
  const handleQuickReply = (reply: QuickReply) => {
    setInputMessage(reply.text);
    sendMessage(reply.text);
    setShowQuickReplies(false);
  };

  // Handle message reactions
  const handleReaction = async (messageId: string, reaction: string) => {
    try {
      await fetch(`${API_BASE_URL}/ai/chat/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ reaction })
      });

      // Update local message state would happen here
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

  // Export conversation
  const exportConversation = async (format: 'pdf' | 'json' | 'txt') => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          conversationId,
          format,
          includeMetadata: true
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  // Voice visualization
  const VoiceWaveform = ({ waveformData, isActive }: { waveformData: number[], isActive: boolean }) => (
    <div className="flex items-center space-x-1 h-8">
      {waveformData.map((value, index) => (
        <div
          key={index}
          className={`bg-current w-1 rounded-full transition-all duration-100 ${
            isActive ? 'animate-pulse' : ''
          }`}
          style={{ 
            height: `${Math.max(2, value * 100)}%`,
            opacity: isActive ? 0.7 + (value * 0.3) : 0.3 
          }}
        />
      ))}
    </div>
  );

  // Enhanced Message Bubble
  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <div 
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${
          uiSettings.messageAnimation ? 'animate-in slide-in-from-bottom-2' : ''
        }`}
      >
        {!isUser && uiSettings.showAvatars && (
          <Avatar className="h-8 w-8 mr-3 mt-1">
            <AvatarFallback className="bg-primary text-black">
              <Brain className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[70%] ${isSystem ? 'mx-auto' : ''}`}>
          {/* Message Content */}
          <div
            className={`p-3 rounded-lg ${
              isUser
                ? 'bg-primary text-black'
                : isSystem
                ? 'bg-muted/50 text-center text-sm'
                : 'bg-muted hover:bg-muted/80 transition-colors cursor-pointer'
            } ${selectedMessage === message.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
          >
            {message.content}
          </div>
          
          {/* Rich Content */}
          {message.richContent && (
            <div className="mt-2">
              {message.richContent.type === 'image' && (
                <div className="relative">
                  <img 
                    src={message.richContent.data.url} 
                    alt={message.richContent.data.alt || 'Shared image'} 
                    className="rounded-lg max-w-full h-auto"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 bg-black/50 text-white hover:bg-black/70">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {message.richContent.type === 'map' && (
                <Card className="mt-2">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{message.richContent.data.location}</span>
                    </div>
                    <div className="bg-muted/50 rounded h-32 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Interactive Map</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {message.richContent.type === 'card' && (
                <Card className="mt-2">
                  <CardContent className="p-3">
                    {message.richContent.data.image && (
                      <img 
                        src={message.richContent.data.image} 
                        alt={message.richContent.data.title} 
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h4 className="font-medium text-sm mb-1">{message.richContent.data.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{message.richContent.data.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="text-xs">{message.richContent.data.rating}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Voice Data */}
          {message.voiceData && (
            <div className="mt-2 p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    // Toggle audio playback
                    if (message.voiceData?.audioUrl) {
                      const audio = new Audio(message.voiceData.audioUrl);
                      audio.play();
                    }
                  }}
                >
                  <Play className="h-3 w-3" />
                </Button>
                
                {message.voiceData.waveform && uiSettings.voiceVisualization && (
                  <VoiceWaveform 
                    waveformData={message.voiceData.waveform} 
                    isActive={message.voiceData.isPlaying || false}
                  />
                )}
                
                <div className="text-xs text-muted-foreground">
                  {message.voiceData.duration}s
                </div>
              </div>
              
              {message.voiceData.transcript && (
                <div className="text-xs text-muted-foreground mt-1 italic">
                  "{message.voiceData.transcript}"
                </div>
              )}
            </div>
          )}
          
          {/* Message Footer */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              {uiSettings.showTimestamps && (
                <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              
              {message.metadata?.responseTime && !isUser && (
                <span>{message.metadata.responseTime}ms</span>
              )}
              
              {message.metadata?.confidence && !isUser && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(message.metadata.confidence * 100)}% confident
                </Badge>
              )}
            </div>
            
            {/* Message Actions */}
            {selectedMessage === message.id && !isUser && (
              <div className="flex items-center space-x-1 animate-in slide-in-from-right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleReaction(message.id, 'thumbs_up')}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleReaction(message.id, 'thumbs_down')}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Bookmark className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Reactions Display */}
          {message.reactions && (Object.values(message.reactions).some(v => typeof v === 'number' ? v > 0 : Object.values(v).some(count => count > 0))) && (
            <div className="flex items-center space-x-2 mt-2">
              {message.reactions.thumbsUp > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {message.reactions.thumbsUp}
                </Badge>
              )}
              {message.reactions.thumbsDown > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  {message.reactions.thumbsDown}
                </Badge>
              )}
              {message.reactions.helpful > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {message.reactions.helpful}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {isUser && uiSettings.showAvatars && (
          <Avatar className="h-8 w-8 ml-3 mt-1">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Enhanced Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-black">
                  <MessageSquare className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">Enhanced AI Chat</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      isOffline ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                    <span>{isOffline ? 'Offline' : 'Online'}</span>
                  </div>
                  
                  {isVoiceMode && (
                    <div className="flex items-center space-x-1">
                      <Mic className="h-3 w-3 text-green-600" />
                      <span>Voice Mode</span>
                    </div>
                  )}
                  
                  {offlineQueue.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {offlineQueue.length} queued
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => exportConversation('pdf')}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-b p-3 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation..."
              className="pl-10 bg-background"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages
              .filter(message => 
                !searchQuery || 
                message.content.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            
            {/* Typing Indicator */}
            {typingIndicator.isVisible && (
              <div className="flex justify-start mb-4">
                <Avatar className="h-8 w-8 mr-3 mt-1">
                  <AvatarFallback className="bg-primary text-black">
                    <Brain className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {typingIndicator.dots.map((isActive, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            isActive ? 'bg-current scale-110' : 'bg-current/40'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm">{typingIndicator.message}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Replies */}
        {showQuickReplies && quickReplies.length > 0 && (
          <div className="border-t border-b p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quick Replies</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowQuickReplies(false)}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex space-x-2 pb-2">
                {quickReplies.map((reply) => (
                  <Button
                    key={reply.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickReply(reply)}
                    className="whitespace-nowrap flex items-center space-x-1"
                  >
                    {reply.icon}
                    <span>{reply.text}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Enhanced Input Area */}
        <div className="p-4 bg-muted/30">
          {/* Voice Recording Indicator */}
          {voiceState.isRecording && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-700">Recording...</span>
                  <span className="text-sm text-red-600">{Math.floor(voiceState.duration)}s</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
              
              {uiSettings.voiceVisualization && (
                <VoiceWaveform 
                  waveformData={voiceState.waveformData} 
                  isActive={voiceState.isRecording}
                />
              )}
            </div>
          )}

          {/* Offline Status */}
          {isOffline && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4" />
                <span>You're offline. Messages will be sent when reconnected.</span>
              </div>
            </div>
          )}

          {/* Input Container */}
          <div className="flex items-end space-x-2">
            <div className="flex-1 bg-background border rounded-lg">
              <div className="p-3">
                <div className="flex items-center space-x-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border-none p-0 focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputMessage.trim()) {
                          sendMessage(inputMessage);
                          setInputMessage('');
                        }
                      }
                    }}
                  />
                  
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Voice Input Button */}
            <Button
              variant={voiceState.isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={onVoiceInput}
              className="shrink-0"
            >
              {voiceState.isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            
            {/* Send Button */}
            <Button 
              onClick={() => {
                if (inputMessage.trim()) {
                  sendMessage(inputMessage);
                  setInputMessage('');
                }
              }}
              disabled={!inputMessage.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Footer Info */}
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>{messages.length} messages</span>
              {conversationId && <span>Conversation ID: {conversationId.slice(-8)}</span>}
            </div>
            
            <div className="flex items-center space-x-2">
              {!showQuickReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickReplies(true)}
                  className="h-6 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Quick replies
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed right-4 top-4 bottom-4 w-80 bg-white dark:bg-gray-800 rounded-lg border shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Conversation History</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {conversationHistory.map((conv) => (
                <Card key={conv.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{conv.title}</h4>
                      {conv.starred && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{conv.preview}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {conv.messageCount} messages
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conv.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed right-4 top-4 bottom-4 w-80 bg-white dark:bg-gray-800 rounded-lg border shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Chat Settings</h3>
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
            <div className="p-4 space-y-4">
              {/* UI Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">User Interface</h4>
                
                {Object.entries(uiSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <Button
                      variant={value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUISettings(prev => ({ ...prev, [key]: !value }))}
                    >
                      {value ? 'On' : 'Off'}
                    </Button>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Export Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Export & Backup</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => exportConversation('pdf')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => exportConversation('json')}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Export as JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => exportConversation('txt')}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Export as Text
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
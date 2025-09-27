import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Send, 
  Mic, 
  MicOff,
  Paperclip, 
  Camera, 
  MapPin, 
  Calendar, 
  Star, 
  Heart, 
  Bookmark, 
  Share2, 
  Bot, 
  User, 
  Clock, 
  Search, 
  Filter, 
  MoreHorizontal,
  Sparkles,
  Compass,
  Phone,
  Info,
  ChevronDown,
  Volume2,
  VolumeX,
  Loader2,
  Image as ImageIcon,
  FileText,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Download,
  Pause,
  Play,
  Square,
  Upload,
  Scan,
  Languages,
  Brain,
  Globe,
  Zap,
  Eye,
  MessageSquare,
  Settings,
  History,
  X,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Edit3,
  AlertCircle,
  CheckCircle,
  Wand2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VoiceAssistant } from './VoiceAssistant';
import { AIRecommendations } from './AIRecommendations';
import { SmartNotifications } from './SmartNotifications';
import { TranslationSystem } from './TranslationSystem';
import { LanguageLearningGame } from './LanguageLearningGame';
import { CameraTranslation } from './CameraTranslation';
import { VoiceTranslation } from './VoiceTranslation';
import { ItineraryGenerator } from './ItineraryGenerator';
import { PersonalizedRecommendations } from './PersonalizedRecommendations';
import { DynamicOptimization } from './DynamicOptimization';
import { ContentAnalysisSystem } from './ContentAnalysisSystem';
import { PredictiveIntelligenceSystem } from './PredictiveIntelligenceSystem';
import { MemoryLearningSystem } from './MemoryLearningSystem';
import { ConversationalUXSystem } from './ConversationalUXSystem';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  richContent?: {
    type: 'property' | 'poi' | 'itinerary' | 'map' | 'price-comparison' | 'image' | 'document' | 'voice' | 'translation' | 'emoji-reaction' | 'multimedia';
    data: any;
  };
  isLoading?: boolean;
  audioUrl?: string;
  imageUrl?: string;
  documentUrl?: string;
  sentiment?: {
    emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'neutral' | 'excitement' | 'frustration';
    confidence: number;
    tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'empathetic';
  };
  context?: {
    topic: string;
    intent: string;
    entities: Record<string, any>;
    conversationFlow: string[];
    interruption?: boolean;
    resumeContext?: string;
  };
  reactions?: {
    helpful: number;
    thumbsUp: number;
    thumbsDown: number;
    emoji: Record<string, number>;
  };
  voiceData?: {
    duration: number;
    waveform: number[];
    isPlaying?: boolean;
    transcript?: string;
    confidence?: number;
  };
  multiModal?: {
    images?: ImageRecognitionResult[];
    documents?: DocumentScanResult[];
    voice?: VoiceProcessingResult;
    translations?: Record<string, string>;
  };
  translatedContent?: {
    [language: string]: string;
  };
}

interface ConversationContext {
  sessionId: string;
  currentTopic: string;
  previousTopics: string[];
  intent: string;
  entities: Record<string, any>;
  sentiment: {
    current: string;
    history: Array<{ emotion: string; timestamp: Date; confidence: number }>;
    trend: 'improving' | 'declining' | 'stable';
  };
  lastActivity: Date;
  messageCount: number;
  conversationFlow: Array<{
    step: string;
    completed: boolean;
    timestamp: Date;
  }>;
  interruptions: Array<{
    timestamp: Date;
    context: string;
    resolved: boolean;
  }>;
  memory: ConversationMemory;
  proactiveSuggestions: ProactiveSuggestion[];
  userPreferences: {
    language: string;
    voiceEnabled: boolean;
    autoTranslate: boolean;
    emotionalTone: 'adaptive' | 'formal' | 'casual' | 'empathetic';
    multiModalEnabled: boolean;
    contextRetention: 'session' | 'persistent' | 'limited';
    personalizedResponses: boolean;
  };
}

interface VoiceState {
  isRecording: boolean;
  isTranscribing: boolean;
  isPlaying: boolean;
  isSynthesizing: boolean;
  audioLevel: number;
  currentAudio: HTMLAudioElement | null;
  recordingDuration: number;
  waveformData: number[];
  recordedBlob: Blob | null;
  transcriptionError: string | null;
  synthesisQueue: Array<{ text: string; voice?: string; speed?: number }>;
  interruptionHandling: {
    canInterrupt: boolean;
    pausedContext: string | null;
    resumeCallback: (() => void) | null;
  };
}

interface ImageRecognitionResult {
  landmarks: Array<{
    name: string;
    confidence: number;
    description: string;
    coordinates?: { lat: number; lng: number };
    category: 'restaurant' | 'attraction' | 'accommodation' | 'transport' | 'other';
  }>;
  text: string;
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }>;
  suggestions: string[];
  imageUrl: string;
  processingTime: number;
}

interface DocumentScanResult {
  type: 'itinerary' | 'booking-confirmation' | 'ticket' | 'passport' | 'visa' | 'receipt' | 'menu' | 'other';
  extractedText: string;
  structuredData?: {
    dates?: string[];
    locations?: string[];
    prices?: Array<{ amount: number; currency: string }>;
    confirmationNumbers?: string[];
    flightNumbers?: string[];
  };
  confidence: number;
  suggestions: string[];
  documentUrl: string;
}

interface VoiceProcessingResult {
  transcript: string;
  confidence: number;
  language: string;
  duration: number;
  audioUrl: string;
  waveform: number[];
  emotions?: Array<{
    emotion: string;
    confidence: number;
    timestamp: number;
  }>;
}

interface ConversationMemory {
  shortTerm: Message[];
  longTerm: Array<{
    topic: string;
    summary: string;
    keyEntities: Record<string, any>;
    timestamp: Date;
    importance: number;
  }>;
  preferences: {
    communicationStyle: string;
    interests: string[];
    travelPatterns: Record<string, any>;
  };
}

interface ProactiveSuggestion {
  id: string;
  type: 'question' | 'recommendation' | 'reminder' | 'clarification' | 'follow-up';
  content: string;
  confidence: number;
  context: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

interface AIAssistantProps {
  onClose?: () => void;
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'system',
    content: 'Welcome to TouriQuest! I\'m your AI travel assistant. How can I help you plan your next adventure?',
    timestamp: new Date(Date.now() - 3600000)
  },
  {
    id: '2',
    type: 'user',
    content: 'I\'m planning a trip to Paris for next month. Can you suggest some good hotels?',
    timestamp: new Date(Date.now() - 3500000)
  },
  {
    id: '3',
    type: 'ai',
    content: 'I\'d be happy to help you find hotels in Paris! Based on your travel history and preferences, I\'ve found some excellent options that match your style. Here are my top recommendations:',
    timestamp: new Date(Date.now() - 3400000),
    richContent: {
      type: 'property',
      data: {
        recommendations: [
          {
            id: '1',
            name: 'Hotel des Grands Boulevards',
            location: 'Montmartre, Paris',
            rating: 4.8,
            price: 189,
            image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&h=200&fit=crop',
            features: ['Free WiFi', 'Breakfast included', 'Eco-friendly']
          },
          {
            id: '2',
            name: 'Le Marais Boutique Hotel',
            location: 'Le Marais, Paris',
            rating: 4.6,
            price: 156,
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=300&h=200&fit=crop',
            features: ['Historic building', 'Central location', 'Pet-friendly']
          }
        ]
      }
    }
  }
];

const quickSuggestions = [
  'Find hotels in Paris',
  'What to do today?',
  'Show my bookings',
  'Plan my day',
  'Weather forecast',
  'Nearby restaurants'
];

export function AIAssistant({ onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [showDocumentScan, setShowDocumentScan] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showAdvancedTranslation, setShowAdvancedTranslation] = useState(false);
  const [showLanguageLearning, setShowLanguageLearning] = useState(false);
  const [showCameraTranslation, setShowCameraTranslation] = useState(false);
  const [showVoiceTranslation, setShowVoiceTranslation] = useState(false);
  const [translationMode, setTranslationMode] = useState<'basic' | 'advanced'>('basic');
  const [showItineraryGenerator, setShowItineraryGenerator] = useState(false);
  const [showPersonalizedRecommendations, setShowPersonalizedRecommendations] = useState(false);
  const [showDynamicOptimization, setShowDynamicOptimization] = useState(false);
  const [showContentAnalysis, setShowContentAnalysis] = useState(false);
  const [showPredictiveIntelligence, setShowPredictiveIntelligence] = useState(false);
  const [showMemoryLearning, setShowMemoryLearning] = useState(false);
  const [showEnhancedUX, setShowEnhancedUX] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<any>(null);
  const [learningProgress, setLearningProgress] = useState({
    targetLanguage: selectedLanguage,
    level: 'beginner',
    phrasesLearned: 0,
    streakDays: 0,
    totalPoints: 0
  });
  
  // Enhanced state management
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    sessionId: `session_${Date.now()}`,
    currentTopic: 'general',
    previousTopics: [],
    intent: 'explore',
    entities: {},
    sentiment: {
      current: 'neutral',
      history: [],
      trend: 'stable'
    },
    lastActivity: new Date(),
    messageCount: 0,
    conversationFlow: [],
    interruptions: [],
    memory: {
      shortTerm: [],
      longTerm: [],
      preferences: {
        communicationStyle: 'friendly',
        interests: [],
        travelPatterns: {}
      }
    },
    proactiveSuggestions: [],
    userPreferences: {
      language: 'en',
      voiceEnabled: true,
      autoTranslate: false,
      emotionalTone: 'adaptive',
      multiModalEnabled: true,
      contextRetention: 'session',
      personalizedResponses: true
    }
  });
  
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isRecording: false,
    isTranscribing: false,
    isPlaying: false,
    isSynthesizing: false,
    audioLevel: 0,
    currentAudio: null,
    recordingDuration: 0,
    waveformData: [],
    recordedBlob: null,
    transcriptionError: null,
    synthesisQueue: [],
    interruptionHandling: {
      canInterrupt: true,
      pausedContext: null,
      resumeCallback: null
    }
  });
  
  const [contextInfo, setContextInfo] = useState({
    location: 'Paris, France',
    weather: '22°C Sunny',
    nextTrip: 'Tokyo - 5 days'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    // Update conversation context with activity
    setConversationContext(prev => ({
      ...prev,
      lastActivity: new Date(),
      messageCount: messages.length
    }));
  }, [messages]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup media recorder and audio context
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (voiceState.currentAudio) {
        voiceState.currentAudio.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Voice Recording Management
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setVoiceState(prev => ({ ...prev, recordedBlob: audioBlob }));
        await transcribeVoice(audioBlob);
      };
      
      // Setup audio visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      
      setVoiceState(prev => ({
        ...prev,
        isRecording: true,
        recordingDuration: 0,
        transcriptionError: null
      }));
      
      // Start audio level monitoring
      monitorAudioLevel();
      
    } catch (error) {
      console.error('Voice recording failed:', error);
      setVoiceState(prev => ({
        ...prev,
        transcriptionError: 'Microphone access denied or not available'
      }));
    }
  };
  
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setVoiceState(prev => ({
        ...prev,
        isRecording: false,
        audioLevel: 0
      }));
    }
  };
  
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !voiceState.isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      setVoiceState(prev => ({
        ...prev,
        audioLevel: average / 255,
        waveformData: Array.from(dataArray).slice(0, 32)
      }));
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };
  
  // Voice Transcription API Integration
  const transcribeVoice = async (audioBlob: Blob): Promise<void> => {
    setVoiceState(prev => ({ ...prev, isTranscribing: true }));
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('language', conversationContext.userPreferences.language);
      formData.append('context', JSON.stringify({
        sessionId: conversationContext.sessionId,
        topic: conversationContext.currentTopic
      }));
      
      const response = await fetch(`${API_BASE_URL}/ai/voice/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const result = await response.json();
      const transcribedText = result.transcript;
      
      if (transcribedText && transcribedText.trim()) {
        setInputValue(transcribedText);
        
        // Analyze sentiment from voice
        if (result.emotions && result.emotions.length > 0) {
          const dominantEmotion = result.emotions[0];
          updateConversationSentiment(dominantEmotion.emotion, dominantEmotion.confidence);
        }
        
        // Auto-send if confidence is high
        if (result.confidence > 0.8 && conversationContext.userPreferences.personalizedResponses) {
          setTimeout(() => handleSendMessage(transcribedText), 500);
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setVoiceState(prev => ({
        ...prev,
        transcriptionError: 'Failed to transcribe audio. Please try again.'
      }));
    } finally {
      setVoiceState(prev => ({ ...prev, isTranscribing: false }));
    }
  };
  
  // Voice Synthesis API Integration
  const synthesizeVoice = async (text: string, voice?: string): Promise<void> => {
    if (!conversationContext.userPreferences.voiceEnabled) return;
    
    setVoiceState(prev => ({ ...prev, isSynthesizing: true }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/ai/voice/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text,
          voice: voice || 'default',
          language: conversationContext.userPreferences.language,
          emotionalTone: conversationContext.userPreferences.emotionalTone,
          speed: 1.0
        })
      });
      
      if (!response.ok) {
        throw new Error('Voice synthesis failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setVoiceState(prev => ({
          ...prev,
          isPlaying: false,
          currentAudio: null
        }));
        URL.revokeObjectURL(audioUrl);
      };
      
      setVoiceState(prev => ({
        ...prev,
        currentAudio: audio,
        isPlaying: true
      }));
      
      await audio.play();
    } catch (error) {
      console.error('Voice synthesis error:', error);
    } finally {
      setVoiceState(prev => ({ ...prev, isSynthesizing: false }));
    }
  };
  
  // Image Recognition API Integration
  const recognizeImage = async (imageFile: File): Promise<ImageRecognitionResult | null> => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('context', JSON.stringify({
        location: contextInfo.location,
        sessionId: conversationContext.sessionId
      }));
      
      const response = await fetch(`${API_BASE_URL}/ai/image/recognize`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Image recognition failed');
      }
      
      const result = await response.json();
      
      // Create message with image recognition results
      const imageMessage: Message = {
        id: `img_${Date.now()}`,
        type: 'user',
        content: 'I shared an image for analysis',
        timestamp: new Date(),
        imageUrl: URL.createObjectURL(imageFile),
        multiModal: {
          images: [result]
        }
      };
      
      setMessages(prev => [...prev, imageMessage]);
      
      // Generate AI response based on recognition
      const aiResponse = generateImageResponse(result);
      setTimeout(() => {
        setMessages(prev => [...prev, aiResponse]);
        if (conversationContext.userPreferences.voiceEnabled) {
          synthesizeVoice(aiResponse.content);
        }
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Image recognition error:', error);
      return null;
    }
  };
  
  // Document Scanning API Integration
  const scanDocument = async (documentFile: File): Promise<DocumentScanResult | null> => {
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('expectedType', 'auto-detect');
      
      const response = await fetch(`${API_BASE_URL}/ai/document/scan`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Document scanning failed');
      }
      
      const result = await response.json();
      
      // Create message with document scan results
      const docMessage: Message = {
        id: `doc_${Date.now()}`,
        type: 'user',
        content: 'I uploaded a document for analysis',
        timestamp: new Date(),
        documentUrl: URL.createObjectURL(documentFile),
        multiModal: {
          documents: [result]
        }
      };
      
      setMessages(prev => [...prev, docMessage]);
      
      // Generate AI response based on document content
      const aiResponse = generateDocumentResponse(result);
      setTimeout(() => {
        setMessages(prev => [...prev, aiResponse]);
        if (conversationContext.userPreferences.voiceEnabled) {
          synthesizeVoice(aiResponse.content);
        }
      }, 1500);
      
      return result;
    } catch (error) {
      console.error('Document scanning error:', error);
      return null;
    }
  };
  
  // Enhanced Translation API Integration
  const translateText = async (text: string, targetLanguage: string, options?: {
    sourceLanguage?: string;
    culturalContext?: boolean;
    includeAlternatives?: boolean;
    preserveFormatting?: boolean;
  }): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage: options?.sourceLanguage || 'auto',
          context: conversationContext.currentTopic,
          culturalContext: options?.culturalContext || conversationContext.userPreferences.autoTranslate,
          includeAlternatives: options?.includeAlternatives || false,
          preserveFormatting: options?.preserveFormatting || true,
          userLevel: learningProgress.level
        })
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      const result = await response.json();
      
      // Update learning progress if user is learning this language
      if (targetLanguage === learningProgress.targetLanguage && result.newPhraseLearned) {
        setLearningProgress(prev => ({
          ...prev,
          phrasesLearned: prev.phrasesLearned + 1,
          totalPoints: prev.totalPoints + 5
        }));
      }
      
      return result.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  };
  
  // Sentiment Analysis and Context Updates
  const updateConversationSentiment = (emotion: string, confidence: number) => {
    setConversationContext(prev => ({
      ...prev,
      sentiment: {
        current: emotion,
        history: [
          ...prev.sentiment.history.slice(-10), // Keep last 10 entries
          { emotion, timestamp: new Date(), confidence }
        ],
        trend: calculateSentimentTrend(prev.sentiment.history, emotion)
      }
    }));
  };
  
  const calculateSentimentTrend = (history: any[], currentEmotion: string): 'improving' | 'declining' | 'stable' => {
    if (history.length < 3) return 'stable';
    
    const positiveEmotions = ['joy', 'excitement', 'neutral'];
    const recentEmotions = history.slice(-3);
    const positiveCount = recentEmotions.filter(h => positiveEmotions.includes(h.emotion)).length;
    
    if (positiveCount >= 2 && positiveEmotions.includes(currentEmotion)) {
      return 'improving';
    } else if (positiveCount <= 1 && !positiveEmotions.includes(currentEmotion)) {
      return 'declining';
    }
    
    return 'stable';
  };

  // Smart trip planning request detection and handling
  const handleTripPlanningRequest = async (message: string) => {
    const tripPlanningKeywords = [
      'plan', 'trip', 'itinerary', 'travel', 'visit', 'vacation', 
      'holiday', 'journey', 'tour', 'explore', 'weekend', 'days'
    ];
    
    const hasKeywords = tripPlanningKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasKeywords) {
      try {
        const response = await fetch('/api/v1/ai/extract/entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            context: 'trip-planning',
            extractTypes: ['destination', 'dates', 'budget', 'interests', 'duration', 'group_size']
          })
        });

        const entities = await response.json();
        
        if (entities.destination || entities.duration || entities.budget) {
          const suggestionMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: `I can help you plan that trip! I've detected you're interested in ${entities.destination ? `visiting ${entities.destination}` : 'planning a trip'}${entities.duration ? ` for ${entities.duration} days` : ''}${entities.budget ? ` with a budget around $${entities.budget}` : ''}. Would you like me to create a detailed itinerary for you?`,
            timestamp: new Date(),
            richContent: {
              type: 'itinerary',
              data: {
                action: 'suggest-planning',
                entities,
                quickActions: [
                  {
                    label: 'Generate Itinerary',
                    action: () => setShowItineraryGenerator(true),
                    primary: true
                  },
                  {
                    label: 'Get Recommendations', 
                    action: () => setShowPersonalizedRecommendations(true)
                  }
                ]
              }
            }
          };
          
          setMessages(prev => [...prev, suggestionMessage]);
          return true;
        }
      } catch (error) {
        console.error('Trip planning analysis failed:', error);
      }
    }
    
    return false;
  };

  // Enhanced recommendation request handling
  const handleRecommendationRequest = async (message: string) => {
    const recommendationKeywords = [
      'recommend', 'suggestion', 'suggest', 'what should', 'where to', 
      'best places', 'good restaurant', 'things to do', 'activities'
    ];
    
    const hasKeywords = recommendationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasKeywords) {
      const suggestionMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I'd be happy to provide personalized recommendations! Let me analyze your preferences and current context to suggest the perfect activities, restaurants, and experiences for you.`,
        timestamp: new Date(),
        richContent: {
          type: 'property',
          data: {
            action: 'suggest-recommendations',
            quickActions: [
              {
                label: 'Get Personalized Recommendations',
                action: () => setShowPersonalizedRecommendations(true),
                primary: true
              }
            ]
          }
        }
      };
      
      setMessages(prev => [...prev, suggestionMessage]);
      return true;
    }
    
    return false;
  };

  // Optimization request handling
  const handleOptimizationRequest = async (message: string) => {
    const optimizationKeywords = [
      'optimize', 'improve', 'better route', 'avoid crowds', 'weather', 
      'traffic', 'efficiency', 'adjust', 'change'
    ];
    
    const hasKeywords = optimizationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasKeywords && currentItinerary) {
      const suggestionMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I can help optimize your itinerary based on real-time conditions like weather, traffic, and crowd levels. Let me analyze your current plans and suggest improvements.`,
        timestamp: new Date(),
        richContent: {
          type: 'itinerary',
          data: {
            action: 'suggest-optimization',
            quickActions: [
              {
                label: 'Optimize Itinerary',
                action: () => setShowDynamicOptimization(true),
                primary: true
              }
            ]
          }
        }
      };
      
      setMessages(prev => [...prev, suggestionMessage]);
      return true;
    }
    
    return false;
  };
  
  // Enhanced AI Chat API Integration
  const sendChatMessage = async (content: string, context?: any): Promise<Message> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          message: content,
          sessionId: conversationContext.sessionId,
          context: {
            ...conversationContext,
            location: contextInfo.location,
            previousMessages: messages.slice(-5), // Last 5 messages for context
            ...context
          },
          preferences: conversationContext.userPreferences,
          multiModal: {
            voiceEnabled: conversationContext.userPreferences.voiceEnabled,
            imageAnalysis: conversationContext.userPreferences.multiModalEnabled
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Chat API failed');
      }
      
      const result = await response.json();
      
      // Update conversation context with AI insights
      if (result.contextUpdate) {
        setConversationContext(prev => ({
          ...prev,
          currentTopic: result.contextUpdate.topic || prev.currentTopic,
          intent: result.contextUpdate.intent || prev.intent,
          entities: { ...prev.entities, ...result.contextUpdate.entities },
          proactiveSuggestions: result.contextUpdate.suggestions || []
        }));
      }
      
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: result.response,
        timestamp: new Date(),
        sentiment: result.sentiment,
        context: result.context,
        richContent: result.richContent
      };
      
      // Synthesize voice response if enabled
      if (conversationContext.userPreferences.voiceEnabled && result.voiceResponse) {
        synthesizeVoice(result.voiceResponse.text, result.voiceResponse.voice);
      }
      
      return aiMessage;
    } catch (error) {
      console.error('Chat API error:', error);
      return {
        id: `error_${Date.now()}`,
        type: 'ai',
        content: 'I\'m sorry, I\'m having trouble processing your request right now. Please try again.',
        timestamp: new Date()
      };
    }
  };

  // Helper Functions for Response Generation
  const generateImageResponse = (imageResult: ImageRecognitionResult): Message => {
    let content = "I can see ";
    
    if (imageResult.landmarks.length > 0) {
      const landmark = imageResult.landmarks[0];
      content += `${landmark.name}! ${landmark.description} `;
      
      if (landmark.category === 'restaurant') {
        content += "Would you like me to find similar restaurants nearby or check their menu and reviews?";
      } else if (landmark.category === 'attraction') {
        content += "I can provide visiting hours, ticket prices, and nearby attractions. What would you like to know?";
      } else if (landmark.category === 'accommodation') {
        content += "I can check availability and compare prices for similar properties. Shall I do that?";
      }
    } else if (imageResult.text) {
      content += `text in this image: "${imageResult.text}". `;
      if (conversationContext.userPreferences.autoTranslate) {
        content += "Would you like me to translate this text?";
      }
    } else if (imageResult.objects.length > 0) {
      const objects = imageResult.objects.slice(0, 3).map(o => o.name).join(', ');
      content += `${objects} in this image. How can I help you with this?`;
    }
    
    if (imageResult.suggestions.length > 0) {
      content += ` Here are some suggestions: ${imageResult.suggestions.join(', ')}`;
    }
    
    return {
      id: `ai_img_${Date.now()}`,
      type: 'ai',
      content,
      timestamp: new Date(),
      richContent: {
        type: 'image',
        data: imageResult
      }
    };
  };
  
  const generateDocumentResponse = (docResult: DocumentScanResult): Message => {
    let content = `I've analyzed your ${docResult.type.replace('-', ' ')} document. `;
    
    if (docResult.type === 'itinerary') {
      content += "I found your travel itinerary! ";
      if (docResult.structuredData?.dates) {
        content += `Your trip dates: ${docResult.structuredData.dates.join(', ')}. `;
      }
      if (docResult.structuredData?.locations) {
        content += `Destinations: ${docResult.structuredData.locations.join(', ')}. `;
      }
      content += "Would you like me to add these to your calendar or suggest activities for these dates?";
    } else if (docResult.type === 'booking-confirmation') {
      content += "I found your booking confirmation! ";
      if (docResult.structuredData?.confirmationNumbers) {
        content += `Confirmation number: ${docResult.structuredData.confirmationNumbers[0]}. `;
      }
      content += "I can help you track this booking or find related services.";
    } else if (docResult.type === 'menu') {
      content += "I can see the menu! ";
      if (docResult.structuredData?.prices) {
        const avgPrice = docResult.structuredData.prices.reduce((sum, p) => sum + p.amount, 0) / docResult.structuredData.prices.length;
        content += `Average price range: ${avgPrice.toFixed(2)} ${docResult.structuredData.prices[0]?.currency || 'EUR'}. `;
      }
      content += "Would you like recommendations based on dietary preferences or budget?";
    }
    
    if (docResult.suggestions.length > 0) {
      content += ` Suggestions: ${docResult.suggestions.join(', ')}`;
    }
    
    return {
      id: `ai_doc_${Date.now()}`,
      type: 'ai',
      content,
      timestamp: new Date(),
      richContent: {
        type: 'document',
        data: docResult
      }
    };
  };
  
  // Enhanced Message Handling with Multi-Modal Support
  const handleSendMessage = async (content: string, attachments?: { images?: File[], documents?: File[], voiceData?: Blob }) => {
    if (!content.trim() && !attachments) return;
    
    // Detect interruption
    const wasInterrupted = voiceState.isPlaying || isTyping;
    if (wasInterrupted) {
      handleConversationInterruption();
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      context: {
        topic: conversationContext.currentTopic,
        intent: detectUserIntent(content),
        entities: extractEntities(content),
        conversationFlow: conversationContext.conversationFlow.map(f => f.step),
        interruption: wasInterrupted
      }
    };
    
    // Process attachments if any
    if (attachments?.images) {
      for (const image of attachments.images) {
        await recognizeImage(image);
      }
    }
    
    if (attachments?.documents) {
      for (const doc of attachments.documents) {
        await scanDocument(doc);
      }
    }
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Smart request detection and handling
    const tripPlanningDetected = await handleTripPlanningRequest(content);
    const recommendationDetected = await handleRecommendationRequest(content);
    const optimizationDetected = await handleOptimizationRequest(content);
    
    // Update conversation context
    updateConversationFlow(userMessage.context?.intent || 'unknown');
    
    try {
      const aiResponse = await sendChatMessage(content, {
        attachments: attachments ? {
          hasImages: !!attachments.images?.length,
          hasDocuments: !!attachments.documents?.length,
          hasVoice: !!attachments.voiceData
        } : undefined,
        wasInterrupted
      });
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Generate proactive suggestions
      generateProactiveSuggestions(aiResponse);
      
    } catch (error) {
      console.error('Message sending failed:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'Failed to send message. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Interruption Handling
  const handleConversationInterruption = () => {
    // Stop current voice playback
    if (voiceState.currentAudio) {
      voiceState.currentAudio.pause();
      voiceState.currentAudio.currentTime = 0;
    }
    
    // Record interruption context
    const interruption = {
      timestamp: new Date(),
      context: `Interrupted during ${voiceState.isPlaying ? 'voice playback' : 'typing indicator'}`,
      resolved: false
    };
    
    setConversationContext(prev => ({
      ...prev,
      interruptions: [...prev.interruptions, interruption]
    }));
    
    setVoiceState(prev => ({
      ...prev,
      isPlaying: false,
      currentAudio: null,
      interruptionHandling: {
        ...prev.interruptionHandling,
        pausedContext: prev.isPlaying ? 'voice_playback' : null
      }
    }));
  };
  
  // Intent Detection
  const detectUserIntent = (content: string): string => {
    const lower = content.toLowerCase();
    
    if (lower.includes('book') || lower.includes('reserve')) return 'booking';
    if (lower.includes('find') || lower.includes('search') || lower.includes('show')) return 'search';
    if (lower.includes('help') || lower.includes('how') || lower.includes('?')) return 'help';
    if (lower.includes('plan') || lower.includes('itinerary')) return 'planning';
    if (lower.includes('translate') || lower.includes('meaning')) return 'translation';
    if (lower.includes('weather') || lower.includes('forecast')) return 'weather';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('expensive')) return 'pricing';
    
    return 'general';
  };
  
  // Entity Extraction
  const extractEntities = (content: string): Record<string, any> => {
    const entities: Record<string, any> = {};
    
    // Location detection
    const locationRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z][a-z]+)?/g;
    const locations = content.match(locationRegex);
    if (locations) entities.locations = locations;
    
    // Date detection
    const dateRegex = /\b(?:today|tomorrow|yesterday|next\s+\w+|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?)/gi;
    const dates = content.match(dateRegex);
    if (dates) entities.dates = dates;
    
    // Price detection
    const priceRegex = /\$\d+(?:\.\d{2})?|\d+\s*(?:euros?|dollars?|€|\$)/gi;
    const prices = content.match(priceRegex);
    if (prices) entities.prices = prices;
    
    // Number of people
    const peopleRegex = /\b(?:(\d+)\s*(?:people|persons?|guests?|adults?|kids?|children)|for\s+(\d+))/gi;
    const people = content.match(peopleRegex);
    if (people) entities.groupSize = people;
    
    return entities;
  };
  
  // Conversation Flow Management
  const updateConversationFlow = (intent: string) => {
    const flowStep = {
      step: intent,
      completed: false,
      timestamp: new Date()
    };
    
    setConversationContext(prev => ({
      ...prev,
      conversationFlow: [...prev.conversationFlow.slice(-10), flowStep], // Keep last 10 steps
      currentTopic: intent === 'booking' ? 'booking' : 
                   intent === 'planning' ? 'itinerary' : 
                   prev.currentTopic
    }));
  };
  
  // Proactive Suggestions Generation
  const generateProactiveSuggestions = (aiMessage: Message) => {
    const suggestions: ProactiveSuggestion[] = [];
    const content = aiMessage.content.toLowerCase();
    
    if (content.includes('hotel') || content.includes('accommodation')) {
      suggestions.push({
        id: `suggestion_${Date.now()}_1`,
        type: 'follow-up',
        content: 'Would you like me to check availability for specific dates?',
        confidence: 0.8,
        context: 'accommodation_search',
        timestamp: new Date(),
        priority: 'medium'
      });
    }
    
    if (content.includes('restaurant') || content.includes('dining')) {
      suggestions.push({
        id: `suggestion_${Date.now()}_2`,
        type: 'recommendation',
        content: 'Should I also suggest restaurants with dietary restrictions in mind?',
        confidence: 0.7,
        context: 'dining_preferences',
        timestamp: new Date(),
        priority: 'low'
      });
    }
    
    if (aiMessage.richContent?.type === 'itinerary') {
      suggestions.push({
        id: `suggestion_${Date.now()}_3`,
        type: 'question',
        content: 'Would you like me to add buffer time between activities or suggest transportation options?',
        confidence: 0.9,
        context: 'itinerary_optimization',
        timestamp: new Date(),
        priority: 'high'
      });
    }
    
    setConversationContext(prev => ({
      ...prev,
      proactiveSuggestions: suggestions.slice(0, 3) // Keep top 3 suggestions
    }));
  };

  const generateAIResponse = (userInput: string): string => {
    const lowercaseInput = userInput.toLowerCase();
    const sentiment = conversationContext.sentiment.current;
    const tone = conversationContext.userPreferences.emotionalTone;
    
    let response = "";
    
    if (lowercaseInput.includes('hotel') || lowercaseInput.includes('accommodation')) {
      response = "I've found some great accommodation options for you! Let me show you hotels that match your preferences and budget.";
    } else if (lowercaseInput.includes('restaurant') || lowercaseInput.includes('food')) {
      response = "Perfect! I know some amazing local restaurants. Based on your dietary preferences and location, here are my top picks.";
    } else if (lowercaseInput.includes('weather')) {
      response = "The weather looks great! Currently 22°C and sunny in Paris. Perfect for outdoor sightseeing. Should I suggest some outdoor activities?";
    } else if (lowercaseInput.includes('itinerary') || lowercaseInput.includes('plan')) {
      response = "I'd love to help you plan your perfect day! Let me create a personalized itinerary based on your interests and available time.";
    } else {
      response = "That's a great question! Let me help you with that. I can provide personalized recommendations based on your travel preferences.";
    }
    
    // Adapt response based on emotional context
    if (tone === 'empathetic' && ['sadness', 'frustration', 'anger'].includes(sentiment)) {
      response = "I understand this might be challenging. " + response + " I'm here to make this as easy as possible for you.";
    } else if (sentiment === 'excitement' && tone === 'adaptive') {
      response = "I can feel your excitement! " + response + " This is going to be amazing!";
    }
    
    return response;
  };

  const handleQuickSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
  };
  
  // Emoji Reaction Handler
  const addEmojiReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const currentReactions = msg.reactions || { helpful: 0, thumbsUp: 0, thumbsDown: 0, emoji: {} };
        const emojiReactions = currentReactions.emoji || {};
        
        return {
          ...msg,
          reactions: {
            ...currentReactions,
            emoji: {
              ...emojiReactions,
              [emoji]: (emojiReactions[emoji] || 0) + 1
            }
          }
        };
      }
      return msg;
    }));
    
    // Send reaction feedback to API for learning
    sendReactionFeedback(messageId, emoji);
  };
  
  const sendReactionFeedback = async (messageId: string, reaction: string) => {
    try {
      await fetch(`${API_BASE_URL}/ai/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          messageId,
          reaction,
          sessionId: conversationContext.sessionId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send reaction feedback:', error);
    }
  };
  
  // File Upload Handlers
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      await handleSendMessage('I\'ve shared some images for analysis', { images: imageFiles });
    }
  };
  
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const docFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/') ||
      file.type === 'text/plain'
    );
    
    if (docFiles.length > 0) {
      await handleSendMessage('I\'ve uploaded documents for analysis', { documents: docFiles });
    }
  };
  
  // Enhanced Language and Translation Handlers
  const handleLanguageChange = async (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    
    setConversationContext(prev => ({
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        language: newLanguage
      }
    }));
    
    // Update learning progress target language
    setLearningProgress(prev => ({
      ...prev,
      targetLanguage: newLanguage
    }));
    
    // Translate recent messages if auto-translate is enabled
    if (conversationContext.userPreferences.autoTranslate) {
      const recentMessages = messages.slice(-5);
      for (const message of recentMessages) {
        if (message.type === 'ai' && !message.translatedContent?.[newLanguage]) {
          const translated = await translateText(message.content, newLanguage, {
            culturalContext: true,
            includeAlternatives: false
          });
          setMessages(prev => prev.map(msg => 
            msg.id === message.id
              ? {
                  ...msg,
                  translatedContent: {
                    ...msg.translatedContent,
                    [newLanguage]: translated
                  }
                }
              : msg
          ));
        }
      }
    }
  };
  
  // Advanced Translation Mode Toggle
  const toggleAdvancedTranslation = () => {
    if (translationMode === 'basic') {
      setTranslationMode('advanced');
      setShowAdvancedTranslation(true);
    } else {
      setTranslationMode('basic');
      setShowAdvancedTranslation(false);
    }
  };
  
  // Language Learning Functions
  const startLanguageLearning = () => {
    setShowLanguageLearning(true);
  };
  
  const openCameraTranslation = () => {
    setShowCameraTranslation(true);
  };
  
  const openVoiceTranslation = () => {
    setShowVoiceTranslation(true);
  };
  
  // Voice Control Handlers
  const handleVoiceToggle = () => {
    if (voiceState.isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };
  
  const handleVoicePlaybackToggle = (audioUrl?: string) => {
    if (voiceState.isPlaying && voiceState.currentAudio) {
      voiceState.currentAudio.pause();
      setVoiceState(prev => ({ ...prev, isPlaying: false, currentAudio: null }));
    } else if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setVoiceState(prev => ({ ...prev, isPlaying: false, currentAudio: null }));
      };
      setVoiceState(prev => ({ ...prev, isPlaying: true, currentAudio: audio }));
      audio.play();
    }
  };
  
  // Enhanced UI State Management
  const toggleVoiceAssistant = () => {
    setShowVoice(!showVoice);
    if (!showVoice && conversationContext.userPreferences.voiceEnabled) {
      // Auto-start listening when voice assistant is opened
      setTimeout(() => startVoiceRecording(), 500);
    }
  };

  const PropertyCard = ({ property }: { property: any }) => (
    <Card className="w-80 flex-shrink-0">
      <CardContent className="p-0">
        <ImageWithFallback
          src={property.image}
          alt={property.name}
          className="w-full h-32 object-cover rounded-t-lg"
        />
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium">{property.name}</h4>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm">{property.rating}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{property.location}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {property.features.map((feature: string) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-primary">
              €{property.price}/night
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Heart className="h-3 w-3" />
              </Button>
              <Button size="sm">Book Now</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      {message.type === 'ai' && (
        <Avatar className="h-8 w-8 mr-3 mt-1">
          <AvatarFallback className="bg-primary text-black">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${message.type === 'system' ? 'mx-auto' : ''}`}>
        <div
          className={`p-3 rounded-lg ${
            message.type === 'user'
              ? 'bg-primary text-black'
              : message.type === 'ai'
              ? 'bg-muted'
              : 'bg-muted/50 text-center text-sm'
          }`}
        >
          {message.content}
        </div>
        
        {message.richContent && message.richContent.type === 'property' && (
          <div className="mt-3">
            <ScrollArea className="w-full">
              <div className="flex space-x-3 pb-2">
                {message.richContent.data.recommendations.map((property: any) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-2">
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.type === 'ai' && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
              <Volume2 className="h-3 w-3 mr-1" />
              Play
            </Button>
          )}
        </div>
      </div>
      
      {message.type === 'user' && (
        <Avatar className="h-8 w-8 ml-3 mt-1">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Context & Features */}
      <div className="w-80 border-r bg-muted/30 p-4 hidden lg:block">
        <div className="space-y-6">
          {/* Context Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Travel Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.weather}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.nextTrip}</span>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Modal Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Brain className="h-4 w-4 text-primary" />
                <span>AI Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Voice Assistant Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="h-4 w-4" />
                  <span className="text-sm">Voice Assistant</span>
                </div>
                <Button
                  variant={conversationContext.userPreferences.voiceEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConversationContext(prev => ({
                    ...prev,
                    userPreferences: {
                      ...prev.userPreferences,
                      voiceEnabled: !prev.userPreferences.voiceEnabled
                    }
                  }))}
                >
                  {conversationContext.userPreferences.voiceEnabled ? 'On' : 'Off'}
                </Button>
              </div>
              
              {/* Multi-Modal Features */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Image Recognition</span>
                </div>
                <Button
                  variant={conversationContext.userPreferences.multiModalEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConversationContext(prev => ({
                    ...prev,
                    userPreferences: {
                      ...prev.userPreferences,
                      multiModalEnabled: !prev.userPreferences.multiModalEnabled
                    }
                  }))}
                >
                  {conversationContext.userPreferences.multiModalEnabled ? 'On' : 'Off'}
                </Button>
              </div>
              
              {/* Auto-Translation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4" />
                  <span className="text-sm">Auto-Translate</span>
                </div>
                <Button
                  variant={conversationContext.userPreferences.autoTranslate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConversationContext(prev => ({
                    ...prev,
                    userPreferences: {
                      ...prev.userPreferences,
                      autoTranslate: !prev.userPreferences.autoTranslate
                    }
                  }))}
                >
                  {conversationContext.userPreferences.autoTranslate ? 'On' : 'Off'}
                </Button>
              </div>
              
              {/* Advanced Translation Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Advanced Mode</span>
                </div>
                <Button
                  variant={translationMode === 'advanced' ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAdvancedTranslation}
                >
                  {translationMode === 'advanced' ? 'On' : 'Off'}
                </Button>
              </div>
              
              {/* Language Learning Progress */}
              {learningProgress.phrasesLearned > 0 && (
                <div className="p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700">Learning Progress</span>
                    <Badge variant="secondary">{learningProgress.totalPoints} XP</Badge>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {learningProgress.phrasesLearned} phrases • {learningProgress.streakDays} day streak
                  </div>
                </div>
              )}
              
              {/* Emotional Tone */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Response Tone</span>
                </div>
                <select
                  value={conversationContext.userPreferences.emotionalTone}
                  onChange={(e) => setConversationContext(prev => ({
                    ...prev,
                    userPreferences: {
                      ...prev.userPreferences,
                      emotionalTone: e.target.value as any
                    }
                  }))}
                  className="w-full text-sm p-2 border rounded"
                >
                  <option value="adaptive">Adaptive</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowRecommendations(!showRecommendations)}
              >
                <Star className="h-4 w-4 mr-2" />
                View Recommendations
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={toggleVoiceAssistant}
              >
                <Mic className="h-4 w-4 mr-2" />
                {voiceState.isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Info className="h-4 w-4 mr-2" />
                Smart Updates
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  // Clear conversation and reset context
                  setMessages([{
                    id: 'reset',
                    type: 'system',
                    content: 'Conversation cleared. How can I help you today?',
                    timestamp: new Date()
                  }]);
                  setConversationContext(prev => ({
                    ...prev,
                    currentTopic: 'general',
                    previousTopics: [],
                    messageCount: 0,
                    conversationFlow: [],
                    interruptions: [],
                    proactiveSuggestions: []
                  }));
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Conversation
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Emergency Help
              </Button>
            </CardContent>
          </Card>

          {/* Conversation Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Session Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{conversationContext.messageCount}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{conversationContext.previousTopics.length + 1}</div>
                  <div className="text-xs text-muted-foreground">Topics</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{conversationContext.interruptions.length}</div>
                  <div className="text-xs text-muted-foreground">Interruptions</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">{conversationContext.proactiveSuggestions.length}</div>
                  <div className="text-xs text-muted-foreground">Suggestions</div>
                </div>
              </div>
              
              <Separator />
              
              {/* Current Context */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Topic:</span>
                  <Badge variant="outline" className="text-xs">
                    {conversationContext.currentTopic}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sentiment:</span>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      conversationContext.sentiment.current === 'joy' ? 'bg-yellow-400' :
                      conversationContext.sentiment.current === 'excitement' ? 'bg-orange-400' :
                      conversationContext.sentiment.current === 'neutral' ? 'bg-gray-400' :
                      conversationContext.sentiment.current === 'sadness' ? 'bg-blue-400' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-xs capitalize">{conversationContext.sentiment.current}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trend:</span>
                  <div className="flex items-center space-x-1">
                    {conversationContext.sentiment.trend === 'improving' && <ChevronDown className="h-3 w-3 rotate-180 text-green-500" />}
                    {conversationContext.sentiment.trend === 'declining' && <ChevronDown className="h-3 w-3 text-red-500" />}
                    {conversationContext.sentiment.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                    <span className="text-xs capitalize">{conversationContext.sentiment.trend}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>Recent Topics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversationContext.previousTopics.length > 0 ? (
                conversationContext.previousTopics.slice(-5).map((topic, index) => (
                  <div 
                    key={index}
                    className="text-sm p-2 hover:bg-muted rounded cursor-pointer flex items-center justify-between"
                    onClick={() => setConversationContext(prev => ({ ...prev, currentTopic: topic }))}
                  >
                    <span className="capitalize">{topic}</span>
                    <ChevronDown className="h-3 w-3 -rotate-90" />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No previous topics yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Chat Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-black">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">TouriQuest AI Assistant</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      voiceState.isRecording ? 'bg-red-500 animate-pulse' :
                      voiceState.isTranscribing ? 'bg-yellow-500 animate-pulse' :
                      voiceState.isSynthesizing ? 'bg-blue-500 animate-pulse' :
                      isTyping ? 'bg-purple-500 animate-pulse' :
                      'bg-green-500'
                    }`}></div>
                    <span>
                      {voiceState.isRecording ? 'Listening...' :
                       voiceState.isTranscribing ? 'Processing...' :
                       voiceState.isSynthesizing ? 'Speaking...' :
                       isTyping ? 'Thinking...' :
                       'Ready to help'}
                    </span>
                  </div>
                  
                  {/* Multi-Modal Status Indicators */}
                  <div className="flex items-center space-x-2">
                    {conversationContext.userPreferences.voiceEnabled && (
                      <div className="flex items-center space-x-1">
                        <Volume2 className="h-3 w-3 text-green-600" />
                        <span className="text-xs">Voice</span>
                      </div>
                    )}
                    {conversationContext.userPreferences.multiModalEnabled && (
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3 text-blue-600" />
                        <span className="text-xs">Vision</span>
                      </div>
                    )}
                    {conversationContext.userPreferences.autoTranslate && (
                      <div className="flex items-center space-x-1">
                        <Languages className="h-3 w-3 text-purple-600" />
                        <span className="text-xs">{selectedLanguage.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Multi-Modal Quick Access */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowImageCapture(!showImageCapture)}
                className={showImageCapture ? 'bg-muted' : ''}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowDocumentScan(!showDocumentScan)}
                className={showDocumentScan ? 'bg-muted' : ''}
              >
                <Scan className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowTranslation(!showTranslation)}
                className={showTranslation ? 'bg-muted' : ''}
              >
                <Languages className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Advanced AI System Buttons */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowContentAnalysis(true)}
                title="Content Analysis"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowPredictiveIntelligence(true)}
                title="Predictive Intelligence"
              >
                <Zap className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowMemoryLearning(true)}
                title="Memory & Learning"
              >
                <Brain className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowEnhancedUX(true)}
                title="Enhanced Chat UX"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isTyping && (
              <div className="flex justify-start mb-4">
                <Avatar className="h-8 w-8 mr-3 mt-1">
                  <AvatarFallback className="bg-primary text-black">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Suggestions */}
        <div className="p-4 border-t border-b">
          <ScrollArea className="w-full">
            <div className="flex space-x-2 pb-2">
              {quickSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="whitespace-nowrap"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced Multi-Modal Input Area */}
        <div className="p-4 bg-muted/30">
          {/* Voice Recording Indicator */}
          {voiceState.isRecording && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-700">Recording...</span>
                  <span className="text-sm text-red-600">{Math.floor(voiceState.recordingDuration)}s</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopVoiceRecording}
                  className="text-red-600 hover:text-red-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
              
              {/* Real-time waveform */}
              <div className="flex items-center space-x-1 h-8 bg-red-100 rounded p-2">
                {voiceState.waveformData.slice(0, 32).map((value, index) => (
                  <div
                    key={index}
                    className="bg-red-500 w-1 rounded-full transition-all duration-100"
                    style={{ height: `${Math.max(2, value * 100)}%` }}
                  />
                ))}
              </div>
              
              {/* Audio level indicator */}
              <div className="mt-2 flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-red-600" />
                <div className="flex-1 bg-red-200 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-100"
                    style={{ width: `${voiceState.audioLevel * 100}%` }}
                  />
                </div>
              </div>
              
              {voiceState.transcriptionError && (
                <div className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{voiceState.transcriptionError}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Transcription Processing */}
          {voiceState.isTranscribing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Processing voice input...</span>
              </div>
            </div>
          )}
          
          {/* Proactive Suggestions */}
          {conversationContext.proactiveSuggestions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center space-x-1">
                <Wand2 className="h-4 w-4" />
                <span>Suggestions for you:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {conversationContext.proactiveSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(suggestion.content)}
                    className="text-xs h-8"
                  >
                    {suggestion.type === 'question' && <MessageSquare className="h-3 w-3 mr-1" />}
                    {suggestion.type === 'recommendation' && <Star className="h-3 w-3 mr-1" />}
                    {suggestion.type === 'follow-up' && <Zap className="h-3 w-3 mr-1" />}
                    {suggestion.content}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Input Container */}
          <div className="flex items-end space-x-2">
            <div className="flex-1 bg-background border rounded-lg p-3">
              {/* Language Selector */}
              {conversationContext.userPreferences.multiModalEnabled && (
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <div className="flex items-center space-x-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="text-sm bg-transparent border-none outline-none"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
                      <option value="pt">Português</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="zh">中文</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setConversationContext(prev => ({
                        ...prev,
                        userPreferences: {
                          ...prev.userPreferences,
                          voiceEnabled: !prev.userPreferences.voiceEnabled
                        }
                      }))}
                      title="Toggle voice features"
                    >
                      {conversationContext.userPreferences.voiceEnabled ? 
                        <Volume2 className="h-3 w-3" /> : 
                        <VolumeX className="h-3 w-3" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setConversationContext(prev => ({
                        ...prev,
                        userPreferences: {
                          ...prev.userPreferences,
                          autoTranslate: !prev.userPreferences.autoTranslate
                        }
                      }))}
                      title="Auto-translate responses"
                    >
                      {conversationContext.userPreferences.autoTranslate ? 
                        <CheckCircle className="h-3 w-3 text-green-600" /> : 
                        <Languages className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Text Input with Multi-Modal Controls */}
              <div className="flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={voiceState.isRecording ? "Listening..." : "Ask me anything about your trip..."}
                  className="flex-1 border-none p-0 focus:ring-0"
                  disabled={voiceState.isRecording}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }
                  }}
                />
                
                <div className="flex items-center space-x-1">
                  {/* Emoji Picker */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  
                  {/* Image Upload */}
                  <label>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      asChild
                    >
                      <div>
                        <Camera className="h-4 w-4" />
                      </div>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Document Upload */}
                  <label>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      asChild
                    >
                      <div>
                        <Scan className="h-4 w-4" />
                      </div>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      multiple
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Camera Translation */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowCameraTranslation(true)}
                    title="Camera Translation - Translate text from photos"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>

                  {/* Voice Translation */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowVoiceTranslation(true)}
                    title="Voice Translation - Real-time conversation translation"
                  >
                    <Languages className="h-4 w-4" />
                  </Button>

                  {/* Language Learning Game */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowLanguageLearning(true)}
                    title="Language Learning - Practice phrases and earn achievements"
                  >
                    <Star className="h-4 w-4" />
                  </Button>

                  {/* Advanced Translation System */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setTranslationMode('advanced')}
                    title="Advanced Translation Hub - All translation features"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>

                  {/* Itinerary Generator */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowItineraryGenerator(true)}
                    title="AI Trip Planner - Generate intelligent itineraries"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>

                  {/* Personalized Recommendations */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowPersonalizedRecommendations(true)}
                    title="Personalized Recommendations - AI-powered suggestions"
                  >
                    <Brain className="h-4 w-4" />
                  </Button>

                  {/* Dynamic Optimization */}
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowDynamicOptimization(true)}
                    title="Dynamic Optimization - Real-time itinerary optimization"
                    disabled={!currentItinerary}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>

                  {/* Voice Input Toggle */}
                  <Button 
                    variant={voiceState.isRecording ? "default" : "ghost"}
                    size="icon" 
                    className={`h-8 w-8 ${voiceState.isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                    onClick={handleVoiceToggle}
                    disabled={voiceState.isTranscribing}
                  >
                    {voiceState.isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : voiceState.isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* AI Brain Indicator */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="AI is thinking..."
                    disabled
                  >
                    <Brain className={`h-4 w-4 ${isTyping ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Send Button */}
            <Button 
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || voiceState.isRecording || voiceState.isTranscribing}
              className="px-4"
            >
              {voiceState.isSynthesizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Enhanced Footer */}
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Session: {conversationContext.messageCount} messages</span>
              <span>Topic: {conversationContext.currentTopic}</span>
              <span>Sentiment: {conversationContext.sentiment.current}</span>
              {conversationContext.interruptions.length > 0 && (
                <span className="text-orange-600">{conversationContext.interruptions.length} interruptions</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span>AI responses may not be accurate. Verify important information.</span>
              {conversationContext.userPreferences.contextRetention !== 'session' && (
                <Badge variant="outline" className="text-xs">
                  {conversationContext.userPreferences.contextRetention} memory
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Side Panels */}
      {showVoice && (
        <VoiceAssistant onClose={() => setShowVoice(false)} />
      )}
      
      {showRecommendations && (
        <AIRecommendations onClose={() => setShowRecommendations(false)} />
      )}
      
      {showNotifications && (
        <SmartNotifications onClose={() => setShowNotifications(false)} />
      )}
      
      {/* Advanced Translation Components */}
      {showAdvancedTranslation && (
        <div className="w-96 border-l">
          <TranslationSystem 
            onClose={() => setShowAdvancedTranslation(false)}
            initialLanguage={selectedLanguage}
          />
        </div>
      )}
      
      {showLanguageLearning && (
        <div className="w-96 border-l">
          <LanguageLearningGame 
            targetLanguage={learningProgress.targetLanguage}
            currentLevel={learningProgress.level}
            onClose={() => setShowLanguageLearning(false)}
          />
        </div>
      )}
      
      {showCameraTranslation && (
        <div className="w-96 border-l">
          <CameraTranslation 
            onClose={() => setShowCameraTranslation(false)}
            targetLanguage={selectedLanguage}
          />
        </div>
      )}
      
      {showVoiceTranslation && (
        <div className="w-96 border-l">
          <VoiceTranslation 
            onClose={() => setShowVoiceTranslation(false)}
            targetLanguage={selectedLanguage}
          />
        </div>
      )}
      
      {/* Multi-Modal Feature Panels */}
      {showImageCapture && (
        <div className="w-80 border-l bg-background p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Image Analysis</span>
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowImageCapture(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Upload an image to analyze landmarks, read text, or identify objects.
            </div>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <label className="cursor-pointer">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-sm font-medium mb-2">Click to upload image</div>
                <div className="text-xs text-muted-foreground">JPG, PNG up to 10MB</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Features:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Landmark identification</li>
                <li>Text extraction & translation</li>
                <li>Object recognition</li>
                <li>Menu & sign reading</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {showDocumentScan && (
        <div className="w-80 border-l bg-background p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Scan className="h-5 w-5" />
              <span>Document Scanner</span>
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowDocumentScan(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Scan travel documents to extract key information.
            </div>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <label className="cursor-pointer">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-sm font-medium mb-2">Click to upload document</div>
                <div className="text-xs text-muted-foreground">PDF, JPG, PNG up to 15MB</div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Supported Documents:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Booking confirmations</li>
                <li>Itineraries</li>
                <li>Tickets & vouchers</li>
                <li>Menus & receipts</li>
                <li>Travel documents</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {showTranslation && (
        <div className="w-80 border-l bg-background p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Languages className="h-5 w-5" />
              <span>Translation Hub</span>
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowTranslation(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Translate to:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-translate responses</span>
                <Button
                  variant={conversationContext.userPreferences.autoTranslate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConversationContext(prev => ({
                    ...prev,
                    userPreferences: {
                      ...prev.userPreferences,
                      autoTranslate: !prev.userPreferences.autoTranslate
                    }
                  }))}
                >
                  {conversationContext.userPreferences.autoTranslate ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-xs text-muted-foreground">
              <strong>Translation Features:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Real-time conversation translation</li>
                <li>Cultural context & etiquette</li>
                <li>Travel phrase learning</li>
                <li>Offline translation (10 languages)</li>
                <li>Camera-based text translation</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Translation System */}
      {translationMode === 'advanced' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] overflow-hidden">
            <TranslationSystem 
              onClose={() => setTranslationMode('basic')}
              initialLanguage={selectedLanguage}
            />
          </div>
        </div>
      )}

      {/* Camera Translation Component */}
      {showCameraTranslation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] overflow-hidden">
            <CameraTranslation 
              onClose={() => setShowCameraTranslation(false)}
              targetLanguage={selectedLanguage}
            />
          </div>
        </div>
      )}

      {/* Voice Translation Component */}
      {showVoiceTranslation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] overflow-hidden">
            <VoiceTranslation 
              onClose={() => setShowVoiceTranslation(false)}
              sourceLanguage="auto"
              targetLanguage={selectedLanguage}
            />
          </div>
        </div>
      )}

      {/* Language Learning Game */}
      {showLanguageLearning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] overflow-hidden">
            <LanguageLearningGame 
              onClose={() => setShowLanguageLearning(false)}
              targetLanguage={selectedLanguage}
              currentLevel={learningProgress.level}
            />
          </div>
        </div>
      )}

      {/* Itinerary Generator */}
      {showItineraryGenerator && (
        <ItineraryGenerator 
          onClose={() => setShowItineraryGenerator(false)}
          initialRequest=""
          currentLocation={{ lat: 0, lng: 0, name: "Current Location" }}
          userPreferences={{
            interests: ['culture', 'food', 'adventure'],
            budgetRange: [500, 2000],
            groupSize: 2,
            travelStyle: 'mid-range',
            mobility: 'mixed',
            energyLevel: 'medium',
            socialPreference: 'flexible'
          }}
        />
      )}

      {/* Personalized Recommendations */}
      {showPersonalizedRecommendations && (
        <PersonalizedRecommendations 
          onClose={() => setShowPersonalizedRecommendations(false)}
          currentLocation={{ lat: 0, lng: 0, name: "Current Location" }}
          userPreferences={{
            interests: ['culture', 'food', 'adventure'],
            budgetPatterns: [],
            seasonalPreferences: [],
            socialPreferences: {
              networkInfluence: 50,
              friendRecommendations: true,
              socialSharing: true,
              groupBookingPreference: false
            },
            travelStyle: 'mid-range',
            activityLevel: 'medium',
            riskTolerance: 'moderate',
            groupDynamics: {
              decisionMaker: 'collaborative',
              compromiseStyle: 'balanced',
              conflictResolution: 'discussion'
            },
            learningProfile: {
              adaptationSpeed: 'medium',
              feedbackSensitivity: 'medium',
              explorationVsExploitation: 70
            }
          }}
          contextData={{
            currentWeather: {
              current: {
                temperature: 22,
                condition: 'Clear',
                humidity: 60,
                windSpeed: 5,
                uvIndex: 6
              },
              forecast: { hourly: [], daily: [] },
              recommendations: [],
              alerts: []
            },
            timeOfDay: {
              hour: new Date().getHours(),
              period: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
              dayType: 'weekday',
              energyLevel: 'medium'
            },
            crowdLevels: {
              level: 'medium',
              prediction: [],
              alternatives: []
            },
            localEvents: [],
            seasonalFactors: {
              season: 'spring',
              touristSeason: 'medium',
              localHolidays: [],
              weatherTrends: []
            },
            userState: {
              batteryLevel: 80,
              connectivityQuality: 'good',
              currentActivity: 'planning',
              companionCount: 1,
              stressLevel: 'low',
              hungerLevel: 'medium',
              energyLevel: 'medium'
            }
          }}
        />
      )}

      {/* Dynamic Optimization */}
      {showDynamicOptimization && currentItinerary && (
        <DynamicOptimization 
          onClose={() => setShowDynamicOptimization(false)}
          itinerary={currentItinerary}
          onItineraryUpdate={setCurrentItinerary}
          realTimeData={{
            weather: {
              condition: 'Clear',
              temperature: { current: 22, feels_like: 24, min: 18, max: 26 },
              precipitation: { probability: 10, amount: 0 },
              wind: { speed: 5, direction: 'NE' },
              visibility: 10,
              uvIndex: 6,
              alerts: [],
              impact: {
                overallScore: 85,
                activityImpacts: [],
                recommendations: []
              }
            },
            traffic: {
              overallCondition: 'moderate',
              delays: [],
              incidents: [],
              alternatives: []
            },
            crowds: {
              venues: [],
              predictions: [],
              recommendations: []
            },
            events: [],
            incidents: [],
            pricing: {
              surgeMultipliers: [],
              discounts: [],
              recommendations: []
            }
          }}
          optimizationPreferences={{
            autoOptimization: true,
            optimizationFrequency: 15,
            priorities: {
              weather: 0.9,
              crowds: 0.7,
              traffic: 0.8,
              energy: 0.6,
              budget: 0.5,
              time: 0.8
            },
            riskTolerance: 'moderate',
            notificationLevel: 'important'
          }}
        />
      )}

      {/* Content Analysis System */}
      {showContentAnalysis && (
        <ContentAnalysisSystem 
          onClose={() => setShowContentAnalysis(false)}
        />
      )}

      {/* Predictive Intelligence System */}
      {showPredictiveIntelligence && (
        <PredictiveIntelligenceSystem 
          onClose={() => setShowPredictiveIntelligence(false)}
          currentLocation={{ lat: 0, lng: 0, name: "Current Location" }}
          userProfile={{
            travelHistory: [],
            preferences: {
              activities: ['culture', 'food', 'adventure'],
              budget: { min: 500, max: 2000 },
              groupSize: 2,
              riskTolerance: 'medium' as const
            }
          }}
        />
      )}

      {/* Memory & Learning System */}
      {showMemoryLearning && (
        <MemoryLearningSystem 
          onClose={() => setShowMemoryLearning(false)}
          userId="user-123"
        />
      )}

      {/* Enhanced Conversational UX */}
      {showEnhancedUX && (
        <ConversationalUXSystem 
          onClose={() => setShowEnhancedUX(false)}
          messages={[]}
          onSendMessage={(msg: string) => {
            // Handle enhanced UX message sending
            const newMessage = {
              id: Date.now().toString(),
              type: 'user' as const,
              content: msg,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
          }}
          onVoiceInput={() => {
            if (voiceState.isRecording) {
              stopVoiceRecording();
            } else {
              startVoiceRecording();
            }
          }}
          isTyping={isTyping}
          isVoiceMode={conversationContext.userPreferences.voiceEnabled}
          conversationId={conversationContext.sessionId}
        />
      )}
    </div>
  );
}
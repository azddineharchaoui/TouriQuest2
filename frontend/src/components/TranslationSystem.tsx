import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Languages, 
  Camera, 
  Mic, 
  MicOff,
  Volume2, 
  VolumeX,
  Eye,
  EyeOff,
  Download,
  Upload,
  Settings,
  BookOpen,
  Globe,
  MessageCircle,
  Star,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Share2,
  Heart,
  Trophy,
  Headphones,
  FileText,
  Scan,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Minus,
  Sparkles,
  Target,
  Clock,
  Zap,
  Users,
  Brain,
  Circle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

interface TranslationSystemProps {
  onClose?: () => void;
  initialLanguage?: string;
}

// Language data with extended cultural information
const LANGUAGES = {
  en: { 
    name: 'English', 
    flag: '🇺🇸', 
    region: 'Global',
    speakers: '1.5B',
    difficulty: 'Medium',
    script: 'Latin',
    rtl: false
  },
  es: { 
    name: 'Español', 
    flag: '🇪🇸', 
    region: 'Spain & Latin America',
    speakers: '500M',
    difficulty: 'Medium',
    script: 'Latin',
    rtl: false
  },
  fr: { 
    name: 'Français', 
    flag: '🇫🇷', 
    region: 'France & Francophone',
    speakers: '280M',
    difficulty: 'Hard',
    script: 'Latin',
    rtl: false
  },
  de: { 
    name: 'Deutsch', 
    flag: '🇩🇪', 
    region: 'Germany & Central Europe',
    speakers: '100M',
    difficulty: 'Hard',
    script: 'Latin',
    rtl: false
  },
  it: { 
    name: 'Italiano', 
    flag: '🇮🇹', 
    region: 'Italy',
    speakers: '65M',
    difficulty: 'Medium',
    script: 'Latin',
    rtl: false
  },
  pt: { 
    name: 'Português', 
    flag: '🇵🇹', 
    region: 'Portugal & Brazil',
    speakers: '260M',
    difficulty: 'Medium',
    script: 'Latin',
    rtl: false
  },
  ja: { 
    name: '日本語', 
    flag: '🇯🇵', 
    region: 'Japan',
    speakers: '125M',
    difficulty: 'Very Hard',
    script: 'Hiragana/Katakana/Kanji',
    rtl: false
  },
  ko: { 
    name: '한국어', 
    flag: '🇰🇷', 
    region: 'Korea',
    speakers: '77M',
    difficulty: 'Hard',
    script: 'Hangul',
    rtl: false
  },
  zh: { 
    name: '中文', 
    flag: '🇨🇳', 
    region: 'China & Taiwan',
    speakers: '1.1B',
    difficulty: 'Very Hard',
    script: 'Chinese Characters',
    rtl: false
  },
  ar: { 
    name: 'العربية', 
    flag: '🇸🇦', 
    region: 'Middle East & North Africa',
    speakers: '350M',
    difficulty: 'Very Hard',
    script: 'Arabic',
    rtl: true
  },
  ru: { 
    name: 'Русский', 
    flag: '🇷🇺', 
    region: 'Russia & Eastern Europe',
    speakers: '260M',
    difficulty: 'Very Hard',
    script: 'Cyrillic',
    rtl: false
  },
  hi: { 
    name: 'हिन्दी', 
    flag: '🇮🇳', 
    region: 'India',
    speakers: '600M',
    difficulty: 'Hard',
    script: 'Devanagari',
    rtl: false
  }
};

// Cultural etiquette data
const CULTURAL_ETIQUETTE = {
  en: {
    greetings: ['Hello', 'Good morning', 'How are you?'],
    courtesy: ['Please', 'Thank you', 'Excuse me', 'I\'m sorry'],
    dining: ['May I have the menu?', 'The bill, please', 'It was delicious'],
    tips: [
      'Maintain eye contact when speaking',
      'Queue politely and wait your turn',
      'Tipping is customary in restaurants (15-20%)',
      'Be punctual for appointments'
    ]
  },
  ja: {
    greetings: ['こんにちは', 'おはようございます', 'お元気ですか？'],
    courtesy: ['お願いします', 'ありがとうございます', 'すみません', 'ごめんなさい'],
    dining: ['メニューをお願いします', 'お会計お願いします', 'おいしかったです'],
    tips: [
      'Bow when greeting (deeper bow shows more respect)',
      'Remove shoes when entering homes and some restaurants',
      'Don\'t tip - it\'s considered rude',
      'Use both hands when receiving business cards',
      'Slurping noodles is acceptable and shows appreciation'
    ]
  },
  fr: {
    greetings: ['Bonjour', 'Bonsoir', 'Comment allez-vous?'],
    courtesy: ['S\'il vous plaît', 'Merci', 'Excusez-moi', 'Je suis désolé(e)'],
    dining: ['Puis-je avoir la carte?', 'L\'addition, s\'il vous plaît', 'C\'était délicieux'],
    tips: [
      'Always greet with "Bonjour" when entering shops',
      'Use "vous" unless invited to use "tu"',
      'Keep hands visible on the table while dining',
      'Say "Bon appétit" before starting to eat'
    ]
  }
};

// Travel phrases by category
const TRAVEL_PHRASES = {
  essentials: {
    en: [
      { phrase: 'Hello', pronunciation: 'HEH-loh', situation: 'Greeting anyone' },
      { phrase: 'Thank you', pronunciation: 'THANK you', situation: 'Showing gratitude' },
      { phrase: 'Excuse me', pronunciation: 'ik-SKYOOS mee', situation: 'Getting attention or apologizing' },
      { phrase: 'Do you speak English?', pronunciation: 'doo yoo speek ING-glish', situation: 'Language barrier' },
      { phrase: 'I don\'t understand', pronunciation: 'eye dohnt un-der-STAND', situation: 'Communication difficulty' }
    ],
    es: [
      { phrase: 'Hola', pronunciation: 'OH-lah', situation: 'Greeting anyone' },
      { phrase: 'Gracias', pronunciation: 'GRAH-see-ahs', situation: 'Showing gratitude' },
      { phrase: 'Perdón', pronunciation: 'per-DOHN', situation: 'Getting attention or apologizing' },
      { phrase: '¿Habla inglés?', pronunciation: 'AH-blah in-GLAYS', situation: 'Language barrier' },
      { phrase: 'No entiendo', pronunciation: 'noh en-tee-EN-doh', situation: 'Communication difficulty' }
    ],
    fr: [
      { phrase: 'Bonjour', pronunciation: 'bohn-ZHOOR', situation: 'Greeting (morning/afternoon)' },
      { phrase: 'Merci', pronunciation: 'mer-SEE', situation: 'Showing gratitude' },
      { phrase: 'Excusez-moi', pronunciation: 'eks-kew-zay MWAH', situation: 'Getting attention or apologizing' },
      { phrase: 'Parlez-vous anglais?', pronunciation: 'par-lay voo ahn-GLAY', situation: 'Language barrier' },
      { phrase: 'Je ne comprends pas', pronunciation: 'zhuh nuh kom-prahn PAH', situation: 'Communication difficulty' }
    ]
  },
  navigation: {
    en: [
      { phrase: 'Where is...?', pronunciation: 'wair iz', situation: 'Asking for directions' },
      { phrase: 'How do I get to...?', pronunciation: 'how doo eye get too', situation: 'Asking for route' },
      { phrase: 'Is it far?', pronunciation: 'iz it far', situation: 'Distance inquiry' },
      { phrase: 'Left/Right', pronunciation: 'left/right', situation: 'Direction indication' }
    ],
    es: [
      { phrase: '¿Dónde está...?', pronunciation: 'DOHN-deh es-TAH', situation: 'Asking for directions' },
      { phrase: '¿Cómo llego a...?', pronunciation: 'KOH-moh YEH-goh ah', situation: 'Asking for route' },
      { phrase: '¿Está lejos?', pronunciation: 'es-TAH LEH-hohs', situation: 'Distance inquiry' },
      { phrase: 'Izquierda/Derecha', pronunciation: 'ees-kee-ER-dah/deh-REH-chah', situation: 'Direction indication' }
    ]
  },
  dining: {
    en: [
      { phrase: 'A table for two, please', pronunciation: 'ah TAY-bul for too pleez', situation: 'Restaurant reservation' },
      { phrase: 'What do you recommend?', pronunciation: 'wot doo yoo rek-uh-MEND', situation: 'Menu assistance' },
      { phrase: 'The bill, please', pronunciation: 'thuh bil pleez', situation: 'Paying at restaurant' },
      { phrase: 'Is service included?', pronunciation: 'iz SER-vis in-KLOO-ded', situation: 'Tipping question' }
    ]
  },
  emergency: {
    en: [
      { phrase: 'Help!', pronunciation: 'help', situation: 'Emergency assistance' },
      { phrase: 'Call the police', pronunciation: 'kawl thuh puh-LEES', situation: 'Emergency services' },
      { phrase: 'I need a doctor', pronunciation: 'eye need ah DOK-tor', situation: 'Medical emergency' },
      { phrase: 'Where is the hospital?', pronunciation: 'wair iz thuh HOS-pi-tul', situation: 'Medical facility location' }
    ]
  }
};

export function TranslationSystem({ onClose, initialLanguage = 'en' }: TranslationSystemProps) {
  // Core translation state
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState(initialLanguage);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Feature modes
  const [activeMode, setActiveMode] = useState<'text' | 'voice' | 'camera' | 'conversation' | 'learning'>('text');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Voice translation state
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState(targetLanguage);
  const [conversationMode, setConversationMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    speaker: 'user' | 'other';
    original: string;
    translated: string;
    language: string;
    timestamp: Date;
  }>>([]);
  
  // Camera translation state
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // Language learning state
  const [learningProgress, setLearningProgress] = useState({
    targetLanguage,
    level: 'beginner',
    phrasesLearned: 0,
    streakDays: 0,
    totalPoints: 0
  });
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('essentials');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [showPronunciation, setShowPronunciation] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  
  // Cultural context state
  const [showCulturalTips, setShowCulturalTips] = useState(true);
  const [selectedCulture, setSelectedCulture] = useState(targetLanguage);
  
  // Settings
  const [settings, setSettings] = useState({
    autoDetectLanguage: true,
    saveTranslations: true,
    offlineLanguages: ['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar'],
    voiceSpeed: 1.0,
    voicePitch: 1.0,
    culturalContext: true,
    pronunciationGuide: true
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Translation API integration
  const translateText = async (text: string, from: string = 'auto', to: string = targetLanguage): Promise<string> => {
    if (!text.trim()) return '';
    
    setIsTranslating(true);
    
    try {
      // Check if offline translation is available
      if (isOfflineMode && settings.offlineLanguages.includes(to)) {
        return await offlineTranslate(text, from, to);
      }
      
      const response = await fetch('/api/v1/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text,
          sourceLanguage: from,
          targetLanguage: to,
          culturalContext: settings.culturalContext,
          includeAlternatives: true,
          preserveFormatting: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      const result = await response.json();
      
      // Save translation history if enabled
      if (settings.saveTranslations) {
        saveTranslationHistory(text, result.translatedText, from, to);
      }
      
      return result.translatedText;
      
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to basic translation or offline mode
      return text; // Return original text if translation fails
    } finally {
      setIsTranslating(false);
    }
  };
  
  // Offline translation fallback
  const offlineTranslate = async (text: string, from: string, to: string): Promise<string> => {
    // Implement basic offline translation using pre-loaded dictionaries
    // This would typically use a local translation model or dictionary
    return `[Offline] ${text}`; // Placeholder
  };
  
  // Voice translation functions
  const startVoiceTranslation = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Voice features not supported in this browser');
      return;
    }
    
    try {
      setIsListening(true);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Implement speech recognition
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = conversationMode;
      recognition.interimResults = true;
      recognition.lang = sourceLanguage === 'auto' ? 'en-US' : `${sourceLanguage}-${sourceLanguage.toUpperCase()}`;
      
      recognition.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        
        if (event.results[event.results.length - 1].isFinal) {
          setInputText(transcript);
          const translated = await translateText(transcript, sourceLanguage, targetLanguage);
          setTranslatedText(translated);
          
          if (conversationMode) {
            addToConversationHistory('user', transcript, translated, sourceLanguage);
            // Automatically speak the translation
            speakText(translated, targetLanguage);
          }
        }
      };
      
      recognition.start();
      
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };
  
  const stopVoiceTranslation = () => {
    setIsListening(false);
  };
  
  const speakText = async (text: string, language: string) => {
    if (!window.speechSynthesis) {
      console.warn('Text-to-speech not supported');
      return;
    }
    
    setIsPlaying(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = `${language}-${language.toUpperCase()}`;
    utterance.rate = settings.voiceSpeed;
    utterance.pitch = settings.voicePitch;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };
  
  // Camera translation functions
  const startCameraTranslation = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera not supported in this browser');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
    }
  };
  
  const captureAndTranslate = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessingImage(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      
      try {
        // Extract text from image using OCR API
        const response = await fetch('/api/v1/ai/extract-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            image: imageData,
            language: sourceLanguage
          })
        });
        
        const result = await response.json();
        setExtractedText(result.text);
        
        // Translate extracted text
        const translated = await translateText(result.text, sourceLanguage, targetLanguage);
        setTranslatedText(translated);
        
      } catch (error) {
        console.error('OCR error:', error);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
  };
  
  // Conversation mode functions
  const addToConversationHistory = (speaker: 'user' | 'other', original: string, translated: string, language: string) => {
    const newEntry = {
      id: Date.now().toString(),
      speaker,
      original,
      translated,
      language,
      timestamp: new Date()
    };
    
    setConversationHistory(prev => [...prev, newEntry]);
  };
  
  const clearConversationHistory = () => {
    setConversationHistory([]);
  };
  
  // Language learning functions
  const getCurrentPhrase = () => {
    const phrases = TRAVEL_PHRASES[selectedPhraseCategory as keyof typeof TRAVEL_PHRASES]?.[targetLanguage as keyof typeof TRAVEL_PHRASES.essentials];
    return phrases?.[currentPhraseIndex];
  };
  
  const nextPhrase = () => {
    const phrases = TRAVEL_PHRASES[selectedPhraseCategory as keyof typeof TRAVEL_PHRASES]?.[targetLanguage as keyof typeof TRAVEL_PHRASES.essentials];
    if (phrases && currentPhraseIndex < phrases.length - 1) {
      setCurrentPhraseIndex(prev => prev + 1);
    }
  };
  
  const previousPhrase = () => {
    if (currentPhraseIndex > 0) {
      setCurrentPhraseIndex(prev => prev - 1);
    }
  };
  
  const markPhraseAsLearned = () => {
    setLearningProgress(prev => ({
      ...prev,
      phrasesLearned: prev.phrasesLearned + 1,
      totalPoints: prev.totalPoints + 10
    }));
  };
  
  const startQuiz = () => {
    setQuizMode(true);
    setCurrentQuizQuestion(0);
  };
  
  // Cultural context functions
  const getCulturalTips = (language: string) => {
    return CULTURAL_ETIQUETTE[language as keyof typeof CULTURAL_ETIQUETTE];
  };
  
  // Utility functions
  const saveTranslationHistory = (original: string, translated: string, from: string, to: string) => {
    const history = JSON.parse(localStorage.getItem('translation_history') || '[]');
    history.push({
      original,
      translated,
      from,
      to,
      timestamp: new Date().toISOString()
    });
    // Keep only last 100 translations
    const limitedHistory = history.slice(-100);
    localStorage.setItem('translation_history', JSON.stringify(limitedHistory));
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const handleTextTranslation = async () => {
    if (inputText.trim()) {
      const translated = await translateText(inputText, sourceLanguage, targetLanguage);
      setTranslatedText(translated);
    }
  };
  
  // Effect to handle language changes
  useEffect(() => {
    if (targetLanguage !== learningProgress.targetLanguage) {
      setLearningProgress(prev => ({ ...prev, targetLanguage }));
      setCurrentPhraseIndex(0);
    }
  }, [targetLanguage, learningProgress.targetLanguage]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Languages className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Translation & Language Learning</h2>
          {isOfflineMode && (
            <Badge variant="outline" className="text-xs">
              <Circle className="h-2 w-2 mr-1 fill-orange-500 text-orange-500" />
              Offline Mode
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 m-4">
          <TabsTrigger value="text" className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center space-x-1">
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="camera" className="flex items-center space-x-1">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Camera</span>
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center space-x-1">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Learn</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Language Selection */}
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <select 
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="auto">Auto-detect</option>
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSourceLanguage(targetLanguage);
                setTargetLanguage(sourceLanguage);
              }}
              className="mt-5"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {/* Text Translation Tab */}
          <TabsContent value="text" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Text Translation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Enter text to translate</Label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type or paste text here..."
                    className="w-full p-3 border rounded-lg min-h-[100px] resize-none"
                    dir={LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]?.rtl ? 'rtl' : 'ltr'}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      {inputText.length} characters
                    </span>
                    <Button 
                      onClick={handleTextTranslation}
                      disabled={!inputText.trim() || isTranslating}
                      size="sm"
                    >
                      {isTranslating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Languages className="h-4 w-4 mr-2" />
                      )}
                      Translate
                    </Button>
                  </div>
                </div>
                
                {translatedText && (
                  <div>
                    <Label>Translation</Label>
                    <div className="p-3 bg-muted rounded-lg min-h-[100px]">
                      <p 
                        className="text-sm"
                        dir={LANGUAGES[targetLanguage as keyof typeof LANGUAGES]?.rtl ? 'rtl' : 'ltr'}
                      >
                        {translatedText}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(translatedText)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(translatedText, targetLanguage)}
                        disabled={isPlaying}
                      >
                        {isPlaying ? (
                          <Volume2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        Speak
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Voice Translation Tab */}
          <TabsContent value="voice" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Mic className="h-4 w-4" />
                  <span>Voice Translation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Button
                    onClick={isListening ? stopVoiceTranslation : startVoiceTranslation}
                    size="lg"
                    className={`${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-5 w-5 mr-2" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5 mr-2" />
                        Start Speaking
                      </>
                    )}
                  </Button>
                  
                  {isListening && (
                    <div className="mt-4">
                      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                        <Mic className="h-8 w-8 text-red-500" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Listening... Speak clearly in {LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]?.name || 'detected language'}
                      </p>
                    </div>
                  )}
                </div>
                
                {inputText && (
                  <div>
                    <Label>What you said ({LANGUAGES[sourceLanguage as keyof typeof LANGUAGES]?.name})</Label>
                    <p className="p-3 bg-blue-50 rounded-lg text-sm">{inputText}</p>
                  </div>
                )}
                
                {translatedText && (
                  <div>
                    <Label>Translation ({LANGUAGES[targetLanguage as keyof typeof LANGUAGES]?.name})</Label>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm mb-2">{translatedText}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(translatedText, targetLanguage)}
                        disabled={isPlaying}
                      >
                        {isPlaying ? <Volume2 className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        Speak Translation
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Camera Translation Tab */}
          <TabsContent value="camera" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>Camera Translation</span>
                </CardTitle>
                <CardDescription>
                  Point your camera at text to translate signs, menus, and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!cameraActive ? (
                  <div className="text-center">
                    <Button onClick={startCameraTranslation} size="lg">
                      <Camera className="h-5 w-5 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-48 object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <Button
                          onClick={captureAndTranslate}
                          disabled={isProcessingImage}
                        >
                          {isProcessingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Scan className="h-4 w-4 mr-2" />
                          )}
                          Capture & Translate
                        </Button>
                        <Button variant="outline" onClick={stopCamera}>
                          <X className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      </div>
                    </div>
                    
                    {extractedText && (
                      <div>
                        <Label>Extracted Text</Label>
                        <p className="p-3 bg-blue-50 rounded-lg text-sm">{extractedText}</p>
                      </div>
                    )}
                    
                    {translatedText && (
                      <div>
                        <Label>Translation</Label>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm mb-2">{translatedText}</p>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => speakText(translatedText, targetLanguage)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Speak
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(translatedText)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conversation Mode Tab */}
          <TabsContent value="conversation" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Conversation Mode</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={conversationMode}
                      onCheckedChange={setConversationMode}
                    />
                    <Label className="text-sm">Auto-translate</Label>
                  </div>
                </CardTitle>
                <CardDescription>
                  Real-time two-way conversation translation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Start a conversation to see translations here</p>
                    <Button
                      onClick={startVoiceTranslation}
                      className="mt-4"
                      disabled={isListening}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Start Conversation
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="max-h-60 overflow-y-auto space-y-3 mb-4">
                      {conversationHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs p-3 rounded-lg ${
                              entry.speaker === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm font-medium">{entry.original}</p>
                            <p className="text-xs opacity-75 mt-1">{entry.translated}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-50">
                                {LANGUAGES[entry.language as keyof typeof LANGUAGES]?.flag}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => speakText(entry.translated, targetLanguage)}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={isListening ? stopVoiceTranslation : startVoiceTranslation}
                        className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
                      >
                        {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                        {isListening ? 'Stop' : 'Speak'}
                      </Button>
                      <Button variant="outline" onClick={clearConversationHistory}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Language Learning Tab */}
          <TabsContent value="learning" className="p-4 space-y-4">
            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4" />
                    <span>Learning Progress</span>
                  </div>
                  <Badge variant="secondary">
                    {learningProgress.totalPoints} points
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{learningProgress.phrasesLearned}</div>
                    <div className="text-xs text-muted-foreground">Phrases Learned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{learningProgress.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{learningProgress.level}</div>
                    <div className="text-xs text-muted-foreground">Level</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Phrase Learning */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Travel Phrases</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selection */}
                <div className="flex flex-wrap gap-2">
                  {Object.keys(TRAVEL_PHRASES).map((category) => (
                    <Button
                      key={category}
                      variant={selectedPhraseCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedPhraseCategory(category);
                        setCurrentPhraseIndex(0);
                      }}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>
                
                {/* Current Phrase */}
                {getCurrentPhrase() && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">{getCurrentPhrase().phrase}</h3>
                      {showPronunciation && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Pronunciation: {getCurrentPhrase().pronunciation}
                        </p>
                      )}
                      <p className="text-xs text-blue-600">{getCurrentPhrase().situation}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={previousPhrase}
                        disabled={currentPhraseIndex === 0}
                      >
                        <ChevronDown className="h-4 w-4 rotate-90" />
                        Previous
                      </Button>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speakText(getCurrentPhrase().phrase, targetLanguage)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPronunciation(!showPronunciation)}
                        >
                          {showPronunciation ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={markPhraseAsLearned}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextPhrase}
                        disabled={currentPhraseIndex >= (TRAVEL_PHRASES[selectedPhraseCategory as keyof typeof TRAVEL_PHRASES]?.[targetLanguage as keyof typeof TRAVEL_PHRASES.essentials]?.length || 0) - 1}
                      >
                        Next
                        <ChevronUp className="h-4 w-4 rotate-90" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button onClick={startQuiz} className="flex-1">
                    <Brain className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Target className="h-4 w-4 mr-2" />
                    Practice Game
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Cultural Context */}
            {showCulturalTips && getCulturalTips(targetLanguage) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Cultural Context</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getCulturalTips(targetLanguage).tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                      <p className="text-sm">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
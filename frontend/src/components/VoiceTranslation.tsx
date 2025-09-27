import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Play, 
  Pause,
  Square,
  RotateCcw,
  Languages,
  Users,
  Settings,
  Download,
  Copy,
  Share2,
  X,
  Loader2,
  Radio,
  Headphones,
  MessageCircle,
  Globe,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';

interface VoiceTranslationProps {
  onClose?: () => void;
  sourceLanguage?: string;
  targetLanguage?: string;
}

interface ConversationEntry {
  id: string;
  speaker: 'user' | 'other';
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: Date;
  confidence: number;
  audioUrl?: string;
}

interface VoiceSettings {
  noiseReduction: boolean;
  autoSpeak: boolean;
  conversationMode: boolean;
  voiceSpeed: number;
  voicePitch: number;
  micSensitivity: number;
  autoLanguageDetection: boolean;
  saveConversations: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
];

export function VoiceTranslation({ onClose, sourceLanguage = 'auto', targetLanguage = 'en' }: VoiceTranslationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Language state
  const [fromLanguage, setFromLanguage] = useState(sourceLanguage);
  const [toLanguage, setToLanguage] = useState(targetLanguage);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<VoiceSettings>({
    noiseReduction: true,
    autoSpeak: true,
    conversationMode: false,
    voiceSpeed: 1.0,
    voicePitch: 1.0,
    micSensitivity: 0.5,
    autoLanguageDetection: true,
    saveConversations: true
  });
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio context and media recorder
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: settings.noiseReduction,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio context for volume monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        audioChunks.length = 0;
      };
      
      return true;
    } catch (error) {
      setError('Microphone access denied or not available');
      console.error('Audio initialization error:', error);
      return false;
    }
  };
  
  const startListening = async () => {
    const initialized = await initializeAudio();
    if (!initialized) return;
    
    setIsListening(true);
    setCurrentText('');
    setError(null);
    setRecordingDuration(0);
    
    // Start recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
    }
    
    // Start recording timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    // Start audio level monitoring
    monitorAudioLevel();
  };
  
  const stopListening = () => {
    setIsListening(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
    }
    
    // Clean up streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setAudioLevel(0);
  };
  
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isListening) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      
      setAudioLevel(normalizedLevel);
      
      if (isListening) {
        audioLevelTimerRef.current = setTimeout(updateLevel, 100);
      }
    };
    
    updateLevel();
  };
  
  const processAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Convert audio to base64 for API
      const base64Audio = await blobToBase64(audioBlob);
      
      // Send to speech recognition API
      const transcriptionResponse = await fetch('/api/v1/ai/voice/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          audio: base64Audio,
          language: settings.autoLanguageDetection ? 'auto' : fromLanguage,
          enablePunctuation: true,
          enableWordTimestamps: false
        })
      });
      
      if (!transcriptionResponse.ok) {
        throw new Error('Speech recognition failed');
      }
      
      const transcriptionResult = await transcriptionResponse.json();
      const transcript = transcriptionResult.text;
      const confidence = transcriptionResult.confidence || 0.8;
      const detected = transcriptionResult.detectedLanguage || fromLanguage;
      
      setCurrentText(transcript);
      setDetectedLanguage(detected);
      
      if (transcript.trim()) {
        await translateAndAdd(transcript, detected, confidence);
      }
      
    } catch (error) {
      setError('Speech recognition failed');
      console.error('Audio processing error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const translateAndAdd = async (text: string, sourceLanguage: string, confidence: number) => {
    setIsTranslating(true);
    
    try {
      const translationResponse = await fetch('/api/v1/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage: toLanguage,
          contextualTranslation: true
        })
      });
      
      if (!translationResponse.ok) {
        throw new Error('Translation failed');
      }
      
      const translationResult = await translationResponse.json();
      
      // Add to conversation
      const newEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: settings.conversationMode ? 
          (conversation.length % 2 === 0 ? 'user' : 'other') : 'user',
        original: text,
        translated: translationResult.translatedText,
        sourceLanguage,
        targetLanguage: toLanguage,
        timestamp: new Date(),
        confidence
      };
      
      setConversation(prev => [...prev, newEntry]);
      
      // Auto-speak translation if enabled
      if (settings.autoSpeak) {
        await speakText(translationResult.translatedText, toLanguage);
      }
      
      // Auto-continue listening in conversation mode
      if (settings.conversationMode) {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
      
    } catch (error) {
      setError('Translation failed');
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const speakText = async (text: string, language: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }
      
      setIsPlaying(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = `${language}-${language.toUpperCase()}`;
      utterance.rate = settings.voiceSpeed;
      utterance.pitch = settings.voicePitch;
      
      utterance.onend = () => {
        setIsPlaying(false);
        resolve();
      };
      
      utterance.onerror = (error) => {
        setIsPlaying(false);
        reject(error);
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };
  
  const swapLanguages = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
  };
  
  const clearConversation = () => {
    setConversation([]);
    setCurrentText('');
    setSelectedEntry(null);
  };
  
  const exportConversation = () => {
    const content = conversation.map(entry => 
      `[${entry.timestamp.toLocaleTimeString()}] ${entry.speaker.toUpperCase()}\n` +
      `Original (${entry.sourceLanguage}): ${entry.original}\n` +
      `Translation (${entry.targetLanguage}): ${entry.translated}\n\n`
    ).join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const getLanguageFromCode = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || { name: code, flag: '🌐' };
  };
  
  useEffect(() => {
    return () => {
      stopListening();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Voice Translation</h2>
          {isListening && (
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              Recording
            </Badge>
          )}
          {settings.conversationMode && (
            <Badge variant="outline">
              <MessageCircle className="h-3 w-3 mr-1" />
              Conversation Mode
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Language Selection */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <select
              value={fromLanguage}
              onChange={(e) => setFromLanguage(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              disabled={settings.autoLanguageDetection}
            >
              {settings.autoLanguageDetection && (
                <option value="auto">Auto-detect</option>
              )}
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            {detectedLanguage && settings.autoLanguageDetection && (
              <div className="text-xs text-muted-foreground mt-1">
                Detected: {getLanguageFromCode(detectedLanguage).name}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={swapLanguages}
            className="mt-5"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <select
              value={toLanguage}
              onChange={(e) => setToLanguage(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Language Detection</Label>
              <Switch
                checked={settings.autoLanguageDetection}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoLanguageDetection: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Conversation Mode</Label>
              <Switch
                checked={settings.conversationMode}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, conversationMode: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-speak Translation</Label>
              <Switch
                checked={settings.autoSpeak}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoSpeak: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Noise Reduction</Label>
              <Switch
                checked={settings.noiseReduction}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, noiseReduction: checked }))
                }
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Voice Speed: {settings.voiceSpeed.toFixed(1)}x</Label>
            <Slider
              value={[settings.voiceSpeed]}
              onValueChange={([value]) =>
                setSettings(prev => ({ ...prev, voiceSpeed: value }))
              }
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4">
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Main Recording Interface */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-6">
        {/* Recording Visualization */}
        <div className="relative">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-red-100 border-4 border-red-300 animate-pulse' 
                : 'bg-primary/10 border-4 border-primary/20'
            }`}
          >
            {isListening ? (
              <MicOff className="h-12 w-12 text-red-500" />
            ) : (
              <Mic className="h-12 w-12 text-primary" />
            )}
          </div>
          
          {/* Audio Level Indicator */}
          {isListening && (
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Recording Status */}
        <div className="text-center space-y-2">
          {isListening && (
            <>
              <div className="text-lg font-medium text-red-600">
                Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground">
                Speak clearly in {getLanguageFromCode(fromLanguage === 'auto' ? detectedLanguage || 'en' : fromLanguage).name}
              </div>
            </>
          )}
          
          {isTranscribing && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing speech...</span>
            </div>
          )}
          
          {isTranslating && (
            <div className="flex items-center justify-center space-x-2 text-purple-600">
              <Languages className="h-4 w-4 animate-pulse" />
              <span>Translating...</span>
            </div>
          )}
          
          {!isListening && !isTranscribing && !isTranslating && (
            <div className="text-muted-foreground">
              Press the microphone button to start speaking
            </div>
          )}
        </div>
        
        {/* Current Text */}
        {currentText && (
          <Card className="w-full max-w-md">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium mb-2">What you said:</p>
              <p className="text-base">{currentText}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            size="lg"
            onClick={isListening ? stopListening : startListening}
            disabled={isTranscribing || isTranslating}
            className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            {isListening ? (
              <>
                <Square className="h-5 w-5 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </>
            )}
          </Button>
          
          {conversation.length > 0 && (
            <Button variant="outline" onClick={clearConversation}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Conversation History */}
      {conversation.length > 0 && (
        <div className="border-t bg-muted/20 max-h-80">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">Conversation History</h3>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={exportConversation}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={clearConversation}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-60 p-4">
            <div className="space-y-3">
              {conversation.map((entry) => (
                <Card 
                  key={entry.id} 
                  className={`${
                    entry.speaker === 'user' ? 'ml-8' : 'mr-8'
                  } ${selectedEntry === entry.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={entry.speaker === 'user' ? 'default' : 'secondary'}>
                        {entry.speaker === 'user' ? 'You' : 'Other'}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => speakText(entry.original, entry.sourceLanguage)}
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(entry.translated)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {getLanguageFromCode(entry.sourceLanguage).flag} Original:
                        </span>
                        <p className="font-medium">{entry.original}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {getLanguageFromCode(entry.targetLanguage).flag} Translation:
                        </span>
                        <p className="font-medium text-primary">{entry.translated}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{entry.timestamp.toLocaleTimeString()}</span>
                      <span>Confidence: {Math.round(entry.confidence * 100)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
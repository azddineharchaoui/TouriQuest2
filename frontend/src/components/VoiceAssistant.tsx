import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  X,
  Zap,
  Radio,
  Headphones,
  SkipBack,
  SkipForward,
  Languages,
  User,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface VoiceAssistantProps {
  onClose: () => void;
}

const quickCommands = [
  { command: 'Book a hotel', description: 'Find and book accommodations' },
  { command: 'Find restaurants nearby', description: 'Discover local dining options' },
  { command: 'What\'s my next trip?', description: 'Check upcoming bookings' },
  { command: 'Check weather', description: 'Get weather forecast' },
  { command: 'Navigate to hotel', description: 'Get directions' },
  { command: 'Call my accommodation', description: 'Contact your booking' }
];

const voiceSettings = {
  voices: [
    { id: 'sarah', name: 'Sarah (US)', accent: 'American', gender: 'female' },
    { id: 'james', name: 'James (UK)', accent: 'British', gender: 'male' },
    { id: 'maria', name: 'Maria (ES)', accent: 'Spanish', gender: 'female' },
    { id: 'henri', name: 'Henri (FR)', accent: 'French', gender: 'male' }
  ],
  languages: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ]
};

export function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [confidence, setConfidence] = useState(95);
  const [selectedVoice, setSelectedVoice] = useState('sarah');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [volume, setVolume] = useState([80]);
  const [speed, setSpeed] = useState([1.0]);
  const [handsFreeModeEnabled, setHandsFreeModeEnabled] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);

  // Simulate audio level animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const handleStartListening = () => {
    setIsListening(true);
    setTranscription('');
    
    // Simulate speech recognition
    setTimeout(() => {
      setTranscription('I\'m looking for hotels in Paris for next month...');
      setConfidence(Math.floor(Math.random() * 20) + 80);
    }, 2000);
    
    setTimeout(() => {
      setIsListening(false);
    }, 4000);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handlePlayResponse = () => {
    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
    }, 3000);
  };

  const VoiceWaveform = () => (
    <div className="flex items-center justify-center space-x-1 h-16">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="bg-primary rounded-full transition-all duration-100 ease-out"
          style={{
            width: '3px',
            height: isListening ? `${Math.random() * 40 + 10}px` : '4px',
            opacity: isListening ? Math.random() * 0.7 + 0.3 : 0.3
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Voice Assistant</h2>
              <p className="text-sm text-muted-foreground">
                {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Main Voice Interface */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {/* Wake Word Indicator */}
                {wakeWordEnabled && (
                  <Badge variant="outline" className="mb-4">
                    <Zap className="h-3 w-3 mr-1" />
                    Say "Hey TouriQuest" to activate
                  </Badge>
                )}

                {/* Voice Waveform */}
                <VoiceWaveform />

                {/* Main Microphone Button */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    className={`w-20 h-20 rounded-full p-0 ${
                      isListening ? 'bg-red-500 hover:bg-red-600' : ''
                    }`}
                    onClick={isListening ? handleStopListening : handleStartListening}
                  >
                    {isListening ? (
                      <MicOff className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>

                {/* Audio Level Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Audio Level</span>
                    <span>{Math.round(audioLevel)}%</span>
                  </div>
                  <Progress value={audioLevel} className="h-2" />
                </div>

                {/* Status Indicators */}
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Radio className={`h-4 w-4 ${noiseCancellation ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span>Noise Cancellation</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Headphones className="h-4 w-4 text-primary" />
                    <span>HD Audio</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcription Display */}
          {transcription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <User className="h-4 w-4" />
                  <span>Your Request</span>
                  <Badge variant="outline">{confidence}% confident</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted p-3 rounded-lg">{transcription}</p>
                <div className="flex items-center space-x-2 mt-3">
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Try Again
                  </Button>
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm">Send</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Response Playback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Bot className="h-4 w-4" />
                <span>AI Response</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                "I found several excellent hotels in Paris for next month. Would you like me to show you the top-rated options in your preferred area?"
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={handlePlayResponse}
                  disabled={isSpeaking}
                >
                  {isSpeaking ? (
                    <Pause className="h-3 w-3 mr-2" />
                  ) : (
                    <Play className="h-3 w-3 mr-2" />
                  )}
                  {isSpeaking ? 'Speaking...' : 'Play Response'}
                </Button>
                
                <Button size="sm" variant="outline">
                  <SkipBack className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline">
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Voice Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Voice Commands</CardTitle>
              <CardDescription>Try saying one of these phrases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickCommands.map((cmd) => (
                  <div
                    key={cmd.command}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="font-medium text-sm">"{cmd.command}"</div>
                    <div className="text-xs text-muted-foreground">{cmd.description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Settings className="h-4 w-4" />
                <span>Voice Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Selection */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceSettings.languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center space-x-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              <div className="space-y-2">
                <Label>AI Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceSettings.voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name} - {voice.accent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-muted-foreground">{volume[0]}%</span>
                </div>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Speech Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Speech Speed</Label>
                  <span className="text-sm text-muted-foreground">{speed[0]}x</span>
                </div>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Feature Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Wake Word Detection</Label>
                    <p className="text-sm text-muted-foreground">Activate with "Hey TouriQuest"</p>
                  </div>
                  <Switch
                    checked={wakeWordEnabled}
                    onCheckedChange={setWakeWordEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Noise Cancellation</Label>
                    <p className="text-sm text-muted-foreground">Filter background noise</p>
                  </div>
                  <Switch
                    checked={noiseCancellation}
                    onCheckedChange={setNoiseCancellation}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Hands-Free Mode</Label>
                    <p className="text-sm text-muted-foreground">Continuous conversation</p>
                  </div>
                  <Switch
                    checked={handsFreeModeEnabled}
                    onCheckedChange={setHandsFreeModeEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
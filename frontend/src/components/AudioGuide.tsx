import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { 
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Download,
  Languages,
  FileText,
  Map,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Smartphone,
  RotateCcw,
  Clock,
  MapPin,
  Zap,
  CheckCircle,
  List,
  Navigation,
  Battery,
  Wifi,
  WifiOff
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AudioChapter {
  id: string;
  title: string;
  duration: string;
  description: string;
  transcript?: string;
  locations?: Array<{
    name: string;
    coordinates: { lat: number; lng: number };
  }>;
  images?: string[];
  completed?: boolean;
}

interface AudioGuideData {
  id: string;
  title: string;
  description: string;
  totalDuration: string;
  backgroundImage: string;
  languages: string[];
  chapters: AudioChapter[];
  downloadSize?: string;
  features: string[];
}

const mockAudioGuide: AudioGuideData = {
  id: '1',
  title: 'National Art Museum Audio Guide',
  description: 'Comprehensive guided tour through our world-class collection, featuring expert commentary and behind-the-scenes stories.',
  totalDuration: '45 minutes',
  backgroundImage: 'https://images.unsplash.com/photo-1621760681857-215258afbbee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjdWx0dXJhbCUyMGhlcml0YWdlfGVufDF8fHx8MTc1ODIxNDU1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  languages: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin'],
  downloadSize: '85 MB',
  features: [
    'Professional narration',
    'GPS-triggered content',
    'Offline playback',
    'Visual synchronization',
    'Interactive maps'
  ],
  chapters: [
    {
      id: '1',
      title: 'Welcome & Museum History',
      duration: '3:45',
      description: 'Introduction to the museum\'s founding and architectural significance.',
      transcript: 'Welcome to the National Art Museum, a cultural cornerstone that has been inspiring visitors for over a century...',
      locations: [{
        name: 'Main Entrance',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      }],
      images: ['https://images.unsplash.com/photo-1621760681857-215258afbbee?w=300&h=200&fit=crop'],
      completed: true
    },
    {
      id: '2',
      title: 'Classical Collection',
      duration: '8:20',
      description: 'Journey through Renaissance masterpieces and classical sculptures.',
      transcript: 'As we enter the Classical wing, you\'ll notice the carefully curated lighting designed to...',
      locations: [{
        name: 'Renaissance Gallery',
        coordinates: { lat: 40.7129, lng: -74.0061 }
      }],
      images: ['https://images.unsplash.com/photo-1633700774912-b26913ace672?w=300&h=200&fit=crop'],
      completed: false
    },
    {
      id: '3',
      title: 'Impressionist Masterworks',
      duration: '12:15',
      description: 'Explore the world\'s finest collection of Impressionist paintings.',
      transcript: 'The Impressionist movement revolutionized art in the late 19th century...',
      locations: [{
        name: 'Impressionist Hall',
        coordinates: { lat: 40.7130, lng: -74.0062 }
      }],
      images: ['https://images.unsplash.com/photo-1680528221851-6689939132a2?w=300&h=200&fit=crop'],
      completed: false
    },
    {
      id: '4',
      title: 'Modern & Contemporary',
      duration: '10:30',
      description: 'Discover groundbreaking works from the 20th and 21st centuries.',
      transcript: 'Modern art challenges our perceptions and invites us to see the world differently...',
      locations: [{
        name: 'Modern Wing',
        coordinates: { lat: 40.7131, lng: -74.0063 }
      }],
      images: ['https://images.unsplash.com/photo-1667388968964-4aa652df0a9b?w=300&h=200&fit=crop'],
      completed: false
    },
    {
      id: '5',
      title: 'Special Exhibitions',
      duration: '6:45',
      description: 'Current featured exhibitions and rotating displays.',
      transcript: 'Our special exhibitions showcase emerging artists and thematic collections...',
      locations: [{
        name: 'Exhibition Hall',
        coordinates: { lat: 40.7132, lng: -74.0064 }
      }],
      images: ['https://images.unsplash.com/photo-1730320221074-b7199cbd25b7?w=300&h=200&fit=crop'],
      completed: false
    },
    {
      id: '6',
      title: 'Architecture & Building',
      duration: '4:15',
      description: 'The museum building itself as a work of art and architectural marvel.',
      transcript: 'The neo-classical facade you see today was completed in 1892...',
      locations: [{
        name: 'Grand Atrium',
        coordinates: { lat: 40.7133, lng: -74.0065 }
      }],
      images: ['https://images.unsplash.com/photo-1700857871010-351f697dd9f4?w=300&h=200&fit=crop'],
      completed: false
    }
  ]
};

interface AudioGuideProps {
  audioGuide?: AudioGuideData;
  onClose?: () => void;
}

export function AudioGuide({ audioGuide = mockAudioGuide, onClose }: AudioGuideProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 in seconds
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            handleNext();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentChapter < audioGuide.chapters.length - 1) {
      setCurrentChapter(prev => prev + 1);
      setCurrentTime(0);
      // Update duration for new chapter
      const newDuration = parseInt(audioGuide.chapters[currentChapter + 1].duration.split(':')[0]) * 60 + 
                         parseInt(audioGuide.chapters[currentChapter + 1].duration.split(':')[1]);
      setDuration(newDuration);
    }
  };

  const handlePrevious = () => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
      setCurrentTime(0);
      // Update duration for new chapter
      const newDuration = parseInt(audioGuide.chapters[currentChapter - 1].duration.split(':')[0]) * 60 + 
                         parseInt(audioGuide.chapters[currentChapter - 1].duration.split(':')[1]);
      setDuration(newDuration);
    }
  };

  const handleSkip = (seconds: number) => {
    setCurrentTime(prev => {
      const newTime = Math.max(0, Math.min(duration, prev + seconds));
      return newTime;
    });
  };

  const handleChapterSelect = (index: number) => {
    setCurrentChapter(index);
    setCurrentTime(0);
    const newDuration = parseInt(audioGuide.chapters[index].duration.split(':')[0]) * 60 + 
                       parseInt(audioGuide.chapters[index].duration.split(':')[1]);
    setDuration(newDuration);
  };

  const handleDownload = () => {
    if (isDownloaded) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simulate download progress
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsDownloading(false);
          setIsDownloaded(true);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const currentChapterData = audioGuide.chapters[currentChapter];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const renderPlayer = () => (
    <Card className="sticky bottom-0 p-6 bg-white/95 backdrop-blur-sm border-t shadow-lg">
      {/* Current Chapter Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{currentChapterData.title}</h4>
            <p className="text-sm text-muted-foreground">
              Chapter {currentChapter + 1} of {audioGuide.chapters.length}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center space-x-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </Badge>
          
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSkip(-15)}
            disabled={currentTime < 15}
          >
            <SkipBack className="w-4 h-4" />
            <span className="ml-1">15s</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentChapter === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            className="rounded-full w-12 h-12"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentChapter === audioGuide.chapters.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSkip(15)}
            disabled={currentTime > duration - 15}
          >
            <SkipForward className="w-4 h-4" />
            <span className="ml-1">15s</span>
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted || volume[0] === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={isMuted ? [0] : volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          {/* Playback Speed */}
          <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );

  const renderSettings = () => (
    showSettings && (
      <Card className="fixed top-4 right-4 p-6 w-80 shadow-lg z-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Settings</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          {/* Language Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <Languages className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audioGuide.languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Download Management */}
          <div>
            <label className="text-sm font-medium mb-2 block">Offline Access</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Download for offline use</span>
                <span className="text-xs text-muted-foreground">{audioGuide.downloadSize}</span>
              </div>
              
              {isDownloading ? (
                <div>
                  <Progress value={downloadProgress} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">Downloading... {downloadProgress}%</p>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={isDownloaded}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloaded ? 'Downloaded' : 'Download'}
                </Button>
              )}
            </div>
          </div>

          {/* GPS Settings */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">GPS Auto-play</span>
              <p className="text-xs text-muted-foreground">Auto-start chapters at locations</p>
            </div>
            <Button
              variant={gpsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGpsEnabled(!gpsEnabled)}
            >
              {gpsEnabled ? <CheckCircle className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
            </Button>
          </div>

          {/* Battery Optimization */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Battery className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Battery Optimized</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reduced background activity for longer listening
            </p>
          </div>
        </div>
      </Card>
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Background Image */}
      <div className="relative h-96">
        <ImageWithFallback
          src={audioGuide.backgroundImage}
          alt={audioGuide.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <Button variant="outline" onClick={onClose} className="bg-white/90 hover:bg-white">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Close
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className="bg-white/90 hover:bg-white"
            >
              <FileText className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="bg-white/90 hover:bg-white"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-6 left-6 right-6 text-black">
          <h1 className="text-3xl font-bold mb-2">{audioGuide.title}</h1>
          <p className="text-lg opacity-90 mb-4">{audioGuide.description}</p>
          
          <div className="flex items-center space-x-4">
            <Badge className="bg-white/20 text-black border-white/30">
              <Clock className="w-3 h-3 mr-1" />
              {audioGuide.totalDuration}
            </Badge>
            <Badge className="bg-white/20 text-black border-white/30">
              <List className="w-3 h-3 mr-1" />
              {audioGuide.chapters.length} chapters
            </Badge>
            {isDownloaded && (
              <Badge className="bg-green-500/80 text-black">
                <CheckCircle className="w-3 h-3 mr-1" />
                Downloaded
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chapter List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Chapters</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {audioGuide.chapters.filter(c => c.completed).length} of {audioGuide.chapters.length} completed
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {audioGuide.chapters.map((chapter, index) => (
                <Card 
                  key={chapter.id}
                  className={`p-4 cursor-pointer transition-all ${
                    index === currentChapter 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleChapterSelect(index)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      chapter.completed 
                        ? 'bg-green-100 text-green-700' 
                        : index === currentChapter 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {chapter.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{chapter.title}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {chapter.duration}
                          </Badge>
                          {chapter.locations && (
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                          )}
                          {gpsEnabled && chapter.locations && (
                            <Zap className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{chapter.description}</p>
                      
                      {chapter.images && (
                        <div className="flex space-x-2">
                          {chapter.images.slice(0, 3).map((image, imgIndex) => (
                            <ImageWithFallback
                              key={imgIndex}
                              src={image}
                              alt={`Chapter ${index + 1} preview`}
                              className="w-16 h-12 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                      
                      {index === currentChapter && isPlaying && (
                        <div className="mt-3">
                          <Progress value={progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Current Chapter Details */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Now Playing</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{currentChapterData.title}</h4>
                  <p className="text-sm text-muted-foreground">{currentChapterData.description}</p>
                </div>

                {currentChapterData.locations && (
                  <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Recommended Listening Location
                    </h5>
                    {currentChapterData.locations.map((location, index) => (
                      <p key={index} className="text-sm text-muted-foreground">{location.name}</p>
                    ))}
                  </div>
                )}

                {showTranscript && currentChapterData.transcript && (
                  <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Transcript
                    </h5>
                    <div className="max-h-32 overflow-y-auto p-3 bg-muted/50 rounded text-sm">
                      {currentChapterData.transcript}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Features */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Features</h3>
              <div className="space-y-3">
                {audioGuide.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Interactive Map Placeholder */}
            {showMap && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Map className="w-5 h-5 mr-2" />
                  Audio Locations
                </h3>
                <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Interactive map showing chapter locations
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating Player */}
      {renderPlayer()}

      {/* Settings Panel */}
      {renderSettings()}

      {/* Mini Player for Background Mode */}
      <audio ref={audioRef} />
    </div>
  );
}
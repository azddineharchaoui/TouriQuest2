import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { 
  Camera,
  X,
  Minimize2,
  Maximize2,
  Info,
  Volume2,
  VolumeX,
  Share2,
  Download,
  RotateCcw,
  Zap,
  Eye,
  EyeOff,
  Clock,
  Play,
  Pause,
  Settings,
  Smartphone,
  Hand,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  MapPin,
  Users,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Target,
  Layers,
  Film,
  Image,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Compass
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ARHotspot {
  id: string;
  title: string;
  description: string;
  position: { x: number; y: number; z: number };
  type: 'info' | 'character' | 'artifact' | 'timeline' | 'reconstruction';
  icon: string;
  content?: {
    text?: string;
    audio?: string;
    images?: string[];
    timeline?: Array<{
      year: string;
      event: string;
    }>;
  };
  interactionType: 'tap' | 'gaze' | 'gesture';
}

interface ARExperienceData {
  id: string;
  title: string;
  description: string;
  duration: string;
  features: string[];
  hotspots: ARHotspot[];
  timelinePeriods: Array<{
    id: string;
    name: string;
    year: string;
    description: string;
  }>;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    avatar: string;
  }>;
}

const mockARExperience: ARExperienceData = {
  id: '1',
  title: 'National Art Museum AR Journey',
  description: 'Step into history with immersive AR reconstructions and interactive storytelling.',
  duration: '15-20 minutes',
  features: [
    'Historical reconstruction',
    'Interactive 3D models',
    'Character storytelling',
    'Timeline exploration',
    'Photo/video capture'
  ],
  hotspots: [
    {
      id: '1',
      title: 'Museum Foundation',
      description: 'See how the museum looked when it first opened in 1892',
      position: { x: 0.2, y: 0.5, z: 0.3 },
      type: 'reconstruction',
      icon: '🏛️',
      content: {
        text: 'In 1892, this magnificent building welcomed its first visitors as the city\'s premier cultural institution.',
        images: ['https://images.unsplash.com/photo-1621760681857-215258afbbee?w=300&h=200&fit=crop'],
        timeline: [
          { year: '1890', event: 'Construction begins' },
          { year: '1892', event: 'Museum opens to public' },
          { year: '1925', event: 'Major expansion completed' }
        ]
      },
      interactionType: 'tap'
    },
    {
      id: '2',
      title: 'Master Artist at Work',
      description: 'Watch a Renaissance master create their masterpiece',
      position: { x: 0.7, y: 0.4, z: 0.6 },
      type: 'character',
      icon: '👨‍🎨',
      content: {
        text: 'Experience the artistic process as if you were in the master\'s studio centuries ago.',
        audio: 'Narrated by art historian Dr. Sarah Mitchell'
      },
      interactionType: 'gaze'
    },
    {
      id: '3',
      title: 'Hidden Artwork Details',
      description: 'Discover secrets hidden in famous paintings',
      position: { x: 0.5, y: 0.3, z: 0.8 },
      type: 'info',
      icon: '🔍',
      content: {
        text: 'Use AR magnification to see brushstrokes and hidden symbols invisible to the naked eye.',
        images: ['https://images.unsplash.com/photo-1633700774912-b26913ace672?w=300&h=200&fit=crop']
      },
      interactionType: 'gesture'
    }
  ],
  timelinePeriods: [
    {
      id: '1',
      name: 'Foundation Era',
      year: '1890-1900',
      description: 'The museum\'s early years and establishment'
    },
    {
      id: '2',
      name: 'Golden Age',
      year: '1920-1940',
      description: 'Major acquisitions and cultural prominence'
    },
    {
      id: '3',
      name: 'Modern Era',
      year: '1990-Present',
      description: 'Digital transformation and global recognition'
    }
  ],
  characters: [
    {
      id: '1',
      name: 'Dr. Elizabeth Hartwell',
      role: 'Founding Curator',
      description: 'The visionary curator who shaped the museum\'s early collection',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: '2',
      name: 'Master Giovanni',
      role: 'Renaissance Artist',
      description: 'Historical artist featured in character interactions',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    }
  ]
};

interface ARExperienceProps {
  experience?: ARExperienceData;
  onClose?: () => void;
}

export function ARExperience({ experience = mockARExperience, onClose }: ARExperienceProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [arSupported, setArSupported] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check AR support
    checkARSupport();
  }, []);

  const checkARSupport = () => {
    // Simulate AR support check
    const hasWebXR = 'xr' in navigator;
    const hasWebGL = !!document.createElement('canvas').getContext('webgl');
    setArSupported(hasWebXR && hasWebGL);
  };

  const requestCameraPermission = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraPermission('granted');
      setIsActive(true);
    } catch (error) {
      setCameraPermission('denied');
      console.error('Camera permission denied:', error);
    }
    setIsLoading(false);
  };

  const handleStartAR = () => {
    if (cameraPermission === 'granted') {
      setIsActive(true);
    } else {
      requestCameraPermission();
    }
  };

  const handleTakePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        // Add AR overlay effects here
        
        // Trigger download
        const link = document.createElement('a');
        link.download = 'ar-experience.png';
        link.href = canvas.toDataURL();
        link.click();
      }
    }
  };

  const handleStartRecording = () => {
    setIsRecording(!isRecording);
    // Implement video recording logic
  };

  const tutorialSteps = [
    {
      title: 'Welcome to AR Experience',
      content: 'Point your camera at the museum space to begin your immersive journey.',
      icon: <Camera className="w-6 h-6" />
    },
    {
      title: 'Find AR Hotspots',
      content: 'Look for glowing markers in your camera view. Tap them to interact.',
      icon: <Target className="w-6 h-6" />
    },
    {
      title: 'Movement & Navigation',
      content: 'Walk around to explore. The experience adapts to your position.',
      icon: <Move className="w-6 h-6" />
    },
    {
      title: 'Capture & Share',
      content: 'Take photos or record videos to share your AR discoveries.',
      icon: <Camera className="w-6 h-6" />
    }
  ];

  const renderTutorial = () => (
    showTutorial && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Card className="p-6 max-w-md mx-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {tutorialSteps[tutorialStep].icon}
            </div>
            
            <h3 className="text-lg font-semibold">
              {tutorialSteps[tutorialStep].title}
            </h3>
            
            <p className="text-muted-foreground">
              {tutorialSteps[tutorialStep].content}
            </p>
            
            <div className="flex justify-center space-x-2">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === tutorialStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowTutorial(false)}
              >
                Skip
              </Button>
              
              <div className="space-x-2">
                {tutorialStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setTutorialStep(tutorialStep - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    if (tutorialStep < tutorialSteps.length - 1) {
                      setTutorialStep(tutorialStep + 1);
                    } else {
                      setShowTutorial(false);
                      handleStartAR();
                    }
                  }}
                >
                  {tutorialStep < tutorialSteps.length - 1 ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    'Start AR'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  );

  const renderStartScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" onClick={onClose} className="text-white border-white/20 hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Badge className="bg-white/20 text-white border-white/30">
            <Smartphone className="w-3 h-3 mr-1" />
            AR Experience
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Title & Description */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">{experience.title}</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">{experience.description}</p>
            
            <div className="flex items-center justify-center space-x-4">
              <Badge className="bg-white/20 text-white border-white/30">
                <Clock className="w-3 h-3 mr-1" />
                {experience.duration}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                <Zap className="w-3 h-3 mr-1" />
                Interactive
              </Badge>
            </div>
          </div>

          {/* AR Preview */}
          <div className="relative">
            <div className="w-80 h-60 mx-auto bg-black/30 rounded-2xl border border-white/20 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Smartphone className="w-12 h-12 mx-auto opacity-70" />
                <p className="text-sm opacity-70">AR Camera View</p>
              </div>
            </div>
            
            {/* Simulated AR Hotspots */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
            </div>
            <div className="absolute bottom-16 right-8">
              <div className="w-4 h-4 bg-secondary rounded-full animate-pulse" />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {experience.features.map((feature, index) => (
              <Card key={index} className="p-4 bg-white/10 border-white/20 text-white">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
                    {index === 0 && <RotateCcw className="w-4 h-4" />}
                    {index === 1 && <Zap className="w-4 h-4" />}
                    {index === 2 && <Users className="w-4 h-4" />}
                    {index === 3 && <Clock className="w-4 h-4" />}
                    {index === 4 && <Camera className="w-4 h-4" />}
                  </div>
                  <p className="text-sm font-medium">{feature}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* System Requirements */}
          <Card className="p-6 bg-white/10 border-white/20 text-white max-w-2xl mx-auto">
            <h3 className="font-semibold mb-4">System Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Camera access required</span>
                </div>
                <div className="flex items-center space-x-2">
                  {arSupported ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span>AR support detected</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Modern browser required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Stable internet connection</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Start Button */}
          <div className="space-y-4">
            {!arSupported ? (
              <div className="space-y-4">
                <p className="text-yellow-400">AR is not supported on this device</p>
                <Button variant="outline" className="text-white border-white/20" disabled>
                  AR Not Available
                </Button>
              </div>
            ) : cameraPermission === 'denied' ? (
              <div className="space-y-4">
                <p className="text-red-400">Camera permission is required for AR experience</p>
                <Button variant="outline" onClick={requestCameraPermission} className="text-white border-white/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Camera Access
                </Button>
              </div>
            ) : (
              <Button 
                size="lg" 
                onClick={() => setShowTutorial(true)}
                disabled={isLoading}
                className="bg-white text-black hover:bg-white/90 px-8 py-3"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="w-5 h-5 mr-2" />
                )}
                {isLoading ? 'Loading...' : 'Start AR Experience'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => setShowTutorial(true)}
              className="text-white border-white/20 hover:bg-white/10"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              How it works
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderARInterface = () => (
    <div className="fixed inset-0 bg-black">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* AR Overlays */}
      <div className="absolute inset-0">
        {/* Simulated AR Hotspots */}
        {experience.hotspots.map((hotspot) => (
          <div
            key={hotspot.id}
            className="absolute w-8 h-8 cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${hotspot.position.x * 100}%`,
              top: `${hotspot.position.y * 100}%`,
            }}
            onClick={() => setActiveHotspot(hotspot.id)}
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse shadow-lg">
              <span className="text-xs">{hotspot.icon}</span>
            </div>
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <Badge className="bg-black/70 text-white text-xs">
                {hotspot.title}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsActive(false)}
          className="bg-black/50 text-white border-white/30 hover:bg-black/70"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
          >
            <Info className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Bottom Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="p-4 bg-black/70 text-white border-white/20">
            <div className="flex justify-between items-center">
              {/* Timeline Controls */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <div className="flex space-x-1">
                  {experience.timelinePeriods.map((period) => (
                    <Button
                      key={period.id}
                      variant={selectedTimeline === period.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedTimeline(period.id)}
                      className="text-xs px-2"
                    >
                      {period.year.split('-')[0]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Capture Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTakePhoto}
                  className="text-white hover:bg-white/20"
                >
                  <Camera className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartRecording}
                  className={`text-white hover:bg-white/20 ${isRecording ? 'bg-red-500/30' : ''}`}
                >
                  <Film className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute top-16 left-4 right-4">
          <Card className="p-4 bg-black/80 text-white border-white/20">
            <h3 className="font-semibold mb-2">AR Navigation Guide</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Target className="w-3 h-3" />
                  <span>Tap hotspots to interact</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Move className="w-3 h-3" />
                  <span>Walk to explore areas</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Hand className="w-3 h-3" />
                  <span>Pinch to zoom objects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate view by moving</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Hotspot Detail Modal */}
      {activeHotspot && (
        <div className="absolute inset-x-4 bottom-20">
          <Card className="p-6 bg-black/90 text-white border-white/20">
            {(() => {
              const hotspot = experience.hotspots.find(h => h.id === activeHotspot);
              if (!hotspot) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{hotspot.title}</h3>
                      <p className="text-sm text-white/80">{hotspot.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveHotspot(null)}
                      className="text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {hotspot.content?.text && (
                    <p className="text-sm leading-relaxed">{hotspot.content.text}</p>
                  )}
                  
                  {hotspot.content?.images && (
                    <div className="flex space-x-2 overflow-x-auto">
                      {hotspot.content.images.map((image, index) => (
                        <ImageWithFallback
                          key={index}
                          src={image}
                          alt={`${hotspot.title} ${index + 1}`}
                          className="w-20 h-16 object-cover rounded flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                  
                  {hotspot.content?.timeline && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Timeline</h4>
                      {hotspot.content.timeline.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3 text-sm">
                          <Badge variant="outline" className="text-white border-white/30">
                            {item.year}
                          </Badge>
                          <span>{item.event}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {hotspot.content?.audio && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="text-white border-white/30">
                        <Play className="w-4 h-4 mr-2" />
                        Play Audio
                      </Button>
                      <span className="text-xs text-white/70">{hotspot.content.audio}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 bg-red-500/80 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">Recording</span>
          </div>
        </div>
      )}
    </div>
  );

  // Hidden canvas for photo capture
  const renderCanvas = () => (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
    />
  );

  if (!isActive && !showTutorial) {
    return (
      <>
        {renderStartScreen()}
        {renderTutorial()}
        {renderCanvas()}
      </>
    );
  }

  if (isActive) {
    return (
      <>
        {renderARInterface()}
        {renderCanvas()}
      </>
    );
  }

  return (
    <>
      {renderTutorial()}
      {renderCanvas()}
    </>
  );
}
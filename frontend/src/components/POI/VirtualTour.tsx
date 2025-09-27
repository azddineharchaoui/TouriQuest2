import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Volume2,
  VolumeX,
  Settings,
  Share2,
  Download,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Eye,
  Fullscreen,
  Smartphone,
  Monitor,
  Headphones,
  Globe,
  Info
} from 'lucide-react';

interface POI {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    type: 'photo' | 'video' | '360' | 'drone';
    season?: string;
    timestamp: string;
    photographer: string;
  }>;
}

interface VirtualTourProps {
  poi: POI;
}

interface TourStop {
  id: string;
  name: string;
  description: string;
  mediaUrl: string;
  mediaType: '360' | 'video' | 'photo';
  duration: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  hotspots?: Array<{
    id: string;
    x: number;
    y: number;
    title: string;
    description: string;
    action: 'info' | 'navigate' | 'media';
  }>;
  audioGuide?: {
    url: string;
    transcript: string;
    duration: number;
  };
}

export const VirtualTour: React.FC<VirtualTourProps> = ({ poi }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStop, setCurrentStop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [tourProgress, setTourProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'vr' | 'desktop' | 'mobile'>('desktop');
  const [language, setLanguage] = useState('en');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mock tour data
  const [tourStops, setTourStops] = useState<TourStop[]>([
    {
      id: '1',
      name: 'Main Entrance',
      description: 'Welcome to the magnificent entrance hall',
      mediaUrl: '/tour/360/entrance.jpg',
      mediaType: '360',
      duration: 120,
      hotspots: [
        {
          id: 'h1',
          x: 50,
          y: 30,
          title: 'Architecture Details',
          description: 'Notice the intricate stonework from the 15th century',
          action: 'info'
        },
        {
          id: 'h2',
          x: 70,
          y: 60,
          title: 'Ticket Office',
          description: 'Visit information and guided tours',
          action: 'navigate'
        }
      ],
      audioGuide: {
        url: '/audio/entrance.mp3',
        transcript: 'Welcome to this historic location...',
        duration: 180
      }
    },
    {
      id: '2',
      name: 'Great Hall',
      description: 'The centerpiece of the building',
      mediaUrl: '/tour/360/great-hall.jpg',
      mediaType: '360',
      duration: 180,
      hotspots: [
        {
          id: 'h3',
          x: 40,
          y: 20,
          title: 'Ceiling Frescoes',
          description: 'Painted by master artists in 1620',
          action: 'info'
        }
      ],
      audioGuide: {
        url: '/audio/great-hall.mp3',
        transcript: 'This magnificent hall has witnessed centuries of history...',
        duration: 240
      }
    }
  ]);

  const [tourStats, setTourStats] = useState({
    totalDuration: 15,
    totalStops: 8,
    languages: 12,
    viewCount: 145620
  });

  useEffect(() => {
    if (isPlaying && currentStop < tourStops.length) {
      const timer = setInterval(() => {
        setTourProgress(prev => {
          const newProgress = prev + (100 / tourStops[currentStop].duration);
          if (newProgress >= 100) {
            if (currentStop < tourStops.length - 1) {
              setCurrentStop(prev => prev + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPlaying, currentStop, tourStops]);

  const startTour = () => {
    setIsActive(true);
    setIsPlaying(true);
    setCurrentStop(0);
    setTourProgress(0);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const nextStop = () => {
    if (currentStop < tourStops.length - 1) {
      setCurrentStop(currentStop + 1);
      setTourProgress(0);
    }
  };

  const previousStop = () => {
    if (currentStop > 0) {
      setCurrentStop(currentStop - 1);
      setTourProgress(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(3, newZoom));
    });
  };

  const handleRotation = (direction: 'left' | 'right') => {
    setRotation(prev => prev + (direction === 'right' ? 15 : -15));
  };

  const handleHotspotClick = (hotspot: any) => {
    setSelectedHotspot(hotspot.id);
    
    switch (hotspot.action) {
      case 'info':
        // Show information modal
        break;
      case 'navigate':
        // Navigate to another stop
        break;
      case 'media':
        // Show additional media
        break;
    }
  };

  const currentTourStop = tourStops[currentStop];

  if (!isActive) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold mb-2">Immersive Virtual Tour</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Explore {poi.name} from anywhere in the world with our interactive 360° experience
          </p>

          {/* Tour Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{tourStats.totalDuration}min</div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{tourStats.totalStops}</div>
              <div className="text-sm text-gray-600">Stops</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{tourStats.languages}</div>
              <div className="text-sm text-gray-600">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{tourStats.viewCount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Views</div>
            </div>
          </div>

          {/* View Mode Selection */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'desktop' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'mobile' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </button>
            <button
              onClick={() => setViewMode('vr')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'vr' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Headphones className="w-4 h-4" />
              VR Ready
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startTour}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
          >
            <Play className="w-6 h-6 inline mr-2" />
            Start Virtual Tour
          </motion.button>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold mb-2">360° Views</h4>
              <p className="text-sm text-gray-600">Fully immersive panoramic experience</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Volume2 className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Audio Guides</h4>
              <p className="text-sm text-gray-600">Professional narration in multiple languages</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold mb-2">Interactive Hotspots</h4>
              <p className="text-sm text-gray-600">Discover hidden details and stories</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative bg-black rounded-2xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'
      }`}
    >
      {/* Main Tour View */}
      <div 
        className="relative w-full h-full bg-cover bg-center transition-transform duration-300"
        style={{
          backgroundImage: `url(${currentTourStop?.mediaUrl})`,
          transform: `scale(${zoom}) rotate(${rotation}deg)`
        }}
      >
        {/* Hotspots */}
        {showHotspots && currentTourStop?.hotspots?.map((hotspot) => (
          <motion.button
            key={hotspot.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-4 h-4 bg-white rounded-full border-4 border-indigo-500 cursor-pointer hover:scale-125 transition-transform"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`
            }}
            onClick={() => handleHotspotClick(hotspot)}
          >
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
              {hotspot.title}
            </div>
          </motion.button>
        ))}

        {/* Hotspot Info Modal */}
        <AnimatePresence>
          {selectedHotspot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 max-w-sm shadow-xl z-10"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">Hotspot Information</h4>
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 text-sm">Detailed information would appear here...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-white text-sm font-medium">
              Stop {currentStop + 1} of {tourStops.length}
            </span>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-white text-sm">
              {currentTourStop?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
          >
            <Globe className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={previousStop}
          disabled={currentStop === 0}
          className="w-12 h-12 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextStop}
          disabled={currentStop === tourStops.length - 1}
          className="w-12 h-12 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* View Controls */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={() => handleZoom('in')}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleRotation('left')}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleRotation('right')}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-4">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${tourProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Play Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <div className="text-white text-sm">
              <Clock className="w-4 h-4 inline mr-1" />
              {Math.floor(tourProgress / 100 * currentTourStop?.duration || 0)}s
            </div>
          </div>

          {/* Tour Info */}
          <div className="text-center text-white">
            <h3 className="font-semibold">{currentTourStop?.name}</h3>
            <p className="text-sm text-white/80">{currentTourStop?.description}</p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <Fullscreen className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audio Element */}
      {currentTourStop?.audioGuide && (
        <audio
          ref={audioRef}
          src={currentTourStop.audioGuide.url}
          autoPlay={isPlaying && audioEnabled}
          loop={false}
        />
      )}

      {/* Exit Button */}
      <button
        onClick={() => setIsActive(false)}
        className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors flex items-center justify-center z-20"
      >
        ×
      </button>
    </motion.div>
  );
};
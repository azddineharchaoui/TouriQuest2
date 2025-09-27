import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Eye,
  MapPin,
  Clock,
  User,
  Camera,
  Video,
  Compass,
  Plane
} from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  caption: string;
  type: 'photo' | 'video' | '360' | 'drone';
  season?: string;
  timestamp: string;
  photographer: string;
}

interface MediaGalleryProps {
  photos: Photo[];
  poiName: string;
  enableAR?: boolean;
  enable360?: boolean;
  enableDrone?: boolean;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  photos, 
  poiName, 
  enableAR = false,
  enable360 = false,
  enableDrone = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [show360View, setShow360View] = useState(false);
  const [showARView, setShowARView] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Filter photos based on selected filters
  const filteredPhotos = photos.filter(photo => {
    if (selectedSeason && photo.season !== selectedSeason) return false;
    if (selectedType && photo.type !== selectedType) return false;
    return true;
  });

  const currentPhoto = filteredPhotos[currentIndex] || photos[0];
  const seasons = [...new Set(photos.map(p => p.season).filter(Boolean))];
  const types = [...new Set(photos.map(p => p.type))];

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentIndex(currentIndex === 0 ? filteredPhotos.length - 1 : currentIndex - 1);
    } else {
      setCurrentIndex(currentIndex === filteredPhotos.length - 1 ? 0 : currentIndex + 1);
    }
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
    setZoomLevel(newZoom);
    setIsZoomed(newZoom > 1);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentPhoto.url;
    link.download = `${poiName}-${currentPhoto.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${poiName} - Photo`,
          text: currentPhoto.caption,
          url: currentPhoto.url,
        });
      } else {
        await navigator.clipboard.writeText(currentPhoto.url);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          navigatePhoto('prev');
          break;
        case 'ArrowRight':
          navigatePhoto('next');
          break;
        case 'Escape':
          handleFullscreen();
          break;
        case '+':
        case '=':
          handleZoom(0.2);
          break;
        case '-':
          handleZoom(-0.2);
          break;
        case 'r':
          handleRotate();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, currentIndex, zoomLevel]);

  const thumbnails = filteredPhotos.slice(0, 6);

  return (
    <div className="relative w-full h-full">
      {/* Main Gallery Container */}
      <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
        {/* Current Image/Video */}
        <motion.div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center"
          style={{ x, y }}
        >
          {show360View ? (
            <div className="w-full h-full">
              <iframe
                src={`${currentPhoto.url}?type=360`}
                className="w-full h-full border-0"
                title="360° View"
                allowFullScreen
              />
            </div>
          ) : showARView ? (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">AR Experience</h3>
                <p className="text-white/80 mb-4">Historical reconstruction and interactive elements</p>
                <button className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors">
                  Launch AR View
                </button>
              </div>
            </div>
          ) : currentPhoto.type === 'video' ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={currentPhoto.url}
                className="w-full h-full object-cover"
                style={{ 
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
                muted={isMuted}
                loop
                playsInline
              />
              
              {/* Video Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
                <button
                  onClick={handleVideoPlayPause}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 h-1 bg-white/30 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }} />
                </div>
                
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ) : (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption}
              className="max-w-full max-h-full object-contain"
              style={{ 
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
              draggable={false}
            />
          )}
        </motion.div>

        {/* Navigation Arrows */}
        <button
          onClick={() => navigatePhoto('prev')}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => navigatePhoto('next')}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-sm flex items-center gap-2">
              {currentPhoto.type === 'photo' && <Camera className="w-4 h-4" />}
              {currentPhoto.type === 'video' && <Video className="w-4 h-4" />}
              {currentPhoto.type === '360' && <Compass className="w-4 h-4" />}
              {currentPhoto.type === 'drone' && <Plane className="w-4 h-4" />}
              {currentPhoto.type.charAt(0).toUpperCase() + currentPhoto.type.slice(1)}
            </span>
            
            {currentPhoto.season && (
              <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-sm">
                {currentPhoto.season}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentPhoto.type === '360' && (
              <button
                onClick={() => setShow360View(!show360View)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  show360View 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-black/50 backdrop-blur-md text-white hover:bg-black/70'
                }`}
              >
                <Compass className="w-5 h-5" />
              </button>
            )}
            
            {enableAR && (
              <button
                onClick={() => setShowARView(!showARView)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  showARView 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-black/50 backdrop-blur-md text-white hover:bg-black/70'
                }`}
              >
                <Eye className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => handleZoom(0.2)}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => handleZoom(-0.2)}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleRotate}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleDownload}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleShare}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleFullscreen}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 text-white">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{currentPhoto.caption}</h3>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{currentPhoto.photographer}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(currentPhoto.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <span className="text-sm text-white/60 ml-4">
                {currentIndex + 1} / {filteredPhotos.length}
              </span>
            </div>
          </div>
        </div>

        {/* Photo Type Filter */}
        <div className="absolute bottom-20 left-4 right-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                !selectedType 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-black/30 backdrop-blur-md text-white hover:bg-black/50'
              }`}
            >
              All
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`px-4 py-2 rounded-full text-sm transition-colors capitalize ${
                  selectedType === type 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-black/30 backdrop-blur-md text-white hover:bg-black/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {thumbnails.map((photo, index) => (
            <motion.button
              key={photo.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex 
                  ? 'border-blue-500 scale-110' 
                  : 'border-white/30 hover:border-white/60'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full h-full object-cover"
              />
              
              {photo.type !== 'photo' && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center">
                  {photo.type === 'video' && <Play className="w-2 h-2 text-white" />}
                  {photo.type === '360' && <Compass className="w-2 h-2 text-white" />}
                  {photo.type === 'drone' && <Plane className="w-2 h-2 text-white" />}
                </div>
              )}
            </motion.button>
          ))}
          
          {filteredPhotos.length > 6 && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-black/30 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white text-sm">
              +{filteredPhotos.length - 6}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            <button
              onClick={handleFullscreen}
              className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <MediaGallery 
              photos={photos} 
              poiName={poiName}
              enableAR={enableAR}
              enable360={enable360}
              enableDrone={enableDrone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
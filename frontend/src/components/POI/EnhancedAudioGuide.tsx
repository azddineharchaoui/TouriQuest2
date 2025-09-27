import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward,
  Download,
  Globe,
  MapPin,
  Clock,
  Star,
  BookOpen,
  Compass,
  Camera,
  History,
  Users,
  Award,
  Settings,
  Share2,
  Heart,
  FastForward,
  Rewind,
  RotateCcw,
  Zap,
  Waves,
  Eye,
  Mic,
  Navigation,
  Accessibility,
  Lightbulb,
  TreePine,
  Building,
  Mountain
} from 'lucide-react';

interface AudioTrack {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  transcript: string;
  type: 'introduction' | 'history' | 'architecture' | 'story' | 'interactive' | 'atmospheric' | 'accessibility';
  difficulty: 'beginner' | 'intermediate' | 'expert';
  tags: string[];
  gpsLocation?: {
    lat: number;
    lng: number;
    radius: number;
    autoTrigger: boolean;
  };
  narrator: {
    name: string;
    title: string;
    bio: string;
    voice: 'male' | 'female' | 'neutral';
  };
  visualSyncs?: Array<{
    timestamp: number;
    image: string;
    caption: string;
  }>;
  interactiveChoices?: Array<{
    timestamp: number;
    question: string;
    choices: Array<{
      text: string;
      nextTrackId?: string;
      consequence: string;
    }>;
  }>;
  atmosphericSounds?: {
    backgroundAudio: string;
    intensity: number;
    fadeInOut: boolean;
  };
  accessibility?: {
    audioDescription: string;
    tactileNotes: string[];
    simplicityLevel: 'simple' | 'detailed';
  };
}

interface AdventureMode {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  theme: string;
  startingTrack: string;
  pathways: Array<{
    choice: string;
    trackSequence: string[];
    outcomes: string[];
  }>;
}

interface ShareableMoment {
  id: string;
  timestamp: number;
  trackId: string;
  title: string;
  description: string;
  image?: string;
  audioClip: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
}

interface EnhancedAudioGuideProps {
  poiId: string;
  audioGuide: {
    available: boolean;
    languages: string[];
    duration: string;
    highlights: string[];
    hasAdventure: boolean;
    hasAccessibility: boolean;
  };
}

export const EnhancedAudioGuide: React.FC<EnhancedAudioGuideProps> = ({ 
  poiId, 
  audioGuide 
}) => {
  // Core Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Language & Content State
  const [selectedLanguage, setSelectedLanguage] = useState(audioGuide.languages[0] || 'en');
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  
  // Advanced Features State
  const [adventureModes, setAdventureModes] = useState<AdventureMode[]>([]);
  const [selectedAdventure, setSelectedAdventure] = useState<AdventureMode | null>(null);
  const [adventureProgress, setAdventureProgress] = useState<any>(null);
  const [isAdventureMode, setIsAdventureMode] = useState(false);
  
  // GPS & Location State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsTriggeredTracks, setGpsTriggeredTracks] = useState<string[]>([]);
  const [nearbyTracks, setNearbyTracks] = useState<AudioTrack[]>([]);
  
  // Atmospheric & Visual State
  const [atmosphericEnabled, setAtmosphericEnabled] = useState(true);
  const [visualSyncEnabled, setVisualSyncEnabled] = useState(true);
  const [currentVisual, setCurrentVisual] = useState<any>(null);
  const [atmosphericPlayer, setAtmosphericPlayer] = useState<HTMLAudioElement | null>(null);
  
  // Social & Sharing State
  const [shareableMoments, setShareableMoments] = useState<ShareableMoment[]>([]);
  const [currentMoment, setCurrentMoment] = useState<ShareableMoment | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  
  // Accessibility State
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [audioDescription, setAudioDescription] = useState(false);
  const [simplicityLevel, setSimplicityLevel] = useState<'simple' | 'detailed'>('detailed');
  
  // Offline & Download State
  const [offlineMode, setOfflineMode] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});
  const [downloadedTracks, setDownloadedTracks] = useState<string[]>([]);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAdventureChoice, setShowAdventureChoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVisualSync, setShowVisualSync] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const atmosphericRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchAudioGuideData();
    requestGeolocation();
    setupAudioEventListeners();
  }, [poiId, selectedLanguage]);

  useEffect(() => {
    if (userLocation) {
      checkGPSTriggers();
    }
  }, [userLocation, tracks]);

  useEffect(() => {
    if (currentTrack && visualSyncEnabled) {
      updateVisualSync();
    }
  }, [currentTime, currentTrack, visualSyncEnabled]);

  const fetchAudioGuideData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch comprehensive audio guide data
      const response = await fetch(`/api/v1/pois/${poiId}/audio-guide?language=${selectedLanguage}&enhanced=true`);
      if (response.ok) {
        const data = await response.json();
        setTracks(data.tracks);
        setAdventureModes(data.adventureModes || []);
        setShareableMoments(data.shareableMoments || []);
        
        if (data.tracks.length > 0) {
          setCurrentTrack(data.tracks[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch audio guide:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.warn('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
  };

  const setupAudioEventListeners = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      if (isAdventureMode && showAdventureChoice) {
        // Wait for user choice in adventure mode
        return;
      }
      playNext();
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', updateTime);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', updateTime);
    };
  };

  const checkGPSTriggers = () => {
    if (!userLocation) return;
    
    tracks.forEach(track => {
      if (track.gpsLocation && track.gpsLocation.autoTrigger) {
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng,
          track.gpsLocation.lat,
          track.gpsLocation.lng
        );
        
        if (distance <= track.gpsLocation.radius && !gpsTriggeredTracks.includes(track.id)) {
          triggerGPSTrack(track);
        }
      }
    });
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const triggerGPSTrack = (track: AudioTrack) => {
    setGpsTriggeredTracks(prev => [...prev, track.id]);
    
    // Show notification about GPS-triggered content
    showGPSNotification(track);
    
    // Auto-play if user is not currently listening
    if (!isPlaying) {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const showGPSNotification = (track: AudioTrack) => {
    // Implementation for GPS trigger notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New audio content available: ${track.title}`, {
        body: track.description,
        icon: '/icons/audio-guide.png'
      });
    }
  };

  const updateVisualSync = () => {
    if (!currentTrack?.visualSyncs) return;
    
    const currentSync = currentTrack.visualSyncs.find(sync => 
      Math.abs(sync.timestamp - currentTime) < 1
    );
    
    if (currentSync && currentSync !== currentVisual) {
      setCurrentVisual(currentSync);
      setShowVisualSync(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShowVisualSync(false), 5000);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      pauseAtmosphericAudio();
    } else {
      audio.play();
      playAtmosphericAudio();
    }
    setIsPlaying(!isPlaying);
  };

  const playAtmosphericAudio = () => {
    if (!atmosphericEnabled || !currentTrack?.atmosphericSounds) return;
    
    const atmospheric = atmosphericRef.current;
    if (atmospheric && currentTrack.atmosphericSounds.backgroundAudio) {
      atmospheric.src = currentTrack.atmosphericSounds.backgroundAudio;
      atmospheric.volume = currentTrack.atmosphericSounds.intensity * volume;
      atmospheric.loop = true;
      atmospheric.play();
    }
  };

  const pauseAtmosphericAudio = () => {
    const atmospheric = atmosphericRef.current;
    if (atmospheric) {
      atmospheric.pause();
    }
  };

  const playNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(tracks[nextIndex]);
    }
  };

  const playPrevious = () => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      setCurrentTrack(tracks[prevIndex]);
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAdventureChoice = (choice: any) => {
    const choiceData = showAdventureChoice.choices.find((c: any) => c.text === choice);
    if (choiceData?.nextTrackId) {
      const nextTrack = tracks.find(t => t.id === choiceData.nextTrackId);
      if (nextTrack) {
        setCurrentTrack(nextTrack);
        setAdventureProgress(prev => ({
          ...prev,
          choices: [...(prev?.choices || []), choice],
          consequences: [...(prev?.consequences || []), choiceData.consequence]
        }));
      }
    }
    setShowAdventureChoice(null);
  };

  const downloadTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      setDownloadProgress(prev => ({ ...prev, [trackId]: 0 }));
      
      const response = await fetch(track.url);
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      
      const reader = response.body?.getReader();
      let loaded = 0;
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          loaded += value.length;
          const progress = (loaded / total) * 100;
          setDownloadProgress(prev => ({ ...prev, [trackId]: progress }));
        }
      }
      
      setDownloadedTracks(prev => [...prev, trackId]);
      setDownloadProgress(prev => {
        const { [trackId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Failed to download track:', error);
    }
  };

  const createShareableMoment = () => {
    if (!currentTrack) return;
    
    const moment: ShareableMoment = {
      id: Date.now().toString(),
      timestamp: currentTime,
      trackId: currentTrack.id,
      title: `${currentTrack.title} - ${formatTime(currentTime)}`,
      description: currentTrack.description,
      audioClip: currentTrack.url,
      location: userLocation ? {
        lat: userLocation.lat,
        lng: userLocation.lng,
        name: 'Current Location'
      } : undefined
    };
    
    setCurrentMoment(moment);
    setShareableMoments(prev => [moment, ...prev]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!audioGuide.available || tracks.length === 0) {
    return (
      <div className="text-center py-8">
        <Headphones className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Audio Guide Not Available</h3>
        <p className="text-gray-500">This location doesn't have an audio guide yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GPS Proximity Notification */}
      {nearbyTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3"
        >
          <Navigation className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">You're near audio content!</h4>
            <p className="text-sm text-blue-700">
              {nearbyTracks.length} audio tracks are available at your location
            </p>
          </div>
          <button className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            Listen Now
          </button>
        </motion.div>
      )}

      {/* Main Audio Player */}
      <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
        {/* Visual Sync Display */}
        <AnimatePresence>
          {showVisualSync && currentVisual && visualSyncEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <img
                src={currentVisual.image}
                alt={currentVisual.caption}
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-white text-sm">{currentVisual.caption}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">{currentTrack?.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{currentTrack?.description}</p>
              
              {currentTrack?.narrator && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mic className="w-4 h-4" />
                  <span>Narrated by {currentTrack.narrator.name}</span>
                </div>
              )}
              
              {currentTrack?.gpsLocation && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>GPS-triggered content</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentTrack?.type === 'accessibility' && (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <Accessibility className="w-3 h-3" />
                  Accessible
                </div>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div 
              className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const progress = (e.clientX - rect.left) / rect.width;
                seek(progress * duration);
              }}
            >
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              
              {/* Bookmarks on progress bar */}
              {bookmarks.map((bookmark, index) => (
                <div
                  key={index}
                  className="absolute w-3 h-3 bg-yellow-400 rounded-full -mt-0.5 transform -translate-x-1/2"
                  style={{ left: `${(bookmark / duration) * 100}%` }}
                />
              ))}
            </div>
            
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => seek(Math.max(0, currentTime - 10))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Rewind className="w-5 h-5" />
            </button>

            <button
              onClick={playPrevious}
              disabled={currentTrackIndex === 0}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>

            <button
              onClick={playNext}
              disabled={currentTrackIndex === tracks.length - 1}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={() => seek(Math.min(duration, currentTime + 10))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FastForward className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`p-2 rounded-full transition-colors ${
                  showTranscript ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </button>

              <button
                onClick={createShareableMoment}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => currentTrack && downloadTrack(currentTrack.id)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <AnimatePresence>
          {showTranscript && currentTrack && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t bg-gray-50 p-6"
            >
              <h4 className="font-semibold mb-3">Transcript</h4>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{currentTrack.transcript}</p>
              </div>
              
              {currentTrack.accessibility?.audioDescription && accessibilityMode && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-900 mb-2">Audio Description</h5>
                  <p className="text-green-800 text-sm">{currentTrack.accessibility.audioDescription}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Adventure Mode Selection */}
      {adventureModes.length > 0 && !isAdventureMode && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Choose Your Adventure</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {adventureModes.map((adventure) => (
              <div
                key={adventure.id}
                className="bg-white rounded-lg border border-purple-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedAdventure(adventure);
                  setIsAdventureMode(true);
                  const startTrack = tracks.find(t => t.id === adventure.startingTrack);
                  if (startTrack) setCurrentTrack(startTrack);
                }}
              >
                <h4 className="font-semibold text-purple-900 mb-2">{adventure.title}</h4>
                <p className="text-sm text-purple-700 mb-3">{adventure.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-purple-600">
                    <Clock className="w-3 h-3" />
                    <span>{adventure.estimatedDuration}min</span>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    adventure.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    adventure.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {adventure.difficulty}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adventure Choice Modal */}
      <AnimatePresence>
        {showAdventureChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold mb-4">{showAdventureChoice.question}</h3>
              
              <div className="space-y-3">
                {showAdventureChoice.choices.map((choice: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAdventureChoice(choice.text)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <div className="font-medium mb-1">{choice.text}</div>
                    <div className="text-sm text-gray-600">{choice.consequence}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Audio Guide Playlist</h3>
          
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {audioGuide.languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                currentTrack?.id === track.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                setCurrentTrack(track);
                setCurrentTrackIndex(index);
              }}
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                {downloadedTracks.includes(track.id) ? (
                  <Download className="w-4 h-4 text-green-600" />
                ) : track.type === 'accessibility' ? (
                  <Accessibility className="w-4 h-4 text-green-600" />
                ) : track.gpsLocation ? (
                  <Navigation className="w-4 h-4 text-blue-600" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{track.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(track.duration)}</span>
                  
                  {track.difficulty && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{track.difficulty}</span>
                    </>
                  )}
                  
                  {track.atmosphericSounds && atmosphericEnabled && (
                    <>
                      <span>•</span>
                      <Waves className="w-3 h-3" />
                    </>
                  )}
                </div>
              </div>

              {downloadProgress[track.id] !== undefined ? (
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${downloadProgress[track.id]}%` }}
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTrack(track.id);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audio Elements */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <audio
        ref={atmosphericRef}
        loop
        volume={atmosphericEnabled ? volume * 0.3 : 0}
      />
    </div>
  );
};
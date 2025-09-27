import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Award
} from 'lucide-react';

interface AudioGuideProps {
  poiId: string;
  audioGuide: {
    available: boolean;
    languages: string[];
    duration: string;
    highlights: string[];
  };
}

interface AudioTrack {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  transcript: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  type: 'introduction' | 'history' | 'architecture' | 'story' | 'interactive';
  difficulty: 'beginner' | 'intermediate' | 'expert';
  tags: string[];
  narrator: {
    name: string;
    title: string;
    bio: string;
  };
}

interface PlaylistSection {
  id: string;
  title: string;
  description: string;
  tracks: AudioTrack[];
  estimatedTime: number;
}

export const AudioGuide: React.FC<AudioGuideProps> = ({ poiId, audioGuide }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(audioGuide.languages[0] || 'en');
  const [playlist, setPlaylist] = useState<PlaylistSection[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchAudioGuide();
  }, [poiId, selectedLanguage]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => playNext();
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const fetchAudioGuide = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/pois/${poiId}/audio-guide?lang=${selectedLanguage}`);
      if (response.ok) {
        const data = await response.json();
        setPlaylist(data.sections);
        if (data.sections.length > 0 && data.sections[0].tracks.length > 0) {
          setCurrentTrack(data.sections[0].tracks[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch audio guide:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isMuted) {
        audio.volume = volume;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const playTrack = (track: AudioTrack) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const playNext = () => {
    const currentSection = playlist.find(section => 
      section.tracks.some(track => track.id === currentTrack?.id)
    );
    
    if (!currentSection || !currentTrack) return;
    
    const currentIndex = currentSection.tracks.findIndex(track => track.id === currentTrack.id);
    
    if (currentIndex < currentSection.tracks.length - 1) {
      playTrack(currentSection.tracks[currentIndex + 1]);
    } else {
      // Move to next section
      const sectionIndex = playlist.findIndex(section => section.id === currentSection.id);
      if (sectionIndex < playlist.length - 1) {
        const nextSection = playlist[sectionIndex + 1];
        if (nextSection.tracks.length > 0) {
          playTrack(nextSection.tracks[0]);
        }
      }
    }
  };

  const playPrevious = () => {
    const currentSection = playlist.find(section => 
      section.tracks.some(track => track.id === currentTrack?.id)
    );
    
    if (!currentSection || !currentTrack) return;
    
    const currentIndex = currentSection.tracks.findIndex(track => track.id === currentTrack.id);
    
    if (currentIndex > 0) {
      playTrack(currentSection.tracks[currentIndex - 1]);
    } else {
      // Move to previous section
      const sectionIndex = playlist.findIndex(section => section.id === currentSection.id);
      if (sectionIndex > 0) {
        const prevSection = playlist[sectionIndex - 1];
        if (prevSection.tracks.length > 0) {
          playTrack(prevSection.tracks[prevSection.tracks.length - 1]);
        }
      }
    }
  };

  const downloadTrack = async (track: AudioTrack) => {
    try {
      setDownloadProgress({ ...downloadProgress, [track.id]: 0 });
      
      const response = await fetch(track.url);
      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') ?? '0');
      
      if (!reader) return;
      
      let receivedLength = 0;
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        const progress = (receivedLength / contentLength) * 100;
        setDownloadProgress({ ...downloadProgress, [track.id]: progress });
      }
      
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setDownloadProgress({ ...downloadProgress, [track.id]: 100 });
    } catch (error) {
      console.error('Failed to download track:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'introduction': return <BookOpen className="w-4 h-4" />;
      case 'history': return <History className="w-4 h-4" />;
      case 'architecture': return <Camera className="w-4 h-4" />;
      case 'story': return <Users className="w-4 h-4" />;
      case 'interactive': return <Compass className="w-4 h-4" />;
      default: return <Headphones className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'introduction': return 'bg-blue-100 text-blue-800';
      case 'history': return 'bg-amber-100 text-amber-800';
      case 'architecture': return 'bg-purple-100 text-purple-800';
      case 'story': return 'bg-green-100 text-green-800';
      case 'interactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Audio Player */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl text-white overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Headphones className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Audio Guide</h2>
              <p className="text-white/80">Professional narration in {audioGuide.languages.length} languages</p>
            </div>
          </div>

          {currentTrack && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">{currentTrack.title}</h3>
                <p className="text-white/80 text-sm">{currentTrack.description}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-white/20 rounded-full h-2 cursor-pointer">
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${(currentTime / currentTrack.duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/70">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentTrack.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={playPrevious}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={handlePlayPause}
                    className="p-3 bg-white rounded-full text-blue-600 hover:bg-white/90 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  
                  <button
                    onClick={playNext}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute}>
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>

                  <select
                    value={playbackSpeed}
                    onChange={(e) => {
                      const speed = Number(e.target.value);
                      setPlaybackSpeed(speed);
                      if (audioRef.current) {
                        audioRef.current.playbackRate = speed;
                      }
                    }}
                    className="bg-white/20 text-white text-sm rounded px-2 py-1"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <audio
            ref={audioRef}
            src={currentTrack?.url}
            onLoadedData={() => setIsPlaying(true)}
          />
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Language Selection
          </h3>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showTranscript 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Show Transcript
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {audioGuide.languages.map((language) => (
            <button
              key={language}
              onClick={() => setSelectedLanguage(language)}
              className={`p-3 rounded-lg border-2 transition-colors text-center ${
                selectedLanguage === language
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{language.toUpperCase()}</div>
              <div className="text-xs text-gray-600">
                {getLanguageName(language)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && currentTrack && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <p className="text-gray-700 leading-relaxed">{currentTrack.transcript}</p>
          </div>
        </motion.div>
      )}

      {/* Playlist Sections */}
      <div className="space-y-6">
        {playlist.map((section) => (
          <div key={section.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {Math.ceil(section.estimatedTime / 60)} min
                  </div>
                  <div className="text-xs text-gray-500">
                    {section.tracks.length} tracks
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y">
              {section.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    currentTrack?.id === track.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => playTrack(track)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 truncate">{track.title}</h4>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm text-gray-600">{formatTime(track.duration)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTrack(track);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{track.description}</p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(track.type)}`}>
                          <span className="flex items-center gap-1">
                            {getTypeIcon(track.type)}
                            {track.type}
                          </span>
                        </span>

                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {track.difficulty}
                        </span>

                        {track.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {track.location.name}
                          </span>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Award className="w-3 h-3" />
                          {track.narrator.name}
                        </div>
                      </div>

                      {track.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {track.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {track.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{track.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Helper function to get language name
const getLanguageName = (code: string) => {
  const languages: { [key: string]: string } = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'ar': 'العربية'
  };
  return languages[code] || code.toUpperCase();
};
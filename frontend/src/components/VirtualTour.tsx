/**
 * VirtualTour - Immersive 360° virtual tour functionality
 * Interactive property exploration with hotspot navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { propertyService } from '../services/propertyService';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Navigation,
  Home,
  Bed,
  Utensils,
  Bath,
  Sofa,
  Car,
  Trees,
  Camera,
  Info,
  MapPin,
  Move3D,
  Eye,
  Compass,
  Volume2,
  VolumeX,
  Settings,
  Share2,
  Download,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from 'lucide-react';

interface VirtualTourProps {
  property: Property;
}

interface TourScene {
  id: string;
  name: string;
  type: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'exterior' | 'amenity';
  panoramaUrl: string;
  thumbnailUrl: string;
  description: string;
  hotspots: Hotspot[];
  audioUrl?: string;
  defaultView: {
    yaw: number;
    pitch: number;
    fov: number;
  };
}

interface Hotspot {
  id: string;
  type: 'scene' | 'info' | 'media';
  position: {
    yaw: number;
    pitch: number;
  };
  targetSceneId?: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  icon: string;
}

interface TourSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  showHotspots: boolean;
  enableAudio: boolean;
  quality: 'low' | 'medium' | 'high';
}

export const VirtualTour: React.FC<VirtualTourProps> = ({ property }) => {
  const [scenes, setScenes] = useState<TourScene[]>([]);
  const [currentScene, setCurrentScene] = useState<TourScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [settings, setSettings] = useState<TourSettings>({
    autoRotate: false,
    autoRotateSpeed: 2,
    showHotspots: true,
    enableAudio: false,
    quality: 'medium'
  });

  // Tour controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(75);
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0 });
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  // Refs
  const tourContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    fetchTourData();
  }, [property.id]);

  useEffect(() => {
    if (currentScene && scenes.length > 0) {
      initializeTourViewer();
    }
  }, [currentScene, settings]);

  const fetchTourData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getPropertyVirtualTour(property.id);
      const tourData = response.data;
      
      setScenes(tourData.scenes);
      setCurrentScene(tourData.scenes[0]);
      
    } catch (err: any) {
      setError('Failed to load virtual tour');
      
      // Mock tour data fallback
      const mockScenes: TourScene[] = [
        {
          id: 'living-room',
          name: 'Living Room',
          type: 'living_room',
          panoramaUrl: '/api/placeholder/2048/1024',
          thumbnailUrl: '/api/placeholder/200/150',
          description: 'Spacious living room with modern furnishings and great natural light',
          defaultView: { yaw: 0, pitch: 0, fov: 75 },
          hotspots: [
            {
              id: 'to-kitchen',
              type: 'scene',
              position: { yaw: 90, pitch: 0 },
              targetSceneId: 'kitchen',
              title: 'Go to Kitchen',
              icon: 'Utensils'
            },
            {
              id: 'sofa-info',
              type: 'info',
              position: { yaw: 180, pitch: -10 },
              title: 'Comfortable Seating',
              description: 'Premium leather sofa with memory foam cushions',
              icon: 'Info'
            }
          ]
        },
        {
          id: 'kitchen',
          name: 'Kitchen',
          type: 'kitchen',
          panoramaUrl: '/api/placeholder/2048/1024',
          thumbnailUrl: '/api/placeholder/200/150',
          description: 'Fully equipped modern kitchen with stainless steel appliances',
          defaultView: { yaw: 45, pitch: 0, fov: 75 },
          hotspots: [
            {
              id: 'to-living',
              type: 'scene',
              position: { yaw: 270, pitch: 0 },
              targetSceneId: 'living-room',
              title: 'Back to Living Room',
              icon: 'Home'
            },
            {
              id: 'to-bedroom',
              type: 'scene',
              position: { yaw: 0, pitch: 0 },
              targetSceneId: 'bedroom',
              title: 'Go to Bedroom',
              icon: 'Bed'
            }
          ]
        },
        {
          id: 'bedroom',
          name: 'Master Bedroom',
          type: 'bedroom',
          panoramaUrl: '/api/placeholder/2048/1024',
          thumbnailUrl: '/api/placeholder/200/150',
          description: 'Comfortable master bedroom with queen-size bed and en-suite bathroom',
          defaultView: { yaw: 135, pitch: 0, fov: 75 },
          hotspots: [
            {
              id: 'to-bathroom',
              type: 'scene',
              position: { yaw: 90, pitch: 0 },
              targetSceneId: 'bathroom',
              title: 'En-suite Bathroom',
              icon: 'Bath'
            },
            {
              id: 'bed-info',
              type: 'info',
              position: { yaw: 180, pitch: -5 },
              title: 'Queen Size Bed',
              description: 'Premium mattress with luxury linens',
              icon: 'Info'
            }
          ]
        },
        {
          id: 'bathroom',
          name: 'Bathroom',
          type: 'bathroom',
          panoramaUrl: '/api/placeholder/2048/1024',
          thumbnailUrl: '/api/placeholder/200/150',
          description: 'Modern bathroom with walk-in shower and premium fixtures',
          defaultView: { yaw: 0, pitch: 0, fov: 75 },
          hotspots: [
            {
              id: 'to-bedroom',
              type: 'scene',
              position: { yaw: 180, pitch: 0 },
              targetSceneId: 'bedroom',
              title: 'Back to Bedroom',
              icon: 'Bed'
            }
          ]
        },
        {
          id: 'exterior',
          name: 'Exterior View',
          type: 'exterior',
          panoramaUrl: '/api/placeholder/2048/1024',
          thumbnailUrl: '/api/placeholder/200/150',
          description: 'Beautiful exterior with garden and outdoor seating area',
          defaultView: { yaw: 0, pitch: -10, fov: 75 },
          hotspots: [
            {
              id: 'to-living',
              type: 'scene',
              position: { yaw: 0, pitch: 0 },
              targetSceneId: 'living-room',
              title: 'Enter Property',
              icon: 'Home'
            },
            {
              id: 'garden-info',
              type: 'info',
              position: { yaw: 90, pitch: -20 },
              title: 'Private Garden',
              description: 'Beautifully landscaped private garden space',
              icon: 'Trees'
            }
          ]
        }
      ];
      
      setScenes(mockScenes);
      setCurrentScene(mockScenes[0]);
    } finally {
      setLoading(false);
    }
  };

  const initializeTourViewer = () => {
    // This would initialize a 360° panorama viewer (like Pannellum, A-Frame, or similar)
    // For now, we'll simulate the viewer functionality
    if (viewerRef.current) {
      // Initialize panorama viewer
      console.log('Initializing tour viewer for scene:', currentScene?.id);
    }
  };

  const navigateToScene = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
      setCurrentScene(scene);
      setRotation(scene.defaultView);
      setZoom(scene.defaultView.fov);
    }
  };

  const handleHotspotClick = (hotspot: Hotspot) => {
    if (hotspot.type === 'scene' && hotspot.targetSceneId) {
      navigateToScene(hotspot.targetSceneId);
    } else {
      setSelectedHotspot(hotspot);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && tourContainerRef.current) {
      tourContainerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? Math.max(20, prev - 10) : Math.min(100, prev + 10);
      return newZoom;
    });
  };

  const resetView = () => {
    if (currentScene) {
      setRotation(currentScene.defaultView);
      setZoom(currentScene.defaultView.fov);
    }
  };

  const getSceneIcon = (type: TourScene['type']) => {
    const icons = {
      living_room: Sofa,
      bedroom: Bed,
      kitchen: Utensils,
      bathroom: Bath,
      exterior: Trees,
      amenity: Home
    };
    return icons[type] || Home;
  };

  const getHotspotIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Home,
      Bed,
      Utensils,
      Bath,
      Info,
      Trees,
      Car,
      Camera
    };
    return icons[iconName] || Info;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading virtual tour...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Move3D className="w-5 h-5 mr-2" />
            Virtual Tour
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">360° View</Badge>
            <Button variant="outline" size="sm" onClick={() => setShowSceneSelector(true)}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              All Rooms
            </Button>
          </div>
        </div>

        {/* Tour Viewer */}
        <div
          ref={tourContainerRef}
          className={`relative bg-black rounded-lg overflow-hidden ${
            isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'
          }`}
        >
          {/* Panorama Viewer Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <Move3D className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">{currentScene?.name}</p>
              <p className="text-sm opacity-75">{currentScene?.description}</p>
            </div>
          </div>

          {/* Hotspots Overlay */}
          {settings.showHotspots && currentScene?.hotspots.map((hotspot) => {
            const IconComponent = getHotspotIcon(hotspot.icon);
            return (
              <button
                key={hotspot.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
                style={{
                  left: `${50 + (hotspot.position.yaw / 360) * 50}%`,
                  top: `${50 + (hotspot.position.pitch / 90) * 25}%`,
                }}
                onClick={() => handleHotspotClick(hotspot)}
              >
                <IconComponent className="w-5 h-5 text-blue-600" />
              </button>
            );
          })}

          {/* Tour Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Separator orientation="vertical" className="h-6 bg-white bg-opacity-30" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom('out')}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <div className="px-2 text-white text-sm">{zoom}%</div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom('in')}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6 bg-white bg-opacity-30" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={resetView}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Scene Navigation */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 rounded-lg p-2">
            <div className="flex items-center space-x-2">
              <div className="text-white text-sm font-medium">{currentScene?.name}</div>
              <Badge variant="secondary" className="text-xs">
                {scenes.findIndex(s => s.id === currentScene?.id) + 1} / {scenes.length}
              </Badge>
            </div>
          </div>

          {/* Quick Scene Navigation */}
          <div className="absolute top-4 right-4 flex space-x-2">
            {scenes.map((scene) => {
              const IconComponent = getSceneIcon(scene.type);
              return (
                <Button
                  key={scene.id}
                  variant={scene.id === currentScene?.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigateToScene(scene.id)}
                  className={`${
                    scene.id === currentScene?.id
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white hover:bg-opacity-20'
                  }`}
                  title={scene.name}
                >
                  <IconComponent className="w-4 h-4" />
                </Button>
              );
            })}
          </div>

          {/* Settings Panel Toggle */}
          <div className="absolute bottom-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scene Thumbnails */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          {scenes.map((scene) => {
            const IconComponent = getSceneIcon(scene.type);
            return (
              <button
                key={scene.id}
                onClick={() => navigateToScene(scene.id)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  scene.id === currentScene?.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-gray-400" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-white text-sm font-medium truncate">{scene.name}</div>
                </div>
                {scene.id === currentScene?.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Tour Instructions */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Eye className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">How to navigate:</p>
              <ul className="space-y-1 text-xs">
                <li>• Click and drag to look around</li>
                <li>• Click hotspots (🔵) to move between rooms or get information</li>
                <li>• Use controls to zoom, reset view, or go fullscreen</li>
                <li>• Click room thumbnails to jump directly to any space</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Scene Selector Modal */}
      <Dialog open={showSceneSelector} onOpenChange={setShowSceneSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>All Rooms & Spaces</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {scenes.map((scene) => {
              const IconComponent = getSceneIcon(scene.type);
              return (
                <button
                  key={scene.id}
                  onClick={() => {
                    navigateToScene(scene.id);
                    setShowSceneSelector(false);
                  }}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{scene.name}</div>
                    <div className="text-sm text-muted-foreground">{scene.description}</div>
                  </div>
                  {scene.id === currentScene?.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hotspot Info Modal */}
      <Dialog open={!!selectedHotspot} onOpenChange={() => setSelectedHotspot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHotspot?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedHotspot && (
            <div className="space-y-4">
              <p>{selectedHotspot.description}</p>
              
              {selectedHotspot.mediaUrl && (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setSelectedHotspot(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VirtualTour;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Search,
  Tags,
  Brain,
  Eye,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Star,
  Heart,
  Share2,
  Download,
  Edit3,
  Trash2,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Crop,
  Palette,
  Settings,
  Info,
  CheckCircle,
  X,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  Save,
  Loader2,
  ImageIcon,
  Video,
  FileImage,
  Globe,
  Clock,
  TrendingUp,
  Target,
  Zap,
  Bookmark
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface AIPhotoSystemProps {
  onClose: () => void;
  initialPhotos?: Photo[];
  tripContext?: TripContext;
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  title?: string;
  description?: string;
  takenAt: Date;
  location?: {
    lat: number;
    lng: number;
    address: string;
    poi?: string;
  };
  metadata: {
    camera?: string;
    settings?: string;
    size: number;
    dimensions: { width: number; height: number };
  };
  aiAnalysis: {
    tags: AITag[];
    objects: DetectedObject[];
    scenes: SceneClassification[];
    emotions: EmotionAnalysis[];
    landmarks: LandmarkDetection[];
    text: TextDetection[];
    faces: FaceDetection[];
    activities: ActivityDetection[];
  };
  userTags: string[];
  isPrivate: boolean;
  isFavorite: boolean;
  collections: string[];
  similarity?: number;
}

interface AITag {
  name: string;
  confidence: number;
  category: 'object' | 'scene' | 'activity' | 'emotion' | 'style' | 'color' | 'weather';
  boundingBox?: BoundingBox;
}

interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
  attributes: Record<string, any>;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SceneClassification {
  scene: string;
  confidence: number;
  attributes: string[];
}

interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  personId?: string;
}

interface LandmarkDetection {
  name: string;
  confidence: number;
  description: string;
  wikipedia?: string;
  category: string;
}

interface PhotoSearchFilters {
  tags: string[];
  locations: string[];
  dateRange: { start?: Date; end?: Date };
  people: string[];
  objects: string[];
  scenes: string[];
  emotions: string[];
  collections: string[];
  isPrivate?: boolean;
  isFavorite?: boolean;
}

interface SearchResult {
  photos: Photo[];
  totalCount: number;
  clusters: PhotoCluster[];
  suggestions: SearchSuggestion[];
  relatedQueries: string[];
}

interface PhotoCluster {
  id: string;
  type: 'location' | 'event' | 'person' | 'object' | 'time';
  name: string;
  photos: Photo[];
  similarity: number;
}

interface SearchSuggestion {
  query: string;
  type: 'tag' | 'location' | 'person' | 'activity';
  count: number;
  preview: Photo[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AIPhotoSystem({ onClose, initialPhotos = [], tripContext }: AIPhotoSystemProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filters, setFilters] = useState<PhotoSearchFilters>({
    tags: [],
    locations: [],
    dateRange: {},
    people: [],
    objects: [],
    scenes: [],
    emotions: [],
    collections: [],
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'relevance' | 'similarity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // AI Photo Analysis
  const analyzePhoto = async (file: File): Promise<Photo['aiAnalysis']> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/photos/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        const analysis = await response.json();
        return analysis;
      }
    } catch (error) {
      console.error('Failed to analyze photo:', error);
    }

    return {
      tags: [],
      objects: [],
      scenes: [],
      emotions: [],
      landmarks: [],
      text: [],
      faces: [],
      activities: []
    };
  };

  // Smart Photo Search
  const searchPhotos = useCallback(async (query: string, searchFilters?: PhotoSearchFilters) => {
    setIsSearching(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/photos/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: query,
          filters: searchFilters || filters,
          semanticSearch: true,
          includeVisualSimilarity: true,
          includeClusters: true,
          contextualFilters: {
            tripContext: tripContext,
            userPreferences: JSON.parse(localStorage.getItem('user_preferences') || '{}')
          }
        })
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Failed to search photos:', error);
    } finally {
      setIsSearching(false);
    }
  }, [filters, tripContext]);

  // Handle Photo Upload
  const handlePhotoUpload = async (files: FileList) => {
    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // Create thumbnail URL
        const thumbnailUrl = URL.createObjectURL(file);
        
        // Analyze photo with AI
        const aiAnalysis = await analyzePhoto(file);
        
        // Extract metadata
        const metadata = {
          size: file.size,
          dimensions: { width: 0, height: 0 }, // Would be extracted from image
        };

        // Upload to server
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('analysis', JSON.stringify(aiAnalysis));
        formData.append('tripContext', JSON.stringify(tripContext));

        const response = await fetch(`${API_BASE_URL}/ai/photos/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        if (response.ok) {
          const uploadedPhoto = await response.json();
          return {
            ...uploadedPhoto,
            thumbnailUrl,
            aiAnalysis,
            metadata,
            userTags: [],
            isPrivate: false,
            isFavorite: false,
            collections: []
          } as Photo;
        }
      } catch (error) {
        console.error('Failed to upload photo:', error);
      }
      return null;
    });

    const uploadedPhotos = (await Promise.all(uploadPromises)).filter(Boolean) as Photo[];
    setPhotos(prev => [...uploadedPhotos, ...prev]);
    setIsUploading(false);
  };

  // Handle Search Input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchPhotos(query);
    } else {
      setSearchResults(null);
    }
  };

  // Toggle Photo Selection
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Add Tag to Photo
  const addTagToPhoto = async (photoId: string, tag: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/photos/${photoId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ tag })
      });

      if (response.ok) {
        setPhotos(prev => prev.map(photo => 
          photo.id === photoId 
            ? { ...photo, userTags: [...photo.userTags, tag] }
            : photo
        ));
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  // Toggle Favorite
  const toggleFavorite = async (photoId: string) => {
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      const response = await fetch(`${API_BASE_URL}/ai/photos/${photoId}/favorite`, {
        method: photo.isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Photo Grid Component
  const PhotoGrid = ({ photos: gridPhotos, isSearchResult = false }: { photos: Photo[], isSearchResult?: boolean }) => (
    <div className={`grid gap-4 ${
      viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
    }`}>
      {gridPhotos.map((photo) => (
        <div
          key={photo.id}
          className={`relative group cursor-pointer rounded-lg overflow-hidden ${
            selectedPhotos.includes(photo.id) ? 'ring-2 ring-primary' : ''
          } ${viewMode === 'list' ? 'flex space-x-4 p-4 bg-muted/30' : ''}`}
          onClick={() => setSelectedPhoto(photo)}
        >
          {viewMode === 'grid' ? (
            <>
              <div className="aspect-square overflow-hidden">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-black/20 text-white hover:bg-black/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                  >
                    <CheckCircle className={`h-3 w-3 ${selectedPhotos.includes(photo.id) ? 'text-primary' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-black/20 text-white hover:bg-black/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(photo.id);
                    }}
                  >
                    <Heart className={`h-3 w-3 ${photo.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>

                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {photo.aiAnalysis.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-black/40 text-white">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  
                  {isSearchResult && photo.similarity && (
                    <div className="flex items-center space-x-1 text-xs text-white">
                      <Target className="h-3 w-3" />
                      <span>{Math.round(photo.similarity * 100)}% match</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium truncate">{photo.title || `Photo ${photo.id.slice(-8)}`}</h4>
                    <p className="text-sm text-muted-foreground">
                      {photo.takenAt.toLocaleDateString()}
                    </p>
                    {photo.location && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{photo.location.poi || photo.location.address}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(photo.id);
                      }}
                    >
                      <Heart className={`h-3 w-3 ${photo.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {photo.aiAnalysis.tags.slice(0, 5).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  // Photo Detail Modal
  const PhotoDetailModal = ({ photo }: { photo: Photo }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Image */}
        <div className="flex-1 relative">
          <img
            src={photo.url}
            alt={photo.title || 'Photo'}
            className="w-full h-full object-contain"
          />
          
          {/* Image Controls */}
          <div className="absolute top-4 left-4 flex space-x-2">
            <Button variant="ghost" size="icon" className="bg-black/50 text-white hover:bg-black/70">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="bg-black/50 text-white hover:bg-black/70">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="bg-black/50 text-white hover:bg-black/70">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Photo Details Sidebar */}
        <div className="w-80 border-l bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium mb-2">{photo.title || `Photo ${photo.id.slice(-8)}`}</h3>
            <p className="text-sm text-muted-foreground">
              Taken on {photo.takenAt.toLocaleDateString()}
            </p>
            {photo.location && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{photo.location.poi || photo.location.address}</span>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* AI Analysis */}
              <div>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>AI Analysis</span>
                </h4>
                
                {/* Detected Objects */}
                {photo.aiAnalysis.objects.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Detected Objects</h5>
                    <div className="flex flex-wrap gap-1">
                      {photo.aiAnalysis.objects.map((obj, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {obj.name} ({Math.round(obj.confidence * 100)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Scene Classification */}
                {photo.aiAnalysis.scenes.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Scene</h5>
                    <div className="flex flex-wrap gap-1">
                      {photo.aiAnalysis.scenes.map((scene, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {scene.scene} ({Math.round(scene.confidence * 100)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Landmarks */}
                {photo.aiAnalysis.landmarks.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Landmarks</h5>
                    {photo.aiAnalysis.landmarks.map((landmark, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded border-l-2 border-blue-300 mb-2">
                        <div className="font-medium text-sm text-blue-700">{landmark.name}</div>
                        <div className="text-xs text-blue-600">{landmark.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(landmark.confidence * 100)}% confidence
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* All AI Tags */}
                <div>
                  <h5 className="text-sm font-medium mb-2">AI Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {photo.aiAnalysis.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={`text-xs cursor-pointer hover:bg-muted ${
                          filters.tags.includes(tag.name) ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        onClick={() => {
                          const newTags = filters.tags.includes(tag.name)
                            ? filters.tags.filter(t => t !== tag.name)
                            : [...filters.tags, tag.name];
                          setFilters(prev => ({ ...prev, tags: newTags }));
                          if (newTags.length > 0) {
                            searchPhotos(searchQuery);
                          }
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* User Tags */}
              <div>
                <h4 className="font-medium mb-2">Your Tags</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {photo.userTags.map((tag, index) => (
                    <Badge key={index} variant="default" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a tag..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          addTagToPhoto(photo.id, input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Actions */}
              <div>
                <h4 className="font-medium mb-2">Actions</h4>
                <div className="flex flex-col space-y-2">
                  <Button variant="outline" size="sm" className="justify-start">
                    <Download className="h-3 w-3 mr-2" />
                    Download Original
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start">
                    <Share2 className="h-3 w-3 mr-2" />
                    Share Photo
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start">
                    <Edit3 className="h-3 w-3 mr-2" />
                    Edit Photo
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start text-red-600">
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete Photo
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-black">
                  <Camera className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">AI Photo Management</h2>
                <p className="text-sm text-muted-foreground">
                  Smart photo tagging, search, and organization
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>Upload Photos</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by objects, scenes, locations, or describe what you're looking for..."
                className="pl-10 bg-background"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Active Filters */}
          {(filters.tags.length > 0 || filters.locations.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer">
                  {tag}
                  <X 
                    className="h-3 w-3 ml-1"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      tags: prev.tags.filter(t => t !== tag)
                    }))}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 grid w-fit grid-cols-4">
              <TabsTrigger value="all">All Photos</TabsTrigger>
              <TabsTrigger value="search">Search Results</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="all" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {photos.length > 0 ? (
                      <PhotoGrid photos={photos} />
                    ) : (
                      <div className="text-center py-12">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No Photos Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Upload your first photos to start using AI-powered organization
                        </p>
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photos
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="search" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {isSearching ? (
                      <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">AI is analyzing your photos...</p>
                      </div>
                    ) : searchResults ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            Found {searchResults.totalCount} photos
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Brain className="h-4 w-4" />
                            <span>AI-powered search</span>
                          </div>
                        </div>
                        
                        {/* Photo Clusters */}
                        {searchResults.clusters.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Smart Clusters</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              {searchResults.clusters.map((cluster) => (
                                <Card key={cluster.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="grid grid-cols-2 gap-1 w-16 h-16">
                                        {cluster.photos.slice(0, 4).map((photo, index) => (
                                          <div key={index} className="aspect-square rounded overflow-hidden">
                                            <img 
                                              src={photo.thumbnailUrl} 
                                              alt="" 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-medium">{cluster.name}</h5>
                                        <p className="text-sm text-muted-foreground">
                                          {cluster.photos.length} photos
                                        </p>
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {Math.round(cluster.similarity * 100)}% similar
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <PhotoGrid photos={searchResults.photos} isSearchResult={true} />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Search Your Photos</h3>
                        <p className="text-muted-foreground">
                          Use natural language to find photos by content, location, or description
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="favorites" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <PhotoGrid photos={photos.filter(p => p.isFavorite)} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="collections" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="text-center py-12">
                      <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-medium mb-2">Collections</h3>
                      <p className="text-muted-foreground">
                        Organize your photos into smart collections
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handlePhotoUpload(e.target.files);
            }
          }}
        />

        {/* Photo Detail Modal */}
        {selectedPhoto && <PhotoDetailModal photo={selectedPhoto} />}
      </div>
    </div>
  );
}

interface TripContext {
  destination: string;
  dates: { start: Date; end: Date };
}

interface TextDetection {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

interface FaceDetection {
  personId: string;
  confidence: number;
  boundingBox: BoundingBox;
  emotions: EmotionAnalysis[];
}

interface ActivityDetection {
  activity: string;
  confidence: number;
  participants: number;
}
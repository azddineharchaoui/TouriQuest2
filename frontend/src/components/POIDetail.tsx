import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { 
  ChevronLeft,
  ChevronRight,
  Star,
  Heart,
  Share2,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Camera,
  Eye,
  Headphones,
  Play,
  Smartphone,
  Calendar,
  Navigation,
  Info,
  Accessibility,
  Baby,
  Volume2,
  Download,
  Languages,
  Zap,
  Award,
  Shield,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Timer,
  Route,
  Car,
  Train,
  Bus,
  Coffee,
  MapIcon,
  Phone,
  Globe,
  MessageCircle,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Flag,
  ExternalLink,
  Sparkles,
  Film,
  RotateCcw
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface POI {
  id: string;
  name: string;
  category: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  distance: string;
  openingHours: string;
  isOpen: boolean;
  entryPrice: string;
  hasARExperience: boolean;
  hasAudioGuide: boolean;
  description: string;
  coordinates: { lat: number; lng: number };
  isAccessible: boolean;
  isFamilyFriendly: boolean;
  allowsPhotography: boolean;
  estimatedVisitDuration: string;
  address: string;
  phone?: string;
  website?: string;
  tags: string[];
  historicalContext?: string;
  bestTimeToVisit?: string;
  photographyTips?: string[];
  visitorGuidelines?: string[];
  interestingFacts?: string[];
  architecturalStyle?: string;
  audioGuideLanguages?: string[];
  nearbyAmenities?: string[];
  transportOptions?: Array<{
    type: string;
    description: string;
    duration: string;
  }>;
}

const mockPOI: POI = {
  id: '1',
  name: 'National Art Museum',
  category: 'museums',
  image: 'https://images.unsplash.com/photo-1621760681857-215258afbbee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjdWx0dXJhbCUyMGhlcml0YWdlfGVufDF8fHx8MTc1ODIxNDU1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  images: [
    'https://images.unsplash.com/photo-1621760681857-215258afbbee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjdWx0dXJhbCUyMGhlcml0YWdlfGVufDF8fHx8MTc1ODIxNDU1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1633700774912-b26913ace672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpY2FsJTIwY2FzdGxlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc1ODMxMTU2NXww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1680528221851-6689939132a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhuYXR1cmUlMjBwYXJrJTIwZm9yZXN0fGVufDF8fHx8MTc1ODMxMTU3Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1667388968964-4aa652df0a9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhmb29kJTIwZGluaW5nJTIwcmVzdGF1cmFudHxlbnwxfHx8fDE3NTgzMTE1NzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1730320221074-b7199cbd25b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbnRlcnRhaW5tZW50JTIwdGhlYXRlciUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc1ODMxMTU4Mnww&ixlib=rb-4.1.0&q=80&w=1080'
  ],
  rating: 4.7,
  reviews: 234,
  distance: '0.8 km',
  openingHours: 'Mon-Sun: 9:00 AM - 6:00 PM',
  isOpen: true,
  entryPrice: '$12 (Adults), $8 (Students), Free (Under 12)',
  hasARExperience: true,
  hasAudioGuide: true,
  description: 'Discover world-class contemporary art collections spanning centuries of artistic excellence. The National Art Museum houses over 15,000 works from renowned artists around the globe, featuring rotating exhibitions and permanent collections that celebrate both classical and modern artistic movements.',
  coordinates: { lat: 40.7128, lng: -74.0060 },
  isAccessible: true,
  isFamilyFriendly: true,
  allowsPhotography: false,
  estimatedVisitDuration: '2-3 hours',
  address: '123 Museum Boulevard, Cultural District, City Center',
  phone: '+1 (555) 123-4567',
  website: 'www.nationalartmuseum.org',
  tags: ['art', 'culture', 'indoor', 'educational'],
  historicalContext: 'Built in 1892, this neo-classical building originally served as the city\'s main library before being converted to an art museum in 1925. The museum has been a cultural cornerstone of the city for nearly a century.',
  bestTimeToVisit: 'Early morning (9-11 AM) or late afternoon (4-6 PM) for fewer crowds. Tuesday and Wednesday are typically less busy.',
  architecturalStyle: 'Neo-Classical with Beaux-Arts influences, featuring marble columns and ornate ceiling frescoes',
  audioGuideLanguages: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin'],
  photographyTips: [
    'Photography is not allowed inside galleries, but the exterior architecture and lobby are perfect for photos',
    'The main entrance with marble columns creates stunning symmetrical shots',
    'Golden hour lighting on the facade is spectacular around 5-6 PM'
  ],
  visitorGuidelines: [
    'No flash photography in any area',
    'Maintain quiet voices in gallery spaces',
    'Do not touch artwork or displays',
    'Food and drinks only in designated café areas',
    'Large bags must be checked at entrance'
  ],
  interestingFacts: [
    'The museum\'s dome was inspired by the Pantheon in Rome',
    'Houses the world\'s third-largest collection of Impressionist paintings',
    'The building survived the Great Fire of 1906 with minimal damage',
    'Over 2 million visitors annually make it the city\'s most popular cultural attraction'
  ],
  nearbyAmenities: ['Restrooms', 'Gift Shop', 'Café', 'Parking Garage', 'Tourist Information'],
  transportOptions: [
    {
      type: 'Metro',
      description: 'Cultural District Station (Blue Line)',
      duration: '2 min walk'
    },
    {
      type: 'Bus',
      description: 'Routes 15, 23, 45 - Museum Stop',
      duration: '1 min walk'
    },
    {
      type: 'Car',
      description: 'Underground parking garage available',
      duration: '$8 per hour'
    }
  ]
};

const mockReviews = [
  {
    id: '1',
    user: 'Sarah Mitchell',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: 'December 2024',
    comment: 'Absolutely incredible collection! The Impressionist wing alone is worth the visit. The AR experience really brought the paintings to life - highly recommend trying it.',
    images: ['https://images.unsplash.com/photo-1621760681857-215258afbbee?w=300&h=200&fit=crop'],
    helpful: 23,
    wasHelpful: false
  },
  {
    id: '2',
    user: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    rating: 4,
    date: 'November 2024',
    comment: 'Beautiful museum with excellent curation. The audio guide was very informative. Only downside was how crowded it got in the afternoon.',
    images: [],
    helpful: 18,
    wasHelpful: true
  },
  {
    id: '3',
    user: 'Emma Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: 'October 2024',
    comment: 'Perfect for families! My kids loved the interactive exhibits and the staff was incredibly patient and helpful.',
    images: [],
    helpful: 15,
    wasHelpful: false
  }
];

interface POIDetailProps {
  poi?: POI;
  onBack?: () => void;
  onAddToItinerary?: (poi: POI) => void;
  onStartAudioGuide?: (poi: POI) => void;
  onStartARExperience?: (poi: POI) => void;
}

export function POIDetail({ 
  poi = mockPOI, 
  onBack, 
  onAddToItinerary, 
  onStartAudioGuide, 
  onStartARExperience 
}: POIDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderImageGallery = () => (
    <div className="relative">
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-96 rounded-xl overflow-hidden">
        <div className="col-span-2 row-span-2 relative group">
          <ImageWithFallback
            src={poi.images[0]}
            alt={poi.name}
            className="w-full h-full object-cover"
          />
          
          {/* AR Experience Button */}
          {poi.hasARExperience && (
            <Button 
              className="absolute top-4 left-4 bg-purple-600 hover:bg-purple-700"
              onClick={() => onStartARExperience?.(poi)}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Start AR Experience
            </Button>
          )}
          
          {/* Audio Guide Button */}
          {poi.hasAudioGuide && (
            <Button 
              variant="secondary"
              className="absolute top-16 left-4"
              onClick={() => onStartAudioGuide?.(poi)}
            >
              <Play className="w-4 h-4 mr-2" />
              Audio Guide
            </Button>
          )}
        </div>
        
        {poi.images.slice(1, 5).map((image, index) => (
          <div key={index} className="relative group">
            <ImageWithFallback
              src={image}
              alt={`${poi.name} ${index + 2}`}
              className="w-full h-full object-cover"
            />
            {index === 3 && poi.images.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <button 
                  onClick={() => setShowAllPhotos(true)}
                  className="text-black font-medium flex items-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>+{poi.images.length - 5} photos</span>
                </button>
              </div>
            )}
          </div>
        ))}
        
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>
          <button className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors">
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={() => setShowAllPhotos(true)}
            className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg font-medium text-sm flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>View all {poi.images.length} photos</span>
          </button>
        </div>

        {/* 360° Virtual Tour Button */}
        <div className="absolute bottom-4 left-4">
          <Button variant="secondary" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            360° Virtual Tour
          </Button>
        </div>
      </div>
    </div>
  );

  const renderEssentialInfo = () => (
    <Card className="p-6 sticky top-6">
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-2xl font-bold mb-2">{poi.name}</h2>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-1">
              <Star className="w-5 h-5 fill-current text-yellow-400" />
              <span className="font-semibold">{poi.rating}</span>
              <span className="text-muted-foreground">({poi.reviews} reviews)</span>
            </div>
            <Badge className={`${poi.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-0`}>
              <Clock className="w-3 h-3 mr-1" />
              {poi.isOpen ? 'Open Now' : 'Closed'}
            </Badge>
          </div>
        </div>

        {/* Opening Hours */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Opening Hours
          </h4>
          <p className="text-sm">{poi.openingHours}</p>
        </div>

        {/* Entry Fees */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Entry Fees
          </h4>
          <p className="text-sm">{poi.entryPrice}</p>
        </div>

        {/* Address & Contact */}
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Address
            </h4>
            <p className="text-sm">{poi.address}</p>
          </div>

          {poi.phone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{poi.phone}</span>
            </div>
          )}

          {poi.website && (
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <a href={poi.website} className="text-sm text-primary hover:underline">
                {poi.website}
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => onAddToItinerary?.(poi)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Itinerary
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {poi.hasAudioGuide && (
              <Button 
                variant="outline" 
                onClick={() => onStartAudioGuide?.(poi)}
              >
                <Headphones className="w-4 h-4 mr-2" />
                Audio Guide
              </Button>
            )}
            
            {poi.hasARExperience && (
              <Button 
                variant="outline"
                onClick={() => onStartARExperience?.(poi)}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                AR View
              </Button>
            )}
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 className="font-semibold mb-3">Features</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{poi.estimatedVisitDuration}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{poi.distance} away</span>
            </div>
            {poi.isAccessible && (
              <div className="flex items-center space-x-2">
                <Accessibility className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Accessible</span>
              </div>
            )}
            {poi.isFamilyFriendly && (
              <div className="flex items-center space-x-2">
                <Baby className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600">Family-friendly</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Description */}
            <div>
              <h3 className="text-xl font-semibold mb-4">About This Place</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {poi.description}
              </p>
              
              {poi.historicalContext && (
                <div>
                  <h4 className="font-semibold mb-2">Historical Context</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {poi.historicalContext}
                  </p>
                </div>
              )}
            </div>

            {/* Interesting Facts */}
            {poi.interestingFacts && (
              <div>
                <button
                  onClick={() => toggleSection('facts')}
                  className="flex items-center space-x-2 text-xl font-semibold mb-4 hover:text-primary transition-colors"
                >
                  <Lightbulb className="w-5 h-5" />
                  <span>Did You Know?</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'facts' ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedSection === 'facts' && (
                  <div className="space-y-3">
                    {poi.interestingFacts.map((fact, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{fact}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Architecture & Style */}
            {poi.architecturalStyle && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Architectural Style
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {poi.architecturalStyle}
                </p>
              </div>
            )}

            {/* Best Time to Visit */}
            {poi.bestTimeToVisit && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Timer className="w-4 h-4 mr-2" />
                  Best Time to Visit
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {poi.bestTimeToVisit}
                </p>
              </div>
            )}
          </div>
        );

      case 'practical':
        return (
          <div className="space-y-8">
            {/* Visitor Guidelines */}
            {poi.visitorGuidelines && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Visitor Guidelines
                </h3>
                <div className="space-y-2">
                  {poi.visitorGuidelines.map((guideline, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{guideline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photography Tips */}
            {poi.photographyTips && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Photography Tips
                </h3>
                <div className="space-y-3">
                  {poi.photographyTips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Camera className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How to Get There */}
            {poi.transportOptions && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Route className="w-5 h-5 mr-2" />
                  How to Get There
                </h3>
                <div className="space-y-4">
                  {poi.transportOptions.map((option, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start space-x-3">
                        {option.type === 'Metro' && <Train className="w-5 h-5 text-blue-600 mt-0.5" />}
                        {option.type === 'Bus' && <Bus className="w-5 h-5 text-green-600 mt-0.5" />}
                        {option.type === 'Car' && <Car className="w-5 h-5 text-purple-600 mt-0.5" />}
                        <div className="flex-1">
                          <h4 className="font-semibold">{option.type}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                          <p className="text-sm font-medium text-primary">{option.duration}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby Amenities */}
            {poi.nearbyAmenities && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Nearby Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {poi.nearbyAmenities.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'experiences':
        return (
          <div className="space-y-8">
            {/* Audio Guide */}
            {poi.hasAudioGuide && (
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Headphones className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Audio Guide Experience</h3>
                    <p className="text-muted-foreground mb-4">
                      Professional narration with detailed insights about the collection, 
                      available in multiple languages with synchronized visual cues.
                    </p>
                    
                    {poi.audioGuideLanguages && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Available Languages:</h4>
                        <div className="flex flex-wrap gap-2">
                          {poi.audioGuideLanguages.map((language, index) => (
                            <Badge key={index} variant="outline">
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button onClick={() => onStartAudioGuide?.(poi)}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Audio Guide
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* AR Experience */}
            {poi.hasARExperience && (
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">AR Experience</h3>
                    <p className="text-muted-foreground mb-4">
                      Immersive augmented reality experience that brings historical contexts 
                      to life with 3D reconstructions and interactive storytelling.
                    </p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Interactive 3D models and animations</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Historical reconstruction overlays</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Film className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Capture and share AR moments</span>
                      </div>
                    </div>
                    
                    <Button onClick={() => onStartARExperience?.(poi)} className="bg-purple-600 hover:bg-purple-700">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Launch AR Experience
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Virtual Tour */}
            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <RotateCcw className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">360° Virtual Tour</h3>
                  <p className="text-muted-foreground mb-4">
                    Explore every corner with our immersive virtual tour. Perfect for 
                    planning your visit or experiencing the space remotely.
                  </p>
                  
                  <Button variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Virtual Tour
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Visitor Reviews</h3>
              <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                Write a Review
              </Button>
            </div>

            {/* Rating Breakdown */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{poi.rating}</div>
                  <div className="flex justify-center mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < Math.floor(poi.rating) ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <div className="text-muted-foreground">{poi.reviews} reviews</div>
                </div>
                
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center space-x-2">
                      <span className="text-sm w-8">{stars}</span>
                      <Star className="w-3 h-3 fill-current text-yellow-400" />
                      <Progress value={stars === 5 ? 70 : stars === 4 ? 20 : 10} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-8">{stars === 5 ? '70%' : stars === 4 ? '20%' : '10%'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Reviews List */}
            <div className="space-y-6">
              {mockReviews.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <ImageWithFallback
                      src={review.avatar}
                      alt={review.user}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{review.user}</span>
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">• {review.date}</span>
                      </div>
                      
                      <p className="text-sm leading-relaxed mb-4">{review.comment}</p>
                      
                      {review.images.length > 0 && (
                        <div className="flex space-x-2 mb-4">
                          {review.images.map((image, index) => (
                            <ImageWithFallback
                              key={index}
                              src={image}
                              alt={`Review photo ${index + 1}`}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <button className="flex items-center space-x-1 hover:text-foreground">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Helpful ({review.helpful})</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-foreground">
                          <ThumbsDown className="w-4 h-4" />
                          <span>Not helpful</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-foreground">
                          <Flag className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="outline">Load more reviews</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Discovery
        </Button>
      )}

      {/* Image Gallery */}
      {renderImageGallery()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Navigation */}
          <div className="border-b">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'practical', label: 'Practical Info', icon: MapIcon },
                { id: 'experiences', label: 'Experiences', icon: Sparkles },
                { id: 'reviews', label: 'Reviews', icon: Star }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        <div>
          {renderEssentialInfo()}
        </div>
      </div>

      {/* Related POIs */}
      <div className="border-t pt-8">
        <h3 className="text-xl font-semibold mb-6">Also explore nearby</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <ImageWithFallback
                  src={poi.images[index + 1] || poi.images[0]}
                  alt={`Related POI ${index + 1}`}
                  className="w-full h-40 object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  {(4.2 + index * 0.2).toFixed(1)}
                </Badge>
              </div>
              <div className="p-4">
                <h4 className="font-semibold mb-2">Heritage Site {index + 1}</h4>
                <p className="text-sm text-muted-foreground mb-3">Cultural District</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span>{1.2 + index * 0.3} km away</span>
                  </div>
                  <Button size="sm" variant="outline">Explore</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
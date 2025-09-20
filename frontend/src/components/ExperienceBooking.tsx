import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  Star,
  Clock,
  Users,
  MapPin,
  Calendar as CalendarIcon,
  ChevronLeft,
  Heart,
  Share2,
  Camera,
  Utensils,
  Mountain,
  Palette,
  Dumbbell,
  Sparkles,
  User,
  CheckCircle,
  Info,
  Shield,
  Award,
  Languages,
  Wifi,
  Car,
  Coffee,
  Leaf,
  DollarSign,
  Plus,
  Minus,
  CreditCard,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Grid3X3,
  List
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Experience {
  id: string;
  title: string;
  category: string;
  description: string;
  shortDescription: string;
  duration: string;
  groupSize: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  location: string;
  meetingPoint: string;
  languages: string[];
  includes: string[];
  notIncludes: string[];
  requirements: string[];
  cancellationPolicy: string;
  host: {
    name: string;
    avatar: string;
    verified: boolean;
    responseRate: number;
    experience: string;
    bio: string;
  };
  availability: Array<{
    date: string;
    times: string[];
    price: number;
  }>;
  tags: string[];
  isEcoFriendly: boolean;
  instantBook: boolean;
  highlights: string[];
}

const mockExperiences: Experience[] = [
  {
    id: '1',
    title: 'Artisan Pottery Workshop with Local Master',
    category: 'Cultural Workshop',
    description: 'Immerse yourself in the ancient art of pottery with a renowned local artisan. Learn traditional techniques passed down through generations while creating your own unique pieces to take home.',
    shortDescription: 'Learn traditional pottery from a master artisan',
    duration: '3 hours',
    groupSize: 'Up to 8 people',
    difficulty: 'easy',
    price: 85,
    rating: 4.9,
    reviews: 127,
    images: [
      'https://images.unsplash.com/photo-1621760681857-215258afbbee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjdWx0dXJhbCUyMGhlcml0YWdlfGVufDF8fHx8MTc1ODIxNDU1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1633700774912-b26913ace672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpY2FsJTIwY2FzdGxlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc1ODMxMTU2NXww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    location: 'Arts District, Cultural Quarter',
    meetingPoint: 'Master Chen\'s Pottery Studio, 45 Artisan Street',
    languages: ['English', 'Mandarin', 'Spanish'],
    includes: [
      'All pottery materials and tools',
      'Personal guidance from master artisan',
      'Tea and traditional snacks',
      'Take home 2 finished pieces',
      'Studio apron provided'
    ],
    notIncludes: [
      'Transportation to/from studio',
      'Additional pottery pieces (available for purchase)',
      'Private photography session'
    ],
    requirements: [
      'No prior experience required',
      'Minimum age 12 years',
      'Comfortable clothing recommended',
      'Closed-toe shoes required'
    ],
    cancellationPolicy: 'Free cancellation up to 24 hours before the experience',
    host: {
      name: 'Master Chen Wei',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      verified: true,
      responseRate: 98,
      experience: '15+ years teaching pottery',
      bio: 'Third-generation potter specializing in traditional glazing techniques and contemporary forms.'
    },
    availability: [
      {
        date: '2024-12-20',
        times: ['09:00', '14:00'],
        price: 85
      },
      {
        date: '2024-12-21',
        times: ['09:00', '14:00', '16:00'],
        price: 85
      }
    ],
    tags: ['pottery', 'cultural', 'hands-on', 'traditional'],
    isEcoFriendly: true,
    instantBook: true,
    highlights: [
      'Learn from a 3rd generation master potter',
      'Create 2 unique pieces to take home',
      'Small group size for personal attention',
      'Includes traditional tea ceremony'
    ]
  },
  {
    id: '2',
    title: 'Sunrise Photography Tour: Hidden City Gems',
    category: 'Photography Tour',
    description: 'Capture the city\'s most photogenic spots during the magical golden hour. Professional photographer guide will teach composition techniques while discovering hidden architectural gems and scenic viewpoints.',
    shortDescription: 'Capture stunning city photos at golden hour',
    duration: '4 hours',
    groupSize: 'Up to 6 people',
    difficulty: 'moderate',
    price: 120,
    rating: 4.8,
    reviews: 89,
    images: [
      'https://images.unsplash.com/photo-1698910746353-65dadc2c2dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMGNpdHlzY2FwZXxlbnwxfHx8fDE3NTgzMTA4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1680528221851-6689939132a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhuYXR1cmUlMjBwYXJrJTIwZm9yZXN0fGVufDF8fHx8MTc1ODMxMTU3Mnww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    location: 'Historic District & Waterfront',
    meetingPoint: 'City Hall Steps, Main Plaza',
    languages: ['English', 'French', 'German'],
    includes: [
      'Professional photography guide',
      'Photo editing tips and techniques',
      'Digital copies of group shots',
      'Access to exclusive viewpoints',
      'Light breakfast and coffee'
    ],
    notIncludes: [
      'Camera equipment (DSLR recommended)',
      'Transportation between locations',
      'Individual photo editing services'
    ],
    requirements: [
      'Bring your own camera (phone acceptable)',
      'Comfortable walking shoes',
      'Early morning start (5:30 AM)',
      'Basic photography interest'
    ],
    cancellationPolicy: 'Free cancellation up to 48 hours before the experience',
    host: {
      name: 'Alexandra Torres',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      verified: true,
      responseRate: 95,
      experience: '8 years professional photography',
      bio: 'Award-winning travel photographer with published works in National Geographic and Travel + Leisure.'
    },
    availability: [
      {
        date: '2024-12-20',
        times: ['05:30'],
        price: 120
      },
      {
        date: '2024-12-22',
        times: ['05:30'],
        price: 120
      }
    ],
    tags: ['photography', 'sunrise', 'walking', 'architecture'],
    isEcoFriendly: false,
    instantBook: false,
    highlights: [
      'Exclusive access to rooftop viewpoints',
      'Professional photography instruction',
      'Small group for personalized guidance',
      'Capture iconic and hidden gems'
    ]
  }
];

const categories = [
  { id: 'cultural', name: 'Cultural Workshops', icon: Palette },
  { id: 'food', name: 'Food & Culinary', icon: Utensils },
  { id: 'adventure', name: 'Adventure & Outdoor', icon: Mountain },
  { id: 'photography', name: 'Photography Tours', icon: Camera },
  { id: 'wellness', name: 'Wellness & Spa', icon: Leaf },
  { id: 'private', name: 'Private Guides', icon: User }
];

interface ExperienceBookingProps {
  onBack?: () => void;
  onExperienceSelect?: (experience: Experience) => void;
}

export function ExperienceBooking({ onBack, onExperienceSelect }: ExperienceBookingProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [participants, setParticipants] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const [filters, setFilters] = useState({
    duration: '',
    priceRange: [0, 300] as number[],
    groupSize: '',
    difficulty: '',
    language: '',
    instantBook: false,
    ecoFriendly: false
  });

  const filteredExperiences = mockExperiences.filter(experience => {
    if (selectedCategory !== 'all' && !experience.category.toLowerCase().includes(selectedCategory)) {
      return false;
    }
    if (filters.instantBook && !experience.instantBook) return false;
    if (filters.ecoFriendly && !experience.isEcoFriendly) return false;
    return true;
  });

  const handleBookExperience = () => {
    console.log('Booking experience:', {
      experience: selectedExperience,
      date: selectedDate,
      time: selectedTime,
      participants,
      specialRequests
    });
    // Handle booking logic
  };

  const renderExperienceCard = (experience: Experience) => (
    <Card 
      key={experience.id}
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
      onClick={() => setSelectedExperience(experience)}
    >
      <div className="relative">
        <ImageWithFallback
          src={experience.images[0]}
          alt={experience.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        <div className="absolute top-3 left-3 space-y-2">
          {experience.isEcoFriendly && (
            <Badge className="bg-green-100 text-green-800 border-0">
              <Leaf className="w-3 h-3 mr-1" />
              Eco-friendly
            </Badge>
          )}
          {experience.instantBook && (
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle className="w-3 h-3 mr-1" />
              Instant Book
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex space-x-2">
          <button className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3">
          <Badge className={`${
            experience.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            experience.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          } border-0`}>
            {experience.difficulty}
          </Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <Badge variant="outline" className="mb-2 text-xs">
            {experience.category}
          </Badge>
          <h3 className="font-semibold line-clamp-2 mb-1">{experience.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{experience.shortDescription}</p>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{experience.duration}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{experience.groupSize.split(' ')[0]}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3 fill-current text-yellow-400" />
            <span className="text-xs">{experience.rating} ({experience.reviews})</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">${experience.price}</span>
            <span className="text-sm text-muted-foreground">per person</span>
          </div>
          
          <Button size="sm">
            {experience.instantBook ? 'Book Now' : 'Request'}
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderExperienceDetail = () => {
    if (!selectedExperience) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="relative">
            {/* Header Image */}
            <div className="relative h-80">
              <ImageWithFallback
                src={selectedExperience.images[0]}
                alt={selectedExperience.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              
              <button
                onClick={() => setSelectedExperience(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full"
              >
                ✕
              </button>

              <div className="absolute bottom-6 left-6 right-6 text-black">
                <Badge className="bg-white/20 text-black border-white/30 mb-3">
                  {selectedExperience.category}
                </Badge>
                <h1 className="text-3xl font-bold mb-2">{selectedExperience.title}</h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current text-yellow-400" />
                    <span>{selectedExperience.rating}</span>
                    <span>({selectedExperience.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedExperience.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Host Info */}
                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <ImageWithFallback
                    src={selectedExperience.host.avatar}
                    alt={selectedExperience.host.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{selectedExperience.host.name}</span>
                      {selectedExperience.host.verified && (
                        <Shield className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedExperience.host.experience}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                      <span>Response rate: {selectedExperience.host.responseRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">About this experience</h3>
                  <p className="text-muted-foreground leading-relaxed">{selectedExperience.description}</p>
                </div>

                {/* Highlights */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Highlights</h3>
                  <div className="space-y-2">
                    {selectedExperience.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's Included */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-green-700">What's included</h3>
                    <div className="space-y-2">
                      {selectedExperience.includes.map((item, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-red-700">Not included</h3>
                    <div className="space-y-2">
                      {selectedExperience.notIncludes.map((item, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Minus className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                  <div className="space-y-2">
                    {selectedExperience.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Booking Sidebar */}
              <div>
                <Card className="p-6 sticky top-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="text-2xl font-bold">${selectedExperience.price}</span>
                      <span className="text-muted-foreground"> per person</span>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {selectedDate ? selectedDate.toDateString() : 'Choose date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Time</label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Participants */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Participants</label>
                      <div className="flex items-center justify-between border rounded-lg p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setParticipants(Math.max(1, participants - 1))}
                          disabled={participants <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-medium">{participants}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setParticipants(participants + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Special Requests */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Special Requests (Optional)</label>
                      <Textarea
                        placeholder="Any special requirements or questions?"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBookExperience}
                      disabled={!selectedDate || !selectedTime}
                    >
                      {selectedExperience.instantBook ? 'Book Now' : 'Request Booking'}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      {selectedExperience.instantBook ? 'Instant confirmation' : 'Response within 24 hours'}
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between">
                        <span>${selectedExperience.price} x {participants} people</span>
                        <span>${selectedExperience.price * participants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service fee</span>
                        <span>${Math.round(selectedExperience.price * participants * 0.1)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span>${selectedExperience.price * participants + Math.round(selectedExperience.price * participants * 0.1)}</span>
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="text-xs text-muted-foreground">
                      <strong>Cancellation:</strong> {selectedExperience.cancellationPolicy}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold">Local Experiences</h1>
          <p className="text-muted-foreground">Discover authentic local activities and workshops</p>
        </div>
        <div />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
            selectedCategory === 'all' 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background hover:bg-muted border-border'
          }`}
        >
          <span>All Experiences</span>
        </button>
        
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
                selectedCategory === category.id 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {filteredExperiences.length} experiences found
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Select defaultValue="recommended">
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExperiences.map(renderExperienceCard)}
      </div>

      {/* Experience Detail Modal */}
      {renderExperienceDetail()}
    </div>
  );
}
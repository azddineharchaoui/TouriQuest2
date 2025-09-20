import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { 
  Star,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
  Calendar,
  Users,
  Wifi,
  Car,
  Coffee,
  Waves,
  Utensils,
  Dumbbell,
  Leaf,
  Clock,
  Sparkles,
  Eye,
  Camera,
  MessageCircle,
  Phone,
  Globe,
  Award,
  ThumbsUp,
  Filter,
  Download,
  Play,
  Volume2,
  VolumeX,
  Mountain,
  Bath,
  Tv,
  Wind,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Train,
  Plane,
  Car as CarIcon,
  ShoppingBag
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  distance: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  amenities: string[];
  isEcoFriendly: boolean;
  instantBook: boolean;
  host: {
    name: string;
    verified: boolean;
    avatar: string;
    isSuperhost?: boolean;
    responseRate?: number;
    responseTime?: string;
    joinedDate?: string;
  };
  description: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  checkInTime?: string;
  checkOutTime?: string;
  minStay?: number;
  cancellationPolicy?: string;
  houseRules?: string[];
  accessibility?: boolean;
  smoking?: boolean;
  petFriendly?: boolean;
  carbonFootprint?: number;
  coordinates?: { lat: number; lng: number };
}

const mockProperty: Property = {
  id: '1',
  title: 'Luxury Oceanview Villa with Private Pool & Beach Access',
  type: 'Villa',
  location: 'Seminyak, Bali, Indonesia',
  distance: '2.1 km from center',
  price: 450,
  rating: 4.9,
  reviews: 127,
  bedrooms: 4,
  bathrooms: 3,
  maxGuests: 8,
  checkInTime: '3:00 PM',
  checkOutTime: '11:00 AM',
  minStay: 3,
  cancellationPolicy: 'Flexible',
  houseRules: [
    'No smoking',
    'No pets allowed',
    'No parties or events',
    'Quiet hours after 10 PM'
  ],
  images: [
    'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1662454419622-a41092ecd245?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc1ODI3NzA4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1698910746353-65dadc2c2dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMGNpdHlzY2FwZXxlbnwxfHx8fDE3NTgzMTA4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1682221568203-16f33b35e57d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhib3V0aXF1ZSUyMGhvdGVsJTIwbG9iYnl8ZW58MXx8fHwxNzU4Mjc3NTM5fDA&ixlib=rb-4.1.0&q=80&w=1080'
  ],
  amenities: [
    'wifi', 'pool', 'parking', 'kitchen', 'gym', 'spa', 'balcony', 'aircon',
    'tv', 'bath', 'beachfront', 'garden', 'bbq', 'security'
  ],
  isEcoFriendly: true,
  instantBook: true,
  accessibility: false,
  smoking: false,
  petFriendly: true,
  carbonFootprint: 45,
  coordinates: { lat: -8.6705, lng: 115.1526 },
  host: {
    name: 'Maria Santos',
    verified: true,
    isSuperhost: true,
    responseRate: 98,
    responseTime: 'within an hour',
    joinedDate: 'March 2019',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
  },
  description: 'Experience the ultimate tropical getaway in this stunning oceanview villa. With direct beach access, a private infinity pool, and panoramic views of the Indian Ocean, this property offers the perfect blend of luxury and natural beauty. The villa features four spacious bedrooms, three bathrooms, and an open-plan living area that seamlessly connects indoor and outdoor spaces. Perfect for families, groups of friends, or romantic retreats.'
};

const amenityIcons = {
  wifi: Wifi,
  pool: Waves,
  parking: Car,
  kitchen: Coffee,
  gym: Dumbbell,
  spa: Heart,
  restaurant: Utensils,
  tv: Tv,
  aircon: Wind,
  balcony: Mountain,
  bath: Bath,
  beachfront: Waves,
  garden: Leaf,
  bbq: Utensils,
  security: Shield
};

const mockReviews = [
  {
    id: '1',
    user: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: 'December 2024',
    comment: 'Absolutely stunning villa! The ocean views were breathtaking and the private pool was perfect. Maria was an exceptional host - very responsive and helpful.',
    images: ['https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?w=400&h=300&fit=crop']
  },
  {
    id: '2',
    user: 'David Chen',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: 'November 2024',
    comment: 'Perfect location, amazing amenities, and spotless cleanliness. The villa exceeded our expectations in every way. Highly recommend for a luxury stay in Bali.',
    images: []
  },
  {
    id: '3',
    user: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: 'October 2024',
    comment: 'The most beautiful place we\'ve ever stayed! The sunset views from the terrace were magical. Great for families with kids.',
    images: []
  }
];

interface PropertyDetailProps {
  onBack?: () => void;
  onBook: () => void;
}

export function PropertyDetail({ onBack, onBook }: PropertyDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showContactHost, setShowContactHost] = useState(false);
  const [showReviewFilters, setShowReviewFilters] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');

  const calculateTotalNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  };

  const totalNights = calculateTotalNights();
  const subtotal = totalNights * mockProperty.price;
  const cleaningFee = 75;
  const serviceFee = Math.round(subtotal * 0.14);
  const total = subtotal + cleaningFee + serviceFee;

  const renderImageGallery = () => (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-96 rounded-xl overflow-hidden">
      <div className="col-span-2 row-span-2 relative group">
        <ImageWithFallback
          src={mockProperty.images[0]}
          alt={mockProperty.title}
          className="w-full h-full object-cover"
        />
      </div>
      
      {mockProperty.images.slice(1, 5).map((image, index) => (
        <div key={index} className="relative group">
          <ImageWithFallback
            src={image}
            alt={`${mockProperty.title} ${index + 2}`}
            className="w-full h-full object-cover"
          />
          {index === 3 && mockProperty.images.length > 5 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <button 
                onClick={() => setShowAllPhotos(true)}
                className="text-white font-medium flex items-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>Show all {mockProperty.images.length} photos</span>
              </button>
            </div>
          )}
        </div>
      ))}
      
      <div className="absolute top-4 left-4 flex space-x-2">
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
      
      <div className="absolute top-4 right-4 flex space-x-2">
        <button 
          onClick={() => setShowAllPhotos(true)}
          className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg font-medium text-sm flex items-center space-x-2"
        >
          <Camera className="w-4 h-4" />
          <span>Show all photos</span>
        </button>
      </div>
    </div>
  );

  const renderBookingCard = () => (
    <Card className="p-6 sticky top-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">${mockProperty.price}</span>
            <span className="text-muted-foreground"> night</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-current text-yellow-400" />
            <span className="font-medium">{mockProperty.rating}</span>
            <span className="text-muted-foreground">({mockProperty.reviews} reviews)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded-lg p-3">
              <Label className="text-xs text-muted-foreground">CHECK-IN</Label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="border-0 p-0 font-medium"
              />
            </div>
            <div className="border rounded-lg p-3">
              <Label className="text-xs text-muted-foreground">CHECK-OUT</Label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="border-0 p-0 font-medium"
              />
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <Label className="text-xs text-muted-foreground">GUESTS</Label>
            <select 
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full border-0 bg-transparent font-medium outline-none"
            >
              {Array.from({ length: mockProperty.maxGuests || 8 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num} guest{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button 
          className="w-full" 
          size="lg"
          onClick={onBook}
          disabled={!checkIn || !checkOut}
        >
          {mockProperty.instantBook ? 'Reserve' : 'Request to Book'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          You won't be charged yet
        </div>

        {totalNights > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="w-full text-left"
            >
              <div className="flex justify-between items-center">
                <span className="underline">Price breakdown</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showPriceBreakdown ? 'rotate-90' : ''}`} />
              </div>
            </button>
            
            {showPriceBreakdown && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span>${mockProperty.price} x {totalNights} nights</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cleaning fee</span>
                  <span>${cleaningFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>TouriQuest service fee</span>
                  <span>${serviceFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {mockProperty.isEcoFriendly && (
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center space-x-2 text-success">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-medium">Eco-friendly property</span>
            </div>
            <p className="text-xs text-success/80 mt-1">
              Carbon footprint: {mockProperty.carbonFootprint}kg CO₂ per stay
            </p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderAmenities = () => {
    const categorizedAmenities = {
      'Basics': ['wifi', 'kitchen', 'tv', 'aircon'],
      'Features': ['pool', 'gym', 'spa', 'balcony'],
      'Location': ['beachfront', 'garden', 'parking'],
      'Safety': ['security', 'smoke-detector', 'first-aid']
    };

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">What this place offers</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(categorizedAmenities).map(([category, amenityList]) => (
            <div key={category}>
              <h4 className="font-medium mb-3 text-muted-foreground">{category}</h4>
              <div className="space-y-3">
                {amenityList.map((amenity) => {
                  const Icon = amenityIcons[amenity as keyof typeof amenityIcons];
                  const hasAmenity = mockProperty.amenities.includes(amenity);
                  
                  return (
                    <div 
                      key={amenity} 
                      className={`flex items-center space-x-3 ${!hasAmenity ? 'opacity-50' : ''}`}
                    >
                      {Icon ? (
                        <Icon className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 bg-muted rounded" />
                      )}
                      <span className="capitalize">{amenity.replace('-', ' ')}</span>
                      {!hasAmenity && <div className="w-4 h-4 text-muted-foreground ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full">
          Show all {mockProperty.amenities.length} amenities
        </Button>
      </div>
    );
  };

  const renderReviews = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold">Reviews</h3>
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 fill-current text-yellow-400" />
            <span className="font-semibold">{mockProperty.rating}</span>
            <span className="text-muted-foreground">({mockProperty.reviews} reviews)</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowReviewFilters(!showReviewFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Rating Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Cleanliness', rating: 4.9 },
          { label: 'Accuracy', rating: 4.8 },
          { label: 'Check-in', rating: 5.0 },
          { label: 'Communication', rating: 4.9 },
          { label: 'Location', rating: 4.7 },
          { label: 'Value', rating: 4.8 }
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span>{item.rating}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full" 
                style={{ width: `${(item.rating / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-6">
        {mockReviews.map((review) => (
          <div key={review.id} className="space-y-3">
            <div className="flex items-start space-x-3">
              <ImageWithFallback
                src={review.avatar}
                alt={review.user}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{review.user}</span>
                  <div className="flex">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{review.date}</p>
                <p className="text-sm leading-relaxed">{review.comment}</p>
                
                {review.images.length > 0 && (
                  <div className="flex space-x-2 mt-3">
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
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full">
        Show all {mockProperty.reviews} reviews
      </Button>
    </div>
  );

  const renderHostInfo = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Meet your host</h3>
      
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <ImageWithFallback
              src={mockProperty.host.avatar}
              alt={mockProperty.host.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            {mockProperty.host.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-lg font-semibold">{mockProperty.host.name}</h4>
              {mockProperty.host.isSuperhost && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Star className="w-3 h-3 mr-1" />
                  Superhost
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <div className="font-medium text-foreground">{mockProperty.reviews}</div>
                <div>Reviews</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{mockProperty.rating}</div>
                <div>Rating</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{mockProperty.host.responseTime}</div>
                <div>Response time</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{mockProperty.host.responseRate}%</div>
                <div>Response rate</div>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-3">
          <p className="text-sm">
            {mockProperty.host.name} is a Superhost. Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.
          </p>
          
          <div className="text-xs text-muted-foreground">
            Joined in {mockProperty.host.joinedDate}
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowContactHost(true)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact host
          </Button>
          <Button variant="outline" size="icon">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderLocationInfo = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Where you'll be</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">{mockProperty.location}</h4>
          <p className="text-muted-foreground text-sm">
            Seminyak is one of Bali's most popular beach destinations, known for its upscale resorts, 
            world-class restaurants, and vibrant nightlife. The area offers beautiful beaches, 
            excellent surfing conditions, and is close to many of Bali's cultural attractions.
          </p>
        </div>
        
        {/* Map Placeholder */}
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Interactive map would be shown here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Exact location provided after booking
            </p>
          </div>
        </div>
        
        {/* Nearby Attractions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium mb-3">Getting around</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <CarIcon className="w-4 h-4 text-muted-foreground" />
                <span>Ngurah Rai Airport - 25 min drive</span>
              </div>
              <div className="flex items-center space-x-2">
                <Train className="w-4 h-4 text-muted-foreground" />
                <span>Seminyak Beach - 5 min walk</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <span>Seminyak Square - 8 min drive</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">What's nearby</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Beach access</span>
                <span className="text-muted-foreground">Direct</span>
              </div>
              <div className="flex justify-between">
                <span>Restaurants</span>
                <span className="text-muted-foreground">2 min walk</span>
              </div>
              <div className="flex justify-between">
                <span>Grocery store</span>
                <span className="text-muted-foreground">5 min walk</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Back Button */}
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to results
        </Button>
      )}

      {/* Image Gallery */}
      {renderImageGallery()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Property Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{mockProperty.title}</h1>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <span>{mockProperty.type}</span>
                  <span>•</span>
                  <span>{mockProperty.bedrooms} bedrooms</span>
                  <span>•</span>
                  <span>{mockProperty.bathrooms} bathrooms</span>
                  <span>•</span>
                  <span>{mockProperty.maxGuests} guests</span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{mockProperty.location}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{mockProperty.distance}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {mockProperty.isEcoFriendly && (
                <Badge className="bg-success text-success-foreground">
                  <Leaf className="w-3 h-3 mr-1" />
                  Eco-friendly
                </Badge>
              )}
              {mockProperty.instantBook && (
                <Badge className="bg-primary text-primary-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  Instant Book
                </Badge>
              )}
              {mockProperty.host.isSuperhost && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Star className="w-3 h-3 mr-1" />
                  Superhost
                </Badge>
              )}
            </div>

            <Separator />
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xl font-semibold mb-4">About this space</h3>
            <p className="text-muted-foreground leading-relaxed">
              {mockProperty.description}
            </p>
          </div>

          {/* Amenities */}
          {renderAmenities()}

          {/* Check-in Details */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Good to know</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">House rules</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Check-in: {mockProperty.checkInTime}</div>
                  <div>Check-out: {mockProperty.checkOutTime}</div>
                  <div>{mockProperty.maxGuests} guests maximum</div>
                  {mockProperty.houseRules?.slice(0, 2).map((rule, index) => (
                    <div key={index}>{rule}</div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Safety & property</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Pool/hot tub without a gate or lock</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Security cameras on property</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Carbon monoxide alarm</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Cancellation policy</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>{mockProperty.cancellationPolicy} cancellation</div>
                  <div>Free cancellation for 48 hours</div>
                  <div>Minimum stay: {mockProperty.minStay} nights</div>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          {renderReviews()}

          {/* Host Info */}
          {renderHostInfo()}

          {/* Location */}
          {renderLocationInfo()}
        </div>

        {/* Booking Card */}
        <div>
          {renderBookingCard()}
        </div>
      </div>

      {/* Similar Properties */}
      <div className="border-t pt-8">
        <h3 className="text-xl font-semibold mb-6">Similar places to stay</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <ImageWithFallback
                  src={mockProperty.images[index]}
                  alt={`Similar property ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  {(4.6 + index * 0.1).toFixed(1)}
                </Badge>
              </div>
              <div className="p-4">
                <h4 className="font-semibold mb-2">Beautiful Ocean Villa {index + 1}</h4>
                <p className="text-sm text-muted-foreground mb-3">Seminyak, Bali</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">${mockProperty.price + index * 50}/night</span>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
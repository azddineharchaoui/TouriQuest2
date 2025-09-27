import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Star,
  Clock,
  Users,
  MapPin,
  Calendar as CalendarIcon,
  ArrowLeft,
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
  ChevronLeft,
  Download,
  Upload,
  Send,
  Phone,
  Mail,
  Globe,
  Thermometer,
  CloudRain,
  Sun,
  Wind,
  Eye,
  ThumbsUp,
  Flag,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ExperienceService } from '../../api/services/experience';
import { ApiClient } from '../../api/client';
import { Experience as ApiExperience } from '../../types/experience';

// Enhanced interface for detailed experience view
interface ExperienceDetail extends ApiExperience {
  detailedDescription: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  requirements: string[];
  cancellationPolicy: string;
  safety: string[];
  whatToBring: string[];
  meetingPoint: {
    address: string;
    coordinates: { latitude: number; longitude: number };
    instructions: string;
  };
  accessibility: string[];
  languages: string[];
  hostInfo: {
    name: string;
    avatar: string;
    verified: boolean;
    responseRate: number;
    experience: string;
    bio: string;
    languages: string[];
    responseTime: string;
  };
}

interface ItineraryItem {
  id: string;
  time: string;
  duration: number;
  title: string;
  description: string;
  location?: string;
  activities: string[];
  photos: string[];
  tips: string[];
}

interface WeatherForecast {
  date: string;
  temperature: { min: number; max: number };
  conditions: string;
  icon: string;
  precipitation: number;
  wind: number;
  humidity: number;
  recommendation: string;
}

interface AvailabilitySlot {
  date: string;
  times: Array<{
    time: string;
    available: boolean;
    price: number;
    spotsLeft: number;
  }>;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  photos: string[];
  helpful: number;
  response?: {
    content: string;
    date: string;
  };
  categories: {
    value: number;
    organization: number;
    communication: number;
    accuracy: number;
  };
}

interface BookingFormData {
  date: Date | null;
  time: string;
  participants: {
    adults: number;
    children: number;
    seniors: number;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  specialRequirements: {
    dietary: string[];
    accessibility: string[];
    medical: string;
    other: string;
  };
  paymentMethod: string;
  agreedToTerms: boolean;
}

interface ExperienceDetailPageProps {
  experienceId: string;
  onBack: () => void;
  onBookingComplete?: (bookingId: string) => void;
}

export function ExperienceDetailPage({ experienceId, onBack, onBookingComplete }: ExperienceDetailPageProps) {
  // State management
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Booking state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingFormData>({
    date: null,
    time: '',
    participants: { adults: 1, children: 0, seniors: 0 },
    contactInfo: { name: '', email: '', phone: '' },
    specialRequirements: { dietary: [], accessibility: [], medical: '', other: '' },
    paymentMethod: '',
    agreedToTerms: false
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [expandedItineraryItem, setExpandedItineraryItem] = useState<string | null>(null);

  // API client
  const apiClient = new ApiClient();
  const experienceService = new ExperienceService(apiClient);

  // Load experience data
  useEffect(() => {
    loadExperienceData();
  }, [experienceId]);

  const loadExperienceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all data in parallel
      const [
        experienceResult,
        itineraryResult,
        weatherResult,
        availabilityResult,
        reviewsResult
      ] = await Promise.allSettled([
        experienceService.getExperience(experienceId),
        experienceService.getExperienceItinerary(experienceId),
        experienceService.getExperienceWeather(experienceId),
        experienceService.getExperienceAvailability(experienceId),
        experienceService.getExperienceReviews(experienceId)
      ]);

      // Process experience data
      if (experienceResult.status === 'fulfilled') {
        setExperience(transformApiExperience(experienceResult.value.data));
      }

      // Process itinerary data
      if (itineraryResult.status === 'fulfilled') {
        setItinerary(itineraryResult.value.data);
      }

      // Process weather data
      if (weatherResult.status === 'fulfilled') {
        setWeather(weatherResult.value.data);
      }

      // Process availability data
      if (availabilityResult.status === 'fulfilled') {
        setAvailability(availabilityResult.value.data);
      }

      // Process reviews data
      if (reviewsResult.status === 'fulfilled') {
        setReviews(reviewsResult.value.data.items || []);
      }

    } catch (err) {
      setError('Failed to load experience details. Please try again.');
      console.error('Error loading experience data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform API experience to detailed format
  const transformApiExperience = (apiExp: ApiExperience): ExperienceDetail => {
    return {
      ...apiExp,
      detailedDescription: apiExp.description,
      highlights: apiExp.inclusions?.slice(0, 4) || [],
      inclusions: apiExp.inclusions || [],
      exclusions: apiExp.exclusions || [],
      requirements: apiExp.requirements || [],
      cancellationPolicy: apiExp.cancellationPolicy || 'Standard cancellation policy applies',
      safety: ['Professional guide', 'Safety equipment provided', 'Emergency procedures'],
      whatToBring: ['Comfortable shoes', 'Water bottle', 'Camera'],
      meetingPoint: {
        address: apiExp.location?.street || 'Meeting point to be confirmed',
        coordinates: apiExp.coordinates || { latitude: 0, longitude: 0 },
        instructions: 'Look for the guide with a TouriQuest sign'
      },
      accessibility: apiExp.accessibility || [],
      languages: apiExp.languages || ['English'],
      hostInfo: {
        name: apiExp.guide?.name || 'Host',
        avatar: apiExp.guide?.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        verified: true,
        responseRate: 98,
        experience: `${apiExp.guide?.experience || 5}+ years experience`,
        bio: apiExp.guide?.bio || 'Experienced local guide',
        languages: apiExp.languages || ['English'],
        responseTime: 'Within 1 hour'
      }
    };
  };

  // Calculate total participants
  const totalParticipants = bookingData.participants.adults + bookingData.participants.children + bookingData.participants.seniors;

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!experience || !bookingData.date) return 0;
    
    const basePrice = experience.pricing?.basePrice || 0;
    const adultsPrice = basePrice * bookingData.participants.adults;
    const childrenPrice = basePrice * 0.8 * bookingData.participants.children; // 20% discount for children
    const seniorsPrice = basePrice * 0.9 * bookingData.participants.seniors; // 10% discount for seniors
    const subtotal = adultsPrice + childrenPrice + seniorsPrice;
    const serviceFee = subtotal * 0.1; // 10% service fee
    const taxes = subtotal * 0.05; // 5% taxes
    
    return subtotal + serviceFee + taxes;
  };

  // Handle booking submission
  const handleBookingSubmit = async () => {
    if (!experience || !bookingData.date || !bookingData.time) return;

    try {
      setIsLoading(true);
      
      const bookingRequest = {
        experienceId: experience.id,
        date: bookingData.date.toISOString().split('T')[0],
        timeSlot: bookingData.time,
        participants: bookingData.participants,
        specialRequests: bookingData.specialRequirements.other,
        dietaryRestrictions: bookingData.specialRequirements.dietary,
        accessibilityNeeds: bookingData.specialRequirements.accessibility,
        emergencyContact: {
          name: bookingData.contactInfo.name,
          phone: bookingData.contactInfo.phone,
          relationship: 'Self'
        },
        participantDetails: [{
          name: bookingData.contactInfo.name,
          age: 25,
          email: bookingData.contactInfo.email,
          phone: bookingData.contactInfo.phone
        }],
        paymentMethod: bookingData.paymentMethod
      };

      const result = await experienceService.bookExperience(experienceId, bookingRequest);
      
      if (result.success) {
        onBookingComplete?.(result.data.bookingId);
        setShowBookingForm(false);
        setBookingStep(1);
      }
    } catch (err) {
      setError('Failed to complete booking. Please try again.');
      console.error('Booking error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    try {
      if (isFavorite) {
        await experienceService.removeFromFavorites(experienceId);
      } else {
        await experienceService.addToFavorites(experienceId);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (reviewData: any) => {
    try {
      await experienceService.addExperienceReview(experienceId, reviewData);
      await loadExperienceData(); // Refresh reviews
      setShowReviewForm(false);
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  if (isLoading && !experience) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200" />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
              <div className="h-96 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error || 'Experience not found'}</p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-black">
        <ImageWithFallback
          src={experience.photos?.[selectedImageIndex]?.url || ''}
          alt={experience.name}
          className="w-full h-full object-cover opacity-80"
        />
        
        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="bg-white/90 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFavoriteToggle}
              className="bg-white/90 hover:bg-white"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image Gallery Navigation */}
        {experience.photos && experience.photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-2">
              {experience.photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Experience Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground">
                  {typeof experience.category === 'string' ? experience.category : experience.category.name}
                </Badge>
                <h1 className="text-3xl font-bold text-white mb-2">{experience.name}</h1>
                <div className="flex items-center space-x-4 text-white/90">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current text-yellow-400" />
                    <span>{experience.rating}</span>
                    <span>({experience.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{experience.location?.city}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{experience.duration.value} {experience.duration.unit}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  ${experience.pricing?.basePrice}
                </div>
                <div className="text-white/80 text-sm">per person</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs Navigation */}
            <div className="flex items-center space-x-6 border-b mb-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'itinerary', label: 'Itinerary' },
                { id: 'reviews', label: 'Reviews' },
                { id: 'host', label: 'Host' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Description */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">About this experience</h2>
                  <p className="text-gray-700 leading-relaxed">{experience.detailedDescription}</p>
                </div>

                {/* Highlights */}
                {experience.highlights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Highlights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {experience.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What's Included/Not Included */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-700">What's included</h3>
                    <div className="space-y-2">
                      {experience.inclusions.map((item, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-red-700">What's not included</h3>
                    <div className="space-y-2">
                      {experience.exclusions.map((item, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Minus className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                {experience.requirements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Requirements</h3>
                    <div className="space-y-2">
                      {experience.requirements.map((requirement, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{requirement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weather Widget */}
                {weather.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Weather Forecast</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {weather.slice(0, 7).map((day, index) => (
                        <Card key={index} className="p-3 text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                          <div className="mb-2">
                            {day.conditions === 'sunny' && <Sun className="w-6 h-6 text-yellow-500 mx-auto" />}
                            {day.conditions === 'rainy' && <CloudRain className="w-6 h-6 text-blue-500 mx-auto" />}
                            {day.conditions === 'cloudy' && <Wind className="w-6 h-6 text-gray-500 mx-auto" />}
                          </div>
                          <div className="text-sm font-medium">
                            {day.temperature.max}°/{day.temperature.min}°
                          </div>
                          <div className="text-xs text-gray-500">
                            {day.precipitation}%
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'itinerary' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Detailed Itinerary</h2>
                {itinerary.length > 0 ? (
                  <div className="space-y-4">
                    {itinerary.map((item, index) => (
                      <Card key={item.id} className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{item.time}</span>
                                <span>({item.duration} min)</span>
                              </div>
                            </div>
                            <p className="text-gray-700 mb-3">{item.description}</p>
                            
                            {item.location && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                                <MapPin className="w-4 h-4" />
                                <span>{item.location}</span>
                              </div>
                            )}

                            {item.activities.length > 0 && (
                              <div className="mb-3">
                                <h4 className="font-medium text-sm mb-2">Activities:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {item.activities.map((activity, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {activity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.tips.length > 0 && (
                              <div>
                                <button
                                  onClick={() => setExpandedItineraryItem(
                                    expandedItineraryItem === item.id ? null : item.id
                                  )}
                                  className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80"
                                >
                                  <span>Tips & Recommendations</span>
                                  <ChevronRight className={`w-4 h-4 transition-transform ${
                                    expandedItineraryItem === item.id ? 'rotate-90' : ''
                                  }`} />
                                </button>
                                
                                {expandedItineraryItem === item.id && (
                                  <div className="mt-2 pl-4 border-l-2 border-primary/20">
                                    {item.tips.map((tip, idx) => (
                                      <div key={idx} className="text-sm text-gray-600 mb-1">
                                        • {tip}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Detailed itinerary will be provided after booking.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Reviews</h2>
                  <Button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Write Review
                  </Button>
                </div>

                {/* Review Summary */}
                <Card className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {experience.rating}
                      </div>
                      <div className="flex items-center justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(experience.rating)
                                ? 'fill-current text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">
                        Based on {experience.reviewCount} reviews
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviews.filter(r => Math.floor(r.rating) === rating).length;
                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center space-x-2">
                            <span className="text-sm w-4">{rating}</span>
                            <Star className="w-4 h-4 fill-current text-yellow-400" />
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500 w-8">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="p-6">
                      <div className="flex items-start space-x-4">
                        <ImageWithFallback
                          src={review.userAvatar}
                          alt={review.userName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{review.userName}</h4>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < Math.floor(review.rating)
                                          ? 'fill-current text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {review.title && (
                            <h5 className="font-medium mb-2">{review.title}</h5>
                          )}
                          
                          <p className="text-gray-700 mb-3">{review.content}</p>
                          
                          {review.photos.length > 0 && (
                            <div className="flex space-x-2 mb-3">
                              {review.photos.slice(0, 3).map((photo, index) => (
                                <ImageWithFallback
                                  key={index}
                                  src={photo}
                                  alt={`Review photo ${index + 1}`}
                                  className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80"
                                />
                              ))}
                              {review.photos.length > 3 && (
                                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                                  +{review.photos.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                              <ThumbsUp className="w-4 h-4" />
                              <span>Helpful ({review.helpful})</span>
                            </button>
                            <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                              <Flag className="w-4 h-4" />
                              <span>Report</span>
                            </button>
                          </div>
                          
                          {review.response && (
                            <Card className="mt-4 p-4 bg-gray-50">
                              <div className="flex items-start space-x-3">
                                <ImageWithFallback
                                  src={experience.hostInfo.avatar}
                                  alt={experience.hostInfo.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-medium text-sm">{experience.hostInfo.name}</span>
                                    <Badge variant="outline" className="text-xs">Host</Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(review.response.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{review.response.content}</p>
                                </div>
                              </div>
                            </Card>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'host' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Meet your host</h2>
                
                <Card className="p-6">
                  <div className="flex items-start space-x-6">
                    <div className="text-center">
                      <ImageWithFallback
                        src={experience.hostInfo.avatar}
                        alt={experience.hostInfo.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                      />
                      <h3 className="font-semibold text-lg">{experience.hostInfo.name}</h3>
                      {experience.hostInfo.verified && (
                        <div className="flex items-center justify-center space-x-1 text-primary mt-1">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Verified Host</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-gray-700 mb-4">{experience.hostInfo.bio}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Experience</div>
                          <div className="font-medium">{experience.hostInfo.experience}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Response rate</div>
                          <div className="font-medium">{experience.hostInfo.responseRate}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Response time</div>
                          <div className="font-medium">{experience.hostInfo.responseTime}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Languages</div>
                          <div className="font-medium">{experience.hostInfo.languages.join(', ')}</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contact Host
                        </Button>
                        <Button variant="outline" size="sm">
                          <User className="w-4 h-4 mr-2" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ${experience.pricing?.basePrice}
                </div>
                <div className="text-gray-500">per person</div>
              </div>

              {!showBookingForm ? (
                <Button 
                  onClick={() => setShowBookingForm(true)}
                  className="w-full"
                  size="lg"
                >
                  {experience.isInstantBooking ? 'Book Now' : 'Request to Book'}
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Booking Step Indicator */}
                  <div className="flex items-center justify-between mb-6">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          bookingStep >= step 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step}
                        </div>
                        {step < 4 && (
                          <div className={`w-6 h-0.5 ${
                            bookingStep > step ? 'bg-primary' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1: Date & Time Selection */}
                  {bookingStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Select Date & Time</h3>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {bookingData.date ? bookingData.date.toDateString() : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={bookingData.date || undefined}
                              onSelect={(date) => setBookingData(prev => ({ ...prev, date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Time</label>
                        <Select 
                          value={bookingData.time} 
                          onValueChange={(time) => setBookingData(prev => ({ ...prev, time }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={() => setBookingStep(2)}
                        className="w-full"
                        disabled={!bookingData.date || !bookingData.time}
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Participants */}
                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Participants</h3>
                      
                      {[
                        { key: 'adults', label: 'Adults', desc: 'Age 13+' },
                        { key: 'children', label: 'Children', desc: 'Age 2-12' },
                        { key: 'seniors', label: 'Seniors', desc: 'Age 65+' }
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-sm text-gray-500">{desc}</div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBookingData(prev => ({
                                ...prev,
                                participants: {
                                  ...prev.participants,
                                  [key]: Math.max(0, prev.participants[key as keyof typeof prev.participants] - 1)
                                }
                              }))}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center">
                              {bookingData.participants[key as keyof typeof bookingData.participants]}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBookingData(prev => ({
                                ...prev,
                                participants: {
                                  ...prev.participants,
                                  [key]: prev.participants[key as keyof typeof prev.participants] + 1
                                }
                              }))}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => setBookingStep(1)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => setBookingStep(3)}
                          className="flex-1"
                          disabled={totalParticipants === 0}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Contact Info & Special Requirements */}
                  {bookingStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Contact Information</h3>
                      
                      <div className="space-y-3">
                        <Input
                          placeholder="Full Name"
                          value={bookingData.contactInfo.name}
                          onChange={(e) => setBookingData(prev => ({
                            ...prev,
                            contactInfo: { ...prev.contactInfo, name: e.target.value }
                          }))}
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={bookingData.contactInfo.email}
                          onChange={(e) => setBookingData(prev => ({
                            ...prev,
                            contactInfo: { ...prev.contactInfo, email: e.target.value }
                          }))}
                        />
                        <Input
                          placeholder="Phone Number"
                          value={bookingData.contactInfo.phone}
                          onChange={(e) => setBookingData(prev => ({
                            ...prev,
                            contactInfo: { ...prev.contactInfo, phone: e.target.value }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Special Requirements</label>
                        <Textarea
                          placeholder="Any dietary restrictions, accessibility needs, or other requirements..."
                          value={bookingData.specialRequirements.other}
                          onChange={(e) => setBookingData(prev => ({
                            ...prev,
                            specialRequirements: { ...prev.specialRequirements, other: e.target.value }
                          }))}
                          rows={3}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => setBookingStep(2)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => setBookingStep(4)}
                          className="flex-1"
                          disabled={!bookingData.contactInfo.name || !bookingData.contactInfo.email}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Payment & Confirmation */}
                  {bookingStep === 4 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Payment & Confirmation</h3>
                      
                      {/* Price Breakdown */}
                      <Card className="p-4 bg-gray-50">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>${experience.pricing?.basePrice} x {totalParticipants} people</span>
                            <span>${(experience.pricing?.basePrice || 0) * totalParticipants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service fee</span>
                            <span>${Math.round(calculateTotalPrice() * 0.1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxes</span>
                            <span>${Math.round(calculateTotalPrice() * 0.05)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Total</span>
                            <span>${Math.round(calculateTotalPrice())}</span>
                          </div>
                        </div>
                      </Card>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Payment Method</label>
                        <Select 
                          value={bookingData.paymentMethod} 
                          onValueChange={(method) => setBookingData(prev => ({ ...prev, paymentMethod: method }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Credit/Debit Card</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="apple-pay">Apple Pay</SelectItem>
                            <SelectItem value="google-pay">Google Pay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={bookingData.agreedToTerms}
                          onChange={(e) => setBookingData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                          className="mt-1"
                        />
                        <label htmlFor="terms" className="text-sm text-gray-600">
                          I agree to the booking terms and conditions, cancellation policy, and privacy policy.
                        </label>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => setBookingStep(3)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={handleBookingSubmit}
                          className="flex-1"
                          disabled={!bookingData.paymentMethod || !bookingData.agreedToTerms || isLoading}
                        >
                          {isLoading ? 'Processing...' : `Book Now - $${Math.round(calculateTotalPrice())}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Info */}
              <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Free cancellation up to 24 hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Verified host and experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Small group size (max {experience.groupSize.max})</span>
                </div>
              </div>

              {/* Contact & Share */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Write a Review</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReviewForm(false)}
                >
                  ×
                </Button>
              </div>
              
              {/* Review form content would go here */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Overall Rating</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} className="p-1">
                        <Star className="w-6 h-6 text-gray-300 hover:text-yellow-400" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Review Title</label>
                  <Input placeholder="Summarize your experience" />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Review</label>
                  <Textarea 
                    placeholder="Share your experience with others..."
                    rows={4}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowReviewForm(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1">
                    Submit Review
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
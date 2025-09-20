import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight,
  Star,
  Shield,
  Globe,
  Play,
  ChevronLeft,
  ChevronRight,
  Compass,
  Camera,
  Headphones,
  Bot,
  User,
  Hotel,
  Mountain,
  Heart,
  Clock,
  Quote,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react';

// Hero images with proper fallbacks
const heroImages = [
{
"url": "https://images.unsplash.com/photo-1558624085-c766e4a175ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXNzYW4gaWkgbW9zcXVlIGNhc2FibGFuY2F8ZW58MXx8fHwxNzU4Mjk5Njc1fDA&ixlib=rb-4.1.0&q=80&w=1080",
"title": "Grand Mosque Majesty",
"location": "Casablanca",
"fallback" : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", // Fixed width parameter
"subtitle": "Iconic mosque overlooking the Atlantic Ocean"
},
{
"url": "https://images.unsplash.com/photo-1578936188754-4d5a156a4e4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqZW1hYSBlbCBmbmEgbWFycmFrZWNofGVufDF8fHx8MTc1ODI5OTY3NXww&ixlib=rb-4.1.0&q=80&w=1080",
"title": "Vibrant Square Life",
"location": "Marrakech",
"fallback" : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", // Fixed width parameter
"subtitle": "Bustling heart of the medina with performers and markets"
},
{
"url": "https://images.unsplash.com/photo-1568515045051-3915a5e725d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVmY2hhb3Vlbnx8ZW58MXx8fHwxNzU4Mjk5Njc1fDA&ixlib=rb-4.1.0&q=80&w=1080",
"title": "Blue Pearl City",
"location": "Chefchaouen",
"fallback" : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", // Fixed width parameter
"subtitle": "Enchanting blue-washed streets in the Rif Mountains"
},
{
"url": "https://images.unsplash.com/photo-1542295669297-4d352cc0e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhaXQgYmVuIGhhZGRvdXx8ZW58MXx8fHwxNzU4Mjk5Njc1fDA&ixlib=rb-4.1.0&q=80&w=1080",
"title": "Ancient Kasbah",
"location": "Ait Ben Haddou",
"fallback" : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", // Fixed width parameter
"subtitle": "UNESCO-listed earthen clay architecture in the desert"
}
];

const appFeatures = [
  {
    icon: Hotel,
    title: "Smart Accommodations",
    description: "AI-powered hotel and stay recommendations tailored to your preferences and budget",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Book Now"
  },
  {
    icon: Compass,
    title: "POI Discovery",
    description: "Explore hidden gems and popular attractions with detailed information and reviews",
    image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Discover"
  },
  {
    icon: Headphones,
    title: "Audio Guides",
    description: "Immersive audio tours that bring destinations to life with local stories",
    image: "https://images.unsplash.com/photo-1583340862089-a0b14c665b3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Listen"
  },
  {
    icon: Camera,
    title: "AR Experiences",
    description: "Augmented reality features that enhance your exploration with interactive content",
    image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc696?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Experience"
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Your personal travel companion providing instant answers and recommendations",
    image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Ask AI"
  },
  {
    icon: User,
    title: "Profile & Itinerary",
    description: "Personalized travel planning with smart itinerary management and preferences",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    badge: "Plan"
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    location: "New York, USA",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100",
    rating: 5,
    text: "TouriQuest transformed my travel experience completely. The AI recommendations were spot-on and saved me hours of planning!",
    trip: "Bali Adventure"
  },
  {
    name: "Marco Rodriguez",
    location: "Barcelona, Spain",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100",
    rating: 5,
    text: "The audio guides brought each destination to life. I discovered hidden gems I would have never found otherwise.",
    trip: "Morocco Discovery"
  },
  {
    name: "Emily Chen",
    location: "Tokyo, Japan",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100",
    rating: 5,
    text: "Booking was seamless, and the AR experiences added magic to every location. This is the future of travel!",
    trip: "European Tour"
  },
  {
    name: "David Thompson",
    location: "London, UK",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100",
    rating: 5,
    text: "Sustainable travel options and carbon tracking helped me travel responsibly while having amazing experiences.",
    trip: "Swiss Alps Trek"
  }
];

const popularDestinations = [
  { 
    name: "Bali, Indonesia", 
    image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $89/night",
    rating: 4.8,
    experiences: "125+ experiences"
  },
  { 
    name: "Santorini, Greece", 
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $156/night",
    rating: 4.9,
    experiences: "89+ experiences"
  },
  { 
    name: "Kyoto, Japan", 
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $134/night",
    rating: 4.7,
    experiences: "156+ experiences"
  },
  { 
    name: "Iceland", 
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $198/night",
    rating: 4.8,
    experiences: "78+ experiences"
  },
  { 
    name: "Costa Rica", 
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $76/night",
    rating: 4.6,
    experiences: "203+ experiences"
  },
  { 
    name: "Morocco", 
    image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73a02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
    price: "From $112/night",
    rating: 4.7,
    experiences: "167+ experiences"
  }
];

// Simple Image component with fallback
const ImageWithFallback = ({ src, fallback, alt, className, onLoad, onError, ...props }: {
  src: string;
  fallback?: string;
  alt: string;
  className?: string;
  onLoad?: (e: any) => void;
  onError?: (e: any) => void;
  [key: string]: any;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e: any) => {
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e: any) => {
    if (!hasError && fallback && imgSrc !== fallback) {
      setHasError(true);
      setImgSrc(fallback);
    } else {
      setIsLoading(false);
      if (onError) onError(e);
    }
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
          <Mountain className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
};

export default function WelcomePage({ onGetStarted = () => {} }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [counters, setCounters] = useState({ travelers: 0, properties: 0, rating: 0 });
  const statsRef = useRef(null);

  // Auto-play hero carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
            entry.target.classList.add('opacity-100', 'translate-y-0');
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, []);

  // Counter animation for stats
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animateCounters();
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const targets = { travelers: 50, properties: 5, rating: 4.8 };
    const duration = 2000;
    const steps = 60;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCounters({
        travelers: Math.floor(targets.travelers * easeOut),
        properties: Math.floor(targets.properties * easeOut),
        rating: Number((targets.rating * easeOut).toFixed(1))
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounters(targets);
      }
    }, duration / steps);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Enhanced Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image Carousel - Simplified */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ zIndex: index === currentImageIndex ? 1 : 0 }}
            >
              <ImageWithFallback
                src={image.url}
                fallback={image.fallback}
                alt={image.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/60" />
            </div>
          ))}
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl px-4">
          <div className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-300">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Welcome to the Future of Travel
            </Badge>
          </div>
          
          <h1 className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-500 text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Your Complete
            <span className="block bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Travel Companion
            </span>
          </h1>
          
          <p className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-700 text-xl md:text-2xl mb-8 text-white/90 leading-relaxed max-w-4xl mx-auto">
            {heroImages[currentImageIndex].subtitle}
          </p>
          
          {/* Enhanced Search Bar */}
          <Card className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-900 p-6 bg-white/95 backdrop-blur-md max-w-4xl mx-auto mb-8 shadow-2xl rounded-2xl border-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Where to?</label>
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group">
                  <MapPin className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <input 
                    placeholder="Destination" 
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Check-in</label>
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group">
                  <Calendar className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <input 
                    placeholder="Add dates" 
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Guests</label>
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group">
                  <Users className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <input 
                    placeholder="Add guests" 
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <Button size="lg" className="h-full bg-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </Card>
          
          {/* Hero CTA Buttons */}
          <div className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-1100 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={onGetStarted} 
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-4 rounded-xl text-lg"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm hover:border-white/50 transition-all duration-300 px-8 py-4 rounded-xl text-lg" 
              onClick={onGetStarted}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          
          {/* Development Status Badge */}
          <div className="opacity-100 transform translate-y-0 transition-all duration-1000 delay-1300 mt-8">
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border border-orange-400/30 backdrop-blur-sm px-4 py-2">
              🚧 Demo Version - 8/16 Core Modules Complete
            </Badge>
          </div>
        </div>
        
        {/* Image Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white scale-125 shadow-lg' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Location Badge */}
        <div className="absolute top-8 right-8 z-10">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
            <MapPin className="w-4 h-4 mr-2" />
            {heroImages[currentImageIndex].location}
          </Badge>
        </div>
      </section>

      {/* Features Overview Carousel */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 text-center mb-16">
            <Badge className="mb-6 bg-blue-100 text-blue-700 px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              Platform Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Everything You Need for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
                Perfect Travel
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover our comprehensive suite of AI-powered tools designed to make every journey extraordinary
            </p>
          </div>
          
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 delay-300">
            <Carousel className="w-full">
              <CarouselContent className="-ml-4">
                {appFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="h-full overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50">
                      <div className="relative">
                        <ImageWithFallback
                          src={feature.image}
                          fallback="https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
                          alt={feature.title}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge className="absolute top-4 right-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                          {feature.badge}
                        </Badge>
                        <div className="absolute bottom-4 left-4">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <feature.icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-4">
                          {feature.description}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300"
                        >
                          Learn More
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Animated Statistics */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-teal-50" ref={statsRef}>
        <div className="container mx-auto text-center max-w-7xl">
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 mb-16">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">
              Trusted by Travelers Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Join thousands of satisfied travelers who have discovered the world with TouriQuest
            </p>
          </div>
          
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 delay-300 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {counters.travelers}K+
              </div>
              <div className="text-gray-600 text-lg">Happy Travelers</div>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Hotel className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-teal-600 mb-2">
                {counters.properties}K+
              </div>
              <div className="text-gray-600 text-lg">Properties Listed</div>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl font-bold text-orange-600 mb-2">
                {counters.rating}★
              </div>
              <div className="text-gray-600 text-lg">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 text-center mb-16">
            <Badge className="mb-6 bg-teal-100 text-teal-700 px-4 py-2">
              <Heart className="w-4 h-4 mr-2" />
              Customer Stories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              What Our Travelers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Real experiences from real travelers who've discovered the world with TouriQuest
            </p>
          </div>
          
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 delay-300">
            <Carousel className="w-full">
              <CarouselContent className="-ml-4">
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-4/5 lg:basis-3/5">
                    <Card className="p-8 border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 text-center h-full">
                      <Quote className="w-12 h-12 text-blue-200 mx-auto mb-6" />
                      <p className="text-lg text-gray-700 leading-relaxed mb-6 italic">
                        "{testimonial.text}"
                      </p>
                      <div className="flex justify-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <div className="flex items-center justify-center space-x-4">
                        <ImageWithFallback
                          src={testimonial.avatar}
                          fallback="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=100"
                          alt={testimonial.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{testimonial.name}</div>
                          <div className="text-sm text-gray-500">{testimonial.location}</div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {testimonial.trip}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 text-center mb-16">
            <Badge className="mb-6 bg-green-100 text-green-700 px-4 py-2">
              <Globe className="w-4 h-4 mr-2" />
              Top Destinations
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover the world's most loved places with verified reviews and experiences
            </p>
          </div>
          
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 delay-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {popularDestinations.map((destination, index) => (
                <Card key={`destination-${index}`} className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-2 bg-white">
                  <div className="relative">
                    <ImageWithFallback
                      src={destination.image}
                      fallback="https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
                      alt={destination.name}
                      className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <Badge className="absolute top-4 left-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {destination.rating}
                    </Badge>
                    <Badge className="absolute top-4 right-4 bg-blue-500/20 text-white border-blue-400/30 backdrop-blur-sm">
                      {destination.experiences}
                    </Badge>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-bold text-white text-xl mb-1">{destination.name}</h3>
                      <p className="text-white/90 text-lg">{destination.price}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white">
                      Explore Destination
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" className="px-8 py-3 hover:bg-blue-600 hover:text-white transition-all duration-300">
                View All Destinations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="container mx-auto text-center relative z-10 max-w-7xl">
          <div className="animate-on-scroll opacity-0 transform translate-y-8 transition-all duration-1000 max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Ready to Start?
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Your Next Adventure
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Awaits You
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed max-w-3xl mx-auto">
              Join thousands of travelers who have discovered the world with TouriQuest. Start your journey today and create memories that last a lifetime.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={onGetStarted} 
                className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 rounded-xl text-lg font-semibold"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm hover:border-white/50 transition-all duration-300 px-8 py-4 rounded-xl text-lg font-semibold" 
                onClick={onGetStarted}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-2 text-white/80">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-white/80">
                <Shield className="w-5 h-5 text-blue-300" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-white/80">
                <Clock className="w-5 h-5 text-yellow-300" />
                <span>Setup in 2 Minutes</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </section>
    </div>
  );
}
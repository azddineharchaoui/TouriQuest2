import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight,
  Star,
  Leaf,
  Shield,
  Globe
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const heroImages = [
  {
    url: "https://images.unsplash.com/photo-1743230405369-c29079014eac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwdmFjYXRpb24lMjBwYXJhZGlzZXxlbnwxfHx8fDE3NTgyOTk2NzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Tropical Paradise",
    location: "Maldives"
  },
  {
    url: "https://images.unsplash.com/photo-1609373066983-cee8662ea93f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGFkdmVudHVyZSUyMGhpa2luZyUyMHRyYXZlbHxlbnwxfHx8fDE3NTgyMjc4NzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Mountain Adventure",
    location: "Swiss Alps"
  },
  {
    url: "https://images.unsplash.com/photo-1636622407062-7b9ea2967a75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwY3VsdHVyZSUyMHRyYXZlbCUyMHVyYmFufGVufDF8fHx8MTc1ODMxMDMwM3ww&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Urban Culture",
    location: "Tokyo"
  }
];

const popularDestinations = [
  { name: "Bali, Indonesia", image: heroImages[0].url, price: "From $89/night" },
  { name: "Santorini, Greece", image: heroImages[1].url, price: "From $156/night" },
  { name: "Kyoto, Japan", image: heroImages[2].url, price: "From $134/night" },
  { name: "Iceland", image: heroImages[0].url, price: "From $198/night" },
  { name: "Costa Rica", image: heroImages[1].url, price: "From $76/night" },
  { name: "Morocco", image: heroImages[2].url, price: "From $112/night" }
];

export function WelcomePage({ onGetStarted }: { onGetStarted: () => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-off-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src={heroImages[currentImageIndex].url}
            alt={heroImages[currentImageIndex].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-navy/50" />
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl px-4">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Your Complete Travel Companion
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed max-w-3xl mx-auto">
            Discover, book, and experience the world like never before with sustainable travel at your fingertips
          </p>
          
          {/* Search Bar */}
          <Card className="p-6 bg-white/95 backdrop-blur-sm max-w-2xl mx-auto mb-8 shadow-xl rounded-lg border-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-navy">Where</label>
                <div className="flex items-center space-x-2 p-3 bg-off-white rounded-base border border-light-gray hover:border-primary-teal transition-colors">
                  <MapPin className="w-4 h-4 text-medium-gray" />
                  <input 
                    placeholder="Destination" 
                    className="flex-1 bg-transparent outline-none text-navy placeholder:text-medium-gray"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-navy">Check-in</label>
                <div className="flex items-center space-x-2 p-3 bg-off-white rounded-base border border-light-gray hover:border-primary-teal transition-colors">
                  <Calendar className="w-4 h-4 text-medium-gray" />
                  <input 
                    placeholder="Add dates" 
                    className="flex-1 bg-transparent outline-none text-navy placeholder:text-medium-gray"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-navy">Guests</label>
                <div className="flex items-center space-x-2 p-3 bg-off-white rounded-base border border-light-gray hover:border-primary-teal transition-colors">
                  <Users className="w-4 h-4 text-medium-gray" />
                  <input 
                    placeholder="Add guests" 
                    className="flex-1 bg-transparent outline-none text-navy placeholder:text-medium-gray"
                  />
                </div>
              </div>
              
              <Button size="lg" className="h-full bg-primary-teal hover:bg-primary-dark">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </Card>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onGetStarted} className="bg-primary-teal hover:bg-primary-dark">
              Start Your Journey
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm" 
              onClick={onGetStarted}
            >
              Already have an account? Sign in
            </Button>
          </div>
          
          {/* Development Status Badge */}
          <div className="mt-6">
            <Badge variant="secondary" className="bg-secondary-orange/20 text-secondary-orange border border-secondary-orange/30">
              🚧 Demo Version - 8/16 Core Modules Complete
            </Badge>
          </div>
        </div>
        
        {/* Image indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-navy">Why Choose TouriQuest?</h2>
            <p className="text-lg text-dark-gray max-w-2xl mx-auto leading-relaxed">
              Experience the future of travel with our comprehensive platform designed for modern explorers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center border-0 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary-tint rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-primary-teal" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-navy">Smart Discovery</h3>
              <p className="text-medium-gray leading-relaxed">
                AI-powered recommendations tailored to your preferences, budget, and travel style
              </p>
            </Card>
            
            <Card className="p-8 text-center border-0 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-secondary-tint rounded-full flex items-center justify-center mx-auto mb-6">
                <Leaf className="w-8 h-8 text-secondary-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-navy">Sustainable Travel</h3>
              <p className="text-medium-gray leading-relaxed">
                Make eco-conscious choices with our sustainability tracking and carbon offset programs
              </p>
            </Card>
            
            <Card className="p-8 text-center border-0 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-pale-gray rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-navy" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-navy">All-in-One Platform</h3>
              <p className="text-medium-gray leading-relaxed">
                Book stays, experiences, and plan itineraries all in one seamless platform
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20 px-4 bg-primary-tint">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-3 text-navy">Popular Destinations</h2>
              <p className="text-medium-gray text-lg">Discover the world's most loved places</p>
            </div>
            <Button variant="outline" className="text-primary-teal border-primary-teal hover:bg-primary-teal hover:text-white">
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDestinations.map((destination, index) => (
              <Card key={index} className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                <div className="relative">
                  <ImageWithFallback
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 left-3 bg-primary-teal text-white shadow-sm">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    4.8
                  </Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold mb-2 text-navy text-lg">{destination.name}</h3>
                  <p className="text-medium-gray">{destination.price}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-navy">Join 50K+ Happy Travelers</h2>
          <p className="text-lg text-dark-gray mb-12 leading-relaxed max-w-xl mx-auto">
            Trusted by explorers worldwide for unforgettable experiences
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="space-y-3">
              <div className="text-5xl font-bold text-primary-teal">50K+</div>
              <div className="text-medium-gray text-lg">Active Travelers</div>
            </div>
            <div className="space-y-3">
              <div className="text-5xl font-bold text-secondary-orange">5K+</div>
              <div className="text-medium-gray text-lg">Properties Listed</div>
            </div>
          </div>
          
          <Button size="lg" onClick={onGetStarted} className="bg-primary-teal hover:bg-primary-dark shadow-md">
            Start Your Journey Today
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Star,
  Heart,
  TrendingUp,
  Award,
  Shield,
  CheckCircle,
  ArrowRight,
  Leaf,
  Clock,
  Globe,
  Filter,
  Sparkles
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const popularDestinations = [
  { 
    name: 'Bali, Indonesia', 
    image: 'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $89/night',
    rating: 4.8,
    properties: 1240
  },
  { 
    name: 'Santorini, Greece', 
    image: 'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $156/night',
    rating: 4.9,
    properties: 856
  },
  { 
    name: 'Tokyo, Japan', 
    image: 'https://images.unsplash.com/photo-1698910746353-65dadc2c2dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMGNpdHlzY2FwZXxlbnwxfHx8fDE3NTgzMTA4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $134/night',
    rating: 4.7,
    properties: 2100
  },
  { 
    name: 'Swiss Alps', 
    image: 'https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $198/night',
    rating: 4.9,
    properties: 445
  },
  { 
    name: 'Costa Rica', 
    image: 'https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $76/night',
    rating: 4.8,
    properties: 892
  },
  { 
    name: 'Morocco', 
    image: 'https://images.unsplash.com/photo-1682221568203-16f33b35e57d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhib3V0aXF1ZSUyMGhvdGVsJTIwbG9iYnl8ZW58MXx8fHwxNzU4Mjc3NTM5fDA&ixlib=rb-4.1.0&q=80&w=1080', 
    price: 'From $112/night',
    rating: 4.6,
    properties: 567
  }
];

const trendingDestinations = [
  { 
    name: 'Tulum, Mexico', 
    image: 'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: 'From $145/night',
    trending: '+45% bookings'
  },
  { 
    name: 'Reykjavik, Iceland', 
    image: 'https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: 'From $189/night',
    trending: '+32% bookings'
  },
  { 
    name: 'Cape Town, South Africa', 
    image: 'https://images.unsplash.com/photo-1698910746353-65dadc2c2dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMGNpdHlzY2FwZXxlbnwxfHx8fDE3NTgzMTA4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    price: 'From $98/night',
    trending: '+28% bookings'
  }
];

const uniqueStays = [
  {
    title: 'Glass Igloo Northern Lights',
    location: 'Finnish Lapland',
    image: 'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$320/night',
    rating: 4.9
  },
  {
    title: 'Underwater Hotel Suite',
    location: 'Maldives',
    image: 'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$890/night',
    rating: 4.8
  },
  {
    title: 'Castle in the Clouds',
    location: 'Scottish Highlands',
    image: 'https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$450/night',
    rating: 4.7
  }
];

interface PropertySearchLandingProps {
  onSearch: () => void;
}

export function PropertySearchLanding({ onSearch }: PropertySearchLandingProps) {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');
  const [quickFilters, setQuickFilters] = useState({
    ecoFriendly: false,
    instantBook: false,
    petFriendly: false
  });
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const destinationSuggestions = [
    'Bali, Indonesia',
    'Barcelona, Spain', 
    'Bangkok, Thailand',
    'Boston, USA',
    'Buenos Aires, Argentina'
  ];

  const filteredSuggestions = destinationSuggestions.filter(dest =>
    dest.toLowerCase().includes(destination.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* Hero Search Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-2xl p-8 md:p-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find your perfect stay
            </h1>
            <p className="text-xl text-muted-foreground">
              Search through millions of accommodations worldwide
            </p>
          </div>

          {/* Enhanced Search Bar */}
          <Card className="p-6 shadow-xl bg-white/95 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Where</Label>
                <div className="relative">
                  <div className="flex items-center space-x-2 p-3 bg-input-background rounded-lg border">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search destinations" 
                      className="border-0 bg-transparent p-0 focus-visible:ring-0"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestinationSuggestions(true);
                      }}
                      onFocus={() => setShowDestinationSuggestions(true)}
                    />
                  </div>
                  {showDestinationSuggestions && destination && filteredSuggestions.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 z-10 mt-1 p-2 shadow-lg">
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="w-full text-left p-2 hover:bg-muted rounded text-sm"
                          onClick={() => {
                            setDestination(suggestion);
                            setShowDestinationSuggestions(false);
                          }}
                        >
                          <MapPin className="w-3 h-3 inline mr-2" />
                          {suggestion}
                        </button>
                      ))}
                    </Card>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Check-in</Label>
                <div className="flex items-center space-x-2 p-3 bg-input-background rounded-lg border">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Check-out</Label>
                <div className="flex items-center space-x-2 p-3 bg-input-background rounded-lg border">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Guests</Label>
                <div className="flex items-center space-x-2 p-3 bg-input-background rounded-lg border">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <select 
                    className="border-0 bg-transparent outline-none flex-1"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  >
                    <option value="">Add guests</option>
                    <option value="1">1 guest</option>
                    <option value="2">2 guests</option>
                    <option value="3">3 guests</option>
                    <option value="4">4 guests</option>
                    <option value="5+">5+ guests</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setQuickFilters({...quickFilters, ecoFriendly: !quickFilters.ecoFriendly})}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full border text-sm transition-colors ${
                  quickFilters.ecoFriendly ? 'bg-success text-success-foreground' : 'bg-background hover:bg-muted'
                }`}
              >
                <Leaf className="w-3 h-3" />
                <span>Eco-friendly only</span>
              </button>
              
              <button
                onClick={() => setQuickFilters({...quickFilters, instantBook: !quickFilters.instantBook})}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full border text-sm transition-colors ${
                  quickFilters.instantBook ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Instant book</span>
              </button>
              
              <button
                onClick={() => setQuickFilters({...quickFilters, petFriendly: !quickFilters.petFriendly})}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full border text-sm transition-colors ${
                  quickFilters.petFriendly ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted'
                }`}
              >
                <Heart className="w-3 h-3" />
                <span>Pet-friendly</span>
              </button>
            </div>

            <Button 
              size="lg" 
              className="w-full md:w-auto px-8"
              onClick={onSearch}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </Card>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Popular destinations</h2>
            <p className="text-muted-foreground">Most loved places to stay</p>
          </div>
          <Button variant="outline">
            Explore all destinations
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularDestinations.map((destination, index) => (
            <Card key={index} className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300">
              <div className="relative">
                <ImageWithFallback
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute top-3 right-3">
                  <Badge className="bg-white text-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current text-yellow-400" />
                    {destination.rating}
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-black">
                  <h3 className="text-xl font-semibold mb-2">{destination.name}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{destination.price}</div>
                      <div className="text-sm text-black/80">{destination.properties} properties</div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Explore
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Trending This Week */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold">Trending this week</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trendingDestinations.map((destination, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <ImageWithFallback
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-40 object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Hot
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">{destination.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{destination.price}</span>
                  <Badge variant="outline" className="text-success border-success">
                    {destination.trending}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Unique Stays */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-secondary" />
          <h2 className="text-3xl font-bold">Unique stays</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {uniqueStays.map((stay, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <ImageWithFallback
                  src={stay.image}
                  alt={stay.title}
                  className="w-full h-48 object-cover"
                />
                <Badge className="absolute top-3 right-3 bg-white text-foreground">
                  <Star className="w-3 h-3 mr-1 fill-current text-yellow-400" />
                  {stay.rating}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1">{stay.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{stay.location}</p>
                <div className="text-lg font-semibold">{stay.price}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Eco-Certified Properties */}
      <section className="bg-success/5 rounded-2xl p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Leaf className="w-6 h-6 text-success" />
          <h2 className="text-3xl font-bold">Eco-certified properties</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Stay at properties committed to sustainable tourism and environmental responsibility.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Carbon-neutral accommodations</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Renewable energy powered</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Local community supported</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Waste reduction programs</span>
              </div>
            </div>
            <Button className="bg-success hover:bg-success/90">
              <Leaf className="w-4 h-4 mr-2" />
              Browse eco-friendly stays
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Eco accommodation"
              className="w-full h-32 object-cover rounded-lg"
            />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Sustainable travel"
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* Trust & Social Proof */}
      <section className="text-center space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-4">Join 50K+ happy travelers</h2>
          <p className="text-lg text-muted-foreground">
            Trusted by explorers from worldwide for safe, reliable, and memorable stays
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">50K+</div>
            <div className="text-muted-foreground">Happy Travelers</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-secondary">5K+</div>
            <div className="text-muted-foreground">Properties Listed</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-success">4.8★</div>
            <div className="text-muted-foreground">Average Rating</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 pt-8">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-sm">SSL Secure</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Award className="w-4 h-4" />
            <span className="text-sm">Best Price Guarantee</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">24/7 Support</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Global Coverage</span>
          </div>
        </div>
      </section>
    </div>
  );
}
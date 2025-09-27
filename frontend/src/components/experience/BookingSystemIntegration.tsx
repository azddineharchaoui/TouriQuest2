import React, { useState } from 'react';
import { ExperienceDetailPage } from './ExperienceDetailPage';
import { Button } from '../ui/button';
import { ArrowLeft, CheckCircle, Search, Star, MapPin } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

interface BookingSystemIntegrationProps {
  initialView?: 'browse' | 'detail';
  experienceId?: string;
}

// Simple browse component with sample experiences
function SimpleBrowseComponent({ onExperienceSelect }: { onExperienceSelect: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const sampleExperiences = [
    {
      id: '1',
      name: 'Mountain Hiking Adventure',
      description: 'Explore scenic mountain trails with experienced guides',
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
      price: 85,
      rating: 4.8,
      reviewCount: 127,
      location: 'Rocky Mountains',
      duration: '6 hours',
      category: 'Adventure'
    },
    {
      id: '2',
      name: 'Local Food Walking Tour',
      description: 'Discover authentic local cuisine and hidden culinary gems',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      price: 65,
      rating: 4.9,
      reviewCount: 89,
      location: 'Downtown',
      duration: '3 hours',
      category: 'Food & Drink'
    },
    {
      id: '3',
      name: 'Cultural Heritage Tour',
      description: 'Learn about local history and cultural traditions',
      image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73d0e?w=400&h=300&fit=crop',
      price: 45,
      rating: 4.7,
      reviewCount: 203,
      location: 'Historic District',
      duration: '4 hours',
      category: 'Culture'
    },
    {
      id: '4',
      name: 'Photography Workshop',
      description: 'Master photography techniques with stunning backdrops',
      image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
      price: 120,
      rating: 4.6,
      reviewCount: 56,
      location: 'Various Locations',
      duration: '5 hours',
      category: 'Art & Crafts'
    }
  ];

  const filteredExperiences = sampleExperiences.filter(exp =>
    exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search experiences..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Experience Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredExperiences.map((experience) => (
          <Card 
            key={experience.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onExperienceSelect(experience.id)}
          >
            <div className="relative h-48 bg-gray-200">
              <img
                src={experience.image}
                alt={experience.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGZpbGw9IiM5Q0EzQUYiIGQ9Ik0yMDAgMTUwbC01MCA1MGgtMTAwbDUwLTUwLTUwLTUwaDEwMGw1MCA1MHoiLz4KPHN2Zz4K';
                }}
              />
              <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-sm font-semibold">
                ${experience.price}
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{experience.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mt-1">{experience.description}</p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{experience.location}</span>
                </div>
                <span>{experience.duration}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-current text-yellow-400" />
                  <span className="text-sm font-medium">{experience.rating}</span>
                  <span className="text-sm text-gray-500">({experience.reviewCount})</span>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {experience.category}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredExperiences.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No experiences found</h3>
          <p className="text-gray-600">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
}

export function BookingSystemIntegration({ 
  initialView = 'browse', 
  experienceId 
}: BookingSystemIntegrationProps) {
  const [currentView, setCurrentView] = useState<'browse' | 'detail' | 'confirmation'>(initialView);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(experienceId || null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const handleExperienceSelect = (id: string) => {
    setSelectedExperienceId(id);
    setCurrentView('detail');
  };

  const handleBackToBrowse = () => {
    setCurrentView('browse');
    setSelectedExperienceId(null);
  };

  const handleBookingComplete = (newBookingId: string) => {
    setBookingId(newBookingId);
    setCurrentView('confirmation');
  };

  const handleBackToDetail = () => {
    setCurrentView('detail');
  };

  const handleNewSearch = () => {
    setCurrentView('browse');
    setSelectedExperienceId(null);
    setBookingId(null);
  };

  if (currentView === 'browse') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Discover Amazing Experiences
            </h1>
            <p className="text-lg text-gray-600">
              Find and book unique local experiences, tours, and activities
            </p>
          </div>
          
          <SimpleBrowseComponent onExperienceSelect={handleExperienceSelect} />
        </div>
      </div>
    );
  }

  if (currentView === 'detail' && selectedExperienceId) {
    return (
      <ExperienceDetailPage
        experienceId={selectedExperienceId}
        onBack={handleBackToBrowse}
        onBookingComplete={handleBookingComplete}
      />
    );
  }

  if (currentView === 'confirmation' && bookingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Booking Confirmed!
              </h1>
              <p className="text-lg text-gray-600">
                Your experience has been successfully booked
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="text-sm text-gray-500 mb-1">Booking ID</div>
              <div className="text-xl font-mono font-semibold text-gray-900">
                {bookingId}
              </div>
            </div>

            <div className="space-y-4 text-left mb-8">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Confirmation email sent</div>
                  <div className="text-sm text-gray-600">
                    Check your inbox for booking details and meeting instructions
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Payment processed</div>
                  <div className="text-sm text-gray-600">
                    Your payment has been securely processed
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Host notified</div>
                  <div className="text-sm text-gray-600">
                    Your host has been informed about your booking
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBackToDetail} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Experience
                </Button>
                <Button onClick={handleNewSearch}>
                  Book Another Experience
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t text-sm text-gray-500">
              <p>
                Need help? Contact our support team at{' '}
                <a href="mailto:support@touriquest.com" className="text-primary hover:underline">
                  support@touriquest.com
                </a>{' '}
                or call{' '}
                <a href="tel:+1-555-0123" className="text-primary hover:underline">
                  +1 (555) 012-3456
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback view
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">Please try refreshing the page</p>
        <Button onClick={handleNewSearch}>
          Go to Browse
        </Button>
      </div>
    </div>
  );
}
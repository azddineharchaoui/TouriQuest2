import React, { useState } from 'react';
import { Globe, MapPin, Plane, Compass, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface TravelStatsProps {
  userStats: {
    countriesVisited: number;
    citiesExplored: number;
    tripsCompleted: number;
    milesTravel: number;
    ecoScore: number;
    followers: number;
    following: number;
    posts: number;
  };
}

const mockTravelData = {
  visitedCountries: [
    { name: 'Japan', code: 'JP', visits: 3, lastVisit: '2024', color: '#FF6B6B' },
    { name: 'France', code: 'FR', visits: 2, lastVisit: '2024', color: '#4ECDC4' },
    { name: 'Thailand', code: 'TH', visits: 4, lastVisit: '2023', color: '#45B7D1' },
    { name: 'Italy', code: 'IT', visits: 2, lastVisit: '2023', color: '#96CEB4' },
    { name: 'Spain', code: 'ES', visits: 1, lastVisit: '2024', color: '#FFEAA7' },
    { name: 'UK', code: 'GB', visits: 1, lastVisit: '2023', color: '#DDA0DD' }
  ],
  travelTimeline: [
    { year: '2024', trips: 6, countries: 4, highlights: ['Japan Cherry Blossom', 'Spanish Coast'] },
    { year: '2023', trips: 8, countries: 7, highlights: ['Thai Islands', 'Italian Lakes', 'London Museums'] },
    { year: '2022', trips: 4, countries: 3, highlights: ['French Countryside', 'Tokyo Streets'] }
  ],
  favoriteDestinations: [
    { name: 'Kyoto, Japan', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=200&h=120&fit=crop', visits: 3 },
    { name: 'Santorini, Greece', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=200&h=120&fit=crop', visits: 2 },
    { name: 'Bali, Indonesia', image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=200&h=120&fit=crop', visits: 2 },
    { name: 'Reykjavik, Iceland', image: 'https://images.unsplash.com/photo-1539066017170-e3cf90031dd4?w=200&h=120&fit=crop', visits: 1 }
  ],
  travelStyle: {
    adventure: 85,
    culture: 92,
    relaxation: 70,
    foodie: 88,
    budget: 65,
    luxury: 45
  }
};

export function TravelStats({ userStats }: TravelStatsProps) {
  const [selectedView, setSelectedView] = useState<'map' | 'timeline' | 'destinations'>('map');

  return (
    <div className="space-y-6">
      {/* Overall Travel Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-medium">{userStats.countriesVisited}</div>
            <div className="text-sm text-muted-foreground">Countries Visited</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-medium">{userStats.citiesExplored}</div>
            <div className="text-sm text-muted-foreground">Cities Explored</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Plane className="h-8 w-8 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-medium">{userStats.milesTravel.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Miles Traveled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Compass className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <div className="text-2xl font-medium">{userStats.ecoScore}%</div>
            <div className="text-sm text-muted-foreground">Eco Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Travel Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <span>Travel Map & Timeline</span>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setSelectedView('map')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedView === 'map' ? 'bg-primary text-black' : 'bg-muted'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setSelectedView('timeline')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedView === 'timeline' ? 'bg-primary text-black' : 'bg-muted'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setSelectedView('destinations')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedView === 'destinations' ? 'bg-primary text-black' : 'bg-muted'
                }`}
              >
                Favorites
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedView === 'map' && (
            <div className="space-y-4">
              <div 
                className="h-64 bg-cover bg-center rounded-lg relative"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1530230624258-4055a187ef65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB3b3JsZCUyMG1hcCUyMHBpbnMlMjB2aXNpdGVkJTIwY291bnRyaWVzfGVufDF8fHx8MTc1ODMxMjM2M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral)' }}
              >
                <div className="absolute inset-0 bg-black/20 rounded-lg" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-black text-center">
                    <Globe className="h-12 w-12 mx-auto mb-2" />
                    <p>Interactive World Map</p>
                    <p className="text-sm opacity-80">Tap countries to see your travel history</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {mockTravelData.visitedCountries.map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{country.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {country.visits} visit{country.visits > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Badge variant="outline">{country.lastVisit}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedView === 'timeline' && (
            <div className="space-y-4">
              {mockTravelData.travelTimeline.map((year) => (
                <div key={year.year} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-lg font-medium">{year.year}</div>
                    <Badge variant="secondary">{year.trips} trips</Badge>
                    <Badge variant="outline">{year.countries} countries</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {year.highlights.map((highlight, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedView === 'destinations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockTravelData.favoriteDestinations.map((destination) => (
                <div key={destination.name} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <ImageWithFallback
                    src={destination.image}
                    alt={destination.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{destination.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Visited {destination.visits} time{destination.visits > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Style Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Travel Style</span>
          </CardTitle>
          <CardDescription>Your travel preferences based on activities and choices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(mockTravelData.travelStyle).map(([style, percentage]) => (
            <div key={style} className="space-y-2">
              <div className="flex justify-between">
                <span className="capitalize">{style}</span>
                <span className="text-sm text-muted-foreground">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Heart, 
  Bookmark, 
  Share2, 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Filter, 
  Sparkles,
  Eye,
  Clock,
  Award,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AIRecommendationsProps {
  onClose: () => void;
}

const mockRecommendations = {
  personalized: [
    {
      id: '1',
      type: 'hotel',
      title: 'Boutique Hotel in Montmartre',
      subtitle: 'Perfect for culture enthusiasts',
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&h=200&fit=crop',
      score: 94,
      price: 189,
      rating: 4.8,
      reasons: ['Matches your love for art districts', 'Similar to hotels you\'ve liked', 'Great for photography'],
      features: ['Historic charm', 'Rooftop terrace', 'Art gallery nearby'],
      distance: '0.5 km from Sacré-Cœur'
    },
    {
      id: '2',
      type: 'experience',
      title: 'Private Cooking Class with Chef Marie',
      subtitle: 'Authentic French cuisine experience',
      image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop',
      score: 91,
      price: 125,
      rating: 4.9,
      reasons: ['Based on your food interests', 'Highly rated by similar travelers', 'Small group experience'],
      features: ['Market visit included', 'Recipe cards', '3-course meal'],
      distance: 'Le Marais district'
    }
  ],
  trending: [
    {
      id: '3',
      type: 'poi',
      title: 'Hidden Speakeasy Bar',
      subtitle: 'Secret cocktail experience',
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&h=200&fit=crop',
      score: 89,
      trendScore: 95,
      rating: 4.7,
      reasons: ['Trending among young travelers', 'Unique atmosphere', 'Instagram-worthy'],
      features: ['Hidden entrance', 'Craft cocktails', 'Jazz music'],
      popularity: 'Visited by 89% more travelers this month'
    }
  ],
  friends: [
    {
      id: '4',
      type: 'restaurant',
      title: 'L\'Ami Jean Bistro',
      subtitle: 'Recommended by Sarah and 3 friends',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&h=200&fit=crop',
      score: 87,
      price: 45,
      rating: 4.6,
      reasons: ['Loved by your travel circle', 'Great for groups', 'Traditional French cuisine'],
      features: ['Local favorite', 'Wine pairing', 'Cozy atmosphere'],
      friendsWhoLiked: ['Sarah Chen', 'Alex Thompson', 'Maria Santos']
    }
  ]
};

const userPreferences = {
  interests: [
    { name: 'Culture & Art', score: 95, color: 'bg-purple-500' },
    { name: 'Food & Dining', score: 88, color: 'bg-orange-500' },
    { name: 'Photography', score: 82, color: 'bg-blue-500' },
    { name: 'Adventure', score: 75, color: 'bg-green-500' },
    { name: 'Nightlife', score: 65, color: 'bg-pink-500' },
    { name: 'Shopping', score: 45, color: 'bg-yellow-500' }
  ],
  budget: { min: 50, max: 300, preferred: 150 },
  travelStyle: 'Cultural Explorer'
};

export function AIRecommendations({ onClose }: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState('personalized');
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());

  const handleLike = (id: string) => {
    setLikedItems(prev => new Set(prev).add(id));
    setDislikedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleDislike = (id: string) => {
    setDislikedItems(prev => new Set(prev).add(id));
    setLikedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const RecommendationCard = ({ item, showTrending = false }: { item: any; showTrending?: boolean }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <ImageWithFallback
          src={item.image}
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 left-2 flex space-x-2">
          <Badge className="bg-primary text-black">
            <Sparkles className="h-3 w-3 mr-1" />
            {item.score}% match
          </Badge>
          {showTrending && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="sm" className="bg-white/80 hover:bg-white">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{item.title}</h4>
            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
          </div>
          
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{item.rating}</span>
            </div>
            {item.price && (
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>€{item.price}</span>
              </div>
            )}
            {item.distance && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{item.distance}</span>
              </div>
            )}
          </div>
          
          {item.reasons && (
            <div>
              <p className="text-sm font-medium mb-2">Why recommended:</p>
              <div className="space-y-1">
                {item.reasons.slice(0, 2).map((reason: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {item.features && (
            <div className="flex flex-wrap gap-1">
              {item.features.slice(0, 3).map((feature: string) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          )}
          
          {item.friendsWhoLiked && (
            <div className="text-xs text-muted-foreground">
              Loved by {item.friendsWhoLiked.join(', ')}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={likedItems.has(item.id) ? "default" : "outline"}
                onClick={() => handleLike(item.id)}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                {likedItems.has(item.id) ? 'Liked' : 'Like'}
              </Button>
              <Button
                size="sm"
                variant={dislikedItems.has(item.id) ? "destructive" : "outline"}
                onClick={() => handleDislike(item.id)}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex space-x-1">
              <Button size="sm" variant="outline">
                <Share2 className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline">
                <Bookmark className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium">AI Recommendations</h2>
              <p className="text-sm text-muted-foreground">Personalized suggestions just for you</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar - Preferences */}
          <div className="w-80 border-r p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Travel Style */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span>Your Travel Style</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-medium">{userPreferences.travelStyle}</h4>
                    <p className="text-sm text-muted-foreground">Based on your travel history</p>
                  </div>
                </CardContent>
              </Card>

              {/* Interest Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Interest Profile</CardTitle>
                  <CardDescription>How we personalize for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userPreferences.interests.map((interest) => (
                    <div key={interest.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{interest.name}</span>
                        <span>{interest.score}%</span>
                      </div>
                      <Progress value={interest.score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Budget Preferences */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Budget Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Preferred</span>
                      <span>€{userPreferences.budget.preferred}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>€{userPreferences.budget.min}</span>
                      <span>€{userPreferences.budget.max}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">This Week</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recommendations</span>
                    <Badge>24 new</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy</span>
                    <span className="text-sm font-medium">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bookings made</span>
                    <span className="text-sm font-medium">3</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="personalized">For You</TabsTrigger>
                    <TabsTrigger value="trending">Trending</TabsTrigger>
                    <TabsTrigger value="friends">Friends Love</TabsTrigger>
                  </TabsList>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                <TabsContent value="personalized" className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Perfect Matches</h3>
                      <Badge variant="secondary">94% accuracy</Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {mockRecommendations.personalized.map((item) => (
                        <RecommendationCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="trending" className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      <h3 className="text-lg font-medium">What's Hot Now</h3>
                      <Badge variant="secondary">Updated hourly</Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {mockRecommendations.trending.map((item) => (
                        <RecommendationCard key={item.id} item={item} showTrending />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="friends" className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Users className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-medium">Friend Favorites</h3>
                      <Badge variant="secondary">Social picks</Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {mockRecommendations.friends.map((item) => (
                        <RecommendationCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Feedback Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-base">Help Us Improve</CardTitle>
                  <CardDescription>Your feedback makes our recommendations better</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm">
                      Not interested in nightlife
                    </Button>
                    <Button variant="outline" size="sm">
                      Show more budget options
                    </Button>
                    <Button variant="outline" size="sm">
                      Prefer local experiences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
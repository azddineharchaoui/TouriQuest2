import React, { useState } from 'react';
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Star, 
  MapPin, 
  Calendar,
  Grid3X3,
  List,
  Play,
  Eye,
  Plus,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ContentShowcaseProps {
  userId: string;
  isOwnProfile: boolean;
}

const mockPosts = [
  {
    id: '1',
    type: 'photo',
    content: 'Amazing sunrise at Mount Fuji! The hike was challenging but totally worth it 🗻',
    images: [
      'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop'
    ],
    location: 'Mount Fuji, Japan',
    timestamp: '2 hours ago',
    likes: 124,
    comments: 18,
    shares: 12,
    isLiked: false,
    isSaved: true
  },
  {
    id: '2',
    type: 'video',
    content: 'Street food adventure in Bangkok! These pad thai noodles were incredible 🍜',
    thumbnail: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop',
    duration: '2:34',
    location: 'Bangkok, Thailand',
    timestamp: '1 day ago',
    likes: 89,
    comments: 23,
    shares: 8,
    isLiked: true,
    isSaved: false
  },
  {
    id: '3',
    type: 'checkin',
    content: 'Just checked into this amazing eco-lodge! Sustainable travel at its finest 🌿',
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop'],
    location: 'Tulum, Mexico',
    timestamp: '3 days ago',
    likes: 156,
    comments: 31,
    shares: 19,
    isLiked: true,
    isSaved: true,
    propertyName: 'Harmony Jungle Lodge'
  }
];

const mockReviews = [
  {
    id: '1',
    type: 'property',
    title: 'Incredible waterfront villa with stunning views',
    rating: 5,
    content: 'This place exceeded all expectations. The sunset views from the terrace were breathtaking...',
    propertyName: 'Villa Serenity',
    location: 'Santorini, Greece',
    images: ['https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=300&h=200&fit=crop'],
    date: '1 week ago',
    likes: 45,
    helpful: 23
  },
  {
    id: '2',
    type: 'experience',
    title: 'Amazing cultural cooking class experience',
    rating: 5,
    content: 'Learned so much about traditional Japanese cuisine. The chef was incredibly knowledgeable...',
    experienceName: 'Tokyo Cooking Masterclass',
    location: 'Tokyo, Japan',
    images: ['https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop'],
    date: '2 weeks ago',
    likes: 38,
    helpful: 19
  }
];

const mockSavedPlaces = [
  {
    id: '1',
    name: 'Blue Lagoon',
    location: 'Reykjavik, Iceland',
    type: 'POI',
    image: 'https://images.unsplash.com/photo-1539066017170-e3cf90031dd4?w=300&h=200&fit=crop',
    savedDate: '1 week ago'
  },
  {
    id: '2',
    name: 'Machu Picchu Trek',
    location: 'Cusco, Peru',
    type: 'Experience',
    image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=300&h=200&fit=crop',
    savedDate: '2 weeks ago'
  },
  {
    id: '3',
    name: 'Treehouse Lodge',
    location: 'Costa Rica',
    type: 'Property',
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c927?w=300&h=200&fit=crop',
    savedDate: '1 month ago'
  }
];

export function ContentShowcase({ userId, isOwnProfile }: ContentShowcaseProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('posts');

  const PostCard = ({ post }: { post: any }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Post Images/Video */}
        <div className="relative">
          {post.type === 'video' ? (
            <div className="relative aspect-square">
              <ImageWithFallback
                src={post.thumbnail}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Play className="h-12 w-12 text-black" fill="white" />
              </div>
              <Badge className="absolute top-2 right-2 bg-black/70 text-black">
                {post.duration}
              </Badge>
            </div>
          ) : (
            <div className="aspect-square">
              <ImageWithFallback
                src={post.images[0]}
                alt="Post image"
                className="w-full h-full object-cover"
              />
              {post.images.length > 1 && (
                <Badge className="absolute top-2 right-2 bg-black/70 text-black">
                  +{post.images.length - 1}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                className={post.isLiked ? 'text-red-500' : ''}
              >
                <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
                {post.likes}
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4 mr-1" />
                {post.comments}
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className={post.isSaved ? 'text-primary' : ''}
            >
              <Bookmark className={`h-4 w-4 ${post.isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>

          <p className="text-sm">{post.content}</p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>{post.location}</span>
            </div>
            <span>{post.timestamp}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ReviewCard = ({ review }: { review: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <ImageWithFallback
            src={review.images[0]}
            alt={review.title}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium">{review.title}</h4>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span>•</span>
                <span>{review.date}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span>{review.likes}</span>
              </span>
              <span>{review.helpful} found helpful</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Content Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isOwnProfile && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-4'
          }`}>
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="space-y-4">
            {mockReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockSavedPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-0">
                  <ImageWithFallback
                    src={place.image}
                    alt={place.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{place.name}</h4>
                        <p className="text-sm text-muted-foreground">{place.location}</p>
                      </div>
                      <Badge variant="outline">{place.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Saved {place.savedDate}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <div className="text-center py-12">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Travel Guides Yet</h3>
            <p className="text-muted-foreground mb-4">
              {isOwnProfile 
                ? "Create your first travel guide to share your expertise"
                : "This user hasn't created any travel guides yet"
              }
            </p>
            {isOwnProfile && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Guide
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
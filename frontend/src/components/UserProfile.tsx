import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Users, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Settings,
  Camera,
  Globe,
  Compass,
  Award,
  TreePine,
  Star,
  Heart,
  Bookmark,
  Edit,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { TravelStats } from './TravelStats';
import { ContentShowcase } from './ContentShowcase';
import { SocialConnections } from './SocialConnections';
import { ProfileSettings } from './ProfileSettings';

interface UserProfileProps {
  onBack?: () => void;
  isOwnProfile?: boolean;
  userId?: string;
}

const mockUserData = {
  id: '1',
  name: 'Sarah Chen',
  username: '@sarahexplores',
  tagline: 'Sustainable traveler • Culture enthusiast • Digital nomad',
  location: 'San Francisco, CA',
  memberSince: 'March 2023',
  coverImage: 'https://images.unsplash.com/photo-1583710412494-e819ce3b1087?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWxlciUyMHByb2ZpbGUlMjBjb3ZlciUyMHBob3RvJTIwbW91bnRhaW4lMjBsYW5kc2NhcGV8ZW58MXx8fHwxNzU4MzEyMzYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  isFollowing: false,
  stats: {
    countriesVisited: 24,
    citiesExplored: 67,
    tripsCompleted: 18,
    milesTravel: 125000,
    ecoScore: 85,
    followers: 2840,
    following: 451,
    posts: 156
  },
  achievements: [
    { id: '1', name: 'World Explorer', icon: Globe, description: 'Visited 20+ countries', earned: true },
    { id: '2', name: 'Eco Warrior', icon: TreePine, description: 'Eco score 80+', earned: true },
    { id: '3', name: 'Culture Seeker', icon: Compass, description: 'Visited 10+ museums', earned: true },
    { id: '4', name: 'Adventure Master', icon: Award, description: '15+ adventure activities', earned: false }
  ],
  verificationBadges: ['identity', 'social_media', 'references']
};

export function UserProfile({ onBack, isOwnProfile = true, userId }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFollowing, setIsFollowing] = useState(mockUserData.isFollowing);
  const [showSettings, setShowSettings] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Photo & Profile Header */}
      <div className="relative">
        <div 
          className="h-48 md:h-64 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${mockUserData.coverImage})` }}
        >
          <div className="absolute inset-0 bg-black/20" />
          {isOwnProfile && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-foreground"
            >
              <Camera className="h-4 w-4 mr-2" />
              Edit Cover
            </Button>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="relative px-4 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background">
                  <AvatarImage src={mockUserData.avatar} alt={mockUserData.name} />
                  <AvatarFallback>{mockUserData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl md:text-2xl font-medium">{mockUserData.name}</h1>
                  <div className="flex space-x-1">
                    {mockUserData.verificationBadges.includes('identity') && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground">{mockUserData.username}</p>
                <p className="text-sm">{mockUserData.tagline}</p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{mockUserData.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {mockUserData.memberSince}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4 md:mt-0">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleFollow}
                    className={isFollowing ? 'bg-muted text-foreground hover:bg-muted/80' : ''}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </>
              )}
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-medium text-primary">{mockUserData.stats.countriesVisited}</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-medium text-primary">{mockUserData.stats.citiesExplored}</div>
              <div className="text-sm text-muted-foreground">Cities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-medium text-primary">{mockUserData.stats.followers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-medium text-primary">{mockUserData.stats.posts}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="connections">Social</TabsTrigger>
            <TabsTrigger value="achievements">Awards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <TravelStats userStats={mockUserData.stats} />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <ContentShowcase userId={mockUserData.id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="connections" className="mt-6">
            <SocialConnections 
              userId={mockUserData.id}
              followers={mockUserData.stats.followers}
              following={mockUserData.stats.following}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6 mt-6">
            {/* Achievement Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span>Travel Achievements</span>
                </CardTitle>
                <CardDescription>Unlock badges by exploring the world</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockUserData.achievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <div 
                        key={achievement.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border ${
                          achievement.earned 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'bg-muted/50 border-border opacity-60'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${
                          achievement.earned ? 'bg-primary text-black' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Eco Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TreePine className="h-5 w-5 text-emerald-600" />
                  <span>Sustainability Impact</span>
                </CardTitle>
                <CardDescription>Your positive environmental impact while traveling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Eco Travel Score</span>
                    <span className="font-medium text-emerald-600">{mockUserData.stats.ecoScore}/100</span>
                  </div>
                  <Progress value={mockUserData.stats.ecoScore} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-emerald-600">124 kg</div>
                    <div className="text-muted-foreground">CO₂ Offset</div>
                  </div>
                  <div>
                    <div className="font-medium text-emerald-600">18</div>
                    <div className="text-muted-foreground">Eco Properties</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Settings Modal */}
      {showSettings && (
        <ProfileSettings 
          onClose={() => setShowSettings(false)}
          userProfile={mockUserData}
        />
      )}
    </div>
  );
}
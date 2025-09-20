import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  MessageCircle, 
  MoreHorizontal, 
  Search,
  MapPin,
  Star,
  Filter,
  Globe,
  Group,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SocialConnectionsProps {
  userId: string;
  followers: number;
  following: number;
  isOwnProfile: boolean;
}

const mockFollowers = [
  {
    id: '1',
    name: 'Alex Thompson',
    username: '@alexadventures',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    location: 'New York, USA',
    isFollowing: true,
    mutualConnections: 12,
    travelBuddy: true,
    countriesVisited: 15,
    lastActive: '2 hours ago'
  },
  {
    id: '2',
    name: 'Maria Santos',
    username: '@mariawanderlust',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face',
    location: 'Barcelona, Spain',
    isFollowing: false,
    mutualConnections: 8,
    travelBuddy: false,
    countriesVisited: 22,
    lastActive: '1 day ago'
  },
  {
    id: '3',
    name: 'David Kim',
    username: '@davidexplores',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    location: 'Seoul, South Korea',
    isFollowing: true,
    mutualConnections: 5,
    travelBuddy: true,
    countriesVisited: 18,
    lastActive: '3 hours ago'
  }
];

const mockGroups = [
  {
    id: '1',
    name: 'Solo Female Travelers',
    description: 'Safe travel tips and companion finding',
    members: 2847,
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=60&h=60&fit=crop',
    category: 'Safety & Support',
    isJoined: true,
    activity: 'Very Active'
  },
  {
    id: '2',
    name: 'Budget Backpackers',
    description: 'Travel the world without breaking the bank',
    members: 1523,
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=60&h=60&fit=crop',
    category: 'Budget Travel',
    isJoined: true,
    activity: 'Active'
  },
  {
    id: '3',
    name: 'Digital Nomads Asia',
    description: 'Work remotely while exploring Asia',
    members: 3421,
    image: 'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=60&h=60&fit=crop',
    category: 'Remote Work',
    isJoined: false,
    activity: 'Very Active'
  }
];

const mockTravelBuddies = [
  {
    id: '1',
    name: 'Emma Wilson',
    username: '@emmawanders',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    compatibilityScore: 92,
    sharedInterests: ['Photography', 'Culture', 'Food'],
    plannedTrip: 'Japan Spring 2024',
    testimonial: 'Amazing travel companion! Super organized and fun to explore with.',
    tripsCompleted: 3
  },
  {
    id: '2',
    name: 'James Rodriguez',
    username: '@jamesroams',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    compatibilityScore: 88,
    sharedInterests: ['Adventure', 'Nature', 'Hiking'],
    plannedTrip: 'Patagonia Trek 2024',
    testimonial: 'Great hiking partner with excellent outdoor skills!',
    tripsCompleted: 2
  }
];

export function SocialConnections({ userId, followers, following, isOwnProfile }: SocialConnectionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('followers');
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  const handleFollowToggle = (userId: string, currentState: boolean) => {
    setFollowingStates(prev => ({
      ...prev,
      [userId]: !currentState
    }));
  };

  const ConnectionCard = ({ user }: { user: any }) => {
    const isFollowingUser = followingStates[user.id] ?? user.isFollowing;
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex space-x-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{user.name}</h4>
                    {user.travelBuddy && (
                      <Badge variant="secondary" className="text-xs">
                        Travel Buddy
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.username}</p>
                </div>
                
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{user.location}</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center space-x-1">
                    <Globe className="h-3 w-3" />
                    <span>{user.countriesVisited} countries</span>
                  </span>
                  {user.mutualConnections > 0 && (
                    <span className="text-muted-foreground">
                      {user.mutualConnections} mutual connections
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={isFollowingUser ? "outline" : "default"}
                onClick={() => handleFollowToggle(user.id, isFollowingUser)}
              >
                {isFollowingUser ? (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
              
              <Button size="sm" variant="ghost">
                <MessageCircle className="h-3 w-3" />
              </Button>
              
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const GroupCard = ({ group }: { group: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            <img 
              src={group.image} 
              alt={group.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{group.name}</h4>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={group.activity === 'Very Active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {group.activity}
                  </Badge>
                  <Button
                    size="sm"
                    variant={group.isJoined ? "outline" : "default"}
                  >
                    {group.isJoined ? 'Joined' : 'Join'}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{group.members.toLocaleString()} members</span>
                </span>
                <Badge variant="outline" className="text-xs">
                  {group.category}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TravelBuddyCard = ({ buddy }: { buddy: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={buddy.avatar} alt={buddy.name} />
              <AvatarFallback>{buddy.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{buddy.name}</h4>
                  <p className="text-sm text-muted-foreground">{buddy.username}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{buddy.compatibilityScore}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">compatibility</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {buddy.sharedInterests.map((interest: string) => (
                <Badge key={interest} variant="outline" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground italic">"{buddy.testimonial}"</p>
            
            <div className="flex items-center justify-between text-xs">
              <span>{buddy.tripsCompleted} trips together</span>
              <div className="flex items-center space-x-1 text-primary">
                <Calendar className="h-3 w-3" />
                <span>{buddy.plannedTrip}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button size="sm" className="flex-1">
              <MessageCircle className="h-3 w-3 mr-2" />
              Message
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Plan Trip
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Connection Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="followers">
            Followers ({followers.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="following">
            Following ({following})
          </TabsTrigger>
          <TabsTrigger value="buddies">
            Travel Buddies
          </TabsTrigger>
          <TabsTrigger value="groups">
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="space-y-3 mt-4">
          {mockFollowers.map((user) => (
            <ConnectionCard key={user.id} user={user} />
          ))}
        </TabsContent>

        <TabsContent value="following" className="space-y-3 mt-4">
          {mockFollowers.map((user) => (
            <ConnectionCard key={user.id} user={user} />
          ))}
        </TabsContent>

        <TabsContent value="buddies" className="space-y-4 mt-4">
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Your verified travel companions with shared trip history
            </p>
          </div>
          {mockTravelBuddies.map((buddy) => (
            <TravelBuddyCard key={buddy.id} buddy={buddy} />
          ))}
        </TabsContent>

        <TabsContent value="groups" className="space-y-3 mt-4">
          {mockGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star,
  MapPin,
  Camera,
  Upload,
  Download,
  Flag,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Volume2,
  Image as ImageIcon,
  Video,
  FileText,
  Languages,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ContentManagementProps {
  onClose?: () => void;
}

const mockProperties = [
  {
    id: 'P001',
    title: 'Luxury Apartment in Montmartre',
    host: 'Sarah Chen',
    status: 'pending',
    submitted: '2024-06-15',
    images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&h=200&fit=crop'],
    price: 189,
    location: 'Paris, France',
    rating: 4.8,
    flags: [],
    qualityScore: 92
  },
  {
    id: 'P002',
    title: 'Beachfront Villa with Pool',
    host: 'Marcus Rodriguez',
    status: 'approved',
    submitted: '2024-06-10',
    images: ['https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=300&h=200&fit=crop'],
    price: 450,
    location: 'Barcelona, Spain',
    rating: 4.9,
    flags: [],
    qualityScore: 96
  },
  {
    id: 'P003',
    title: 'Historic Loft Downtown',
    host: 'Emily Johnson',
    status: 'flagged',
    submitted: '2024-06-12',
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop'],
    price: 125,
    location: 'London, UK',
    rating: 3.2,
    flags: ['misleading-photos', 'inaccurate-description'],
    qualityScore: 65
  }
];

const mockExperiences = [
  {
    id: 'E001',
    title: 'Private Cooking Class with Chef Marie',
    guide: 'Marie Dubois',
    category: 'Culinary',
    status: 'approved',
    submitted: '2024-06-14',
    images: ['https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop'],
    price: 125,
    duration: '3 hours',
    rating: 4.9,
    participants: 45
  },
  {
    id: 'E002',
    title: 'Street Art Tour in Le Marais',
    guide: 'Antoine Bernard',
    category: 'Culture',
    status: 'pending',
    submitted: '2024-06-16',
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=300&h=200&fit=crop'],
    price: 35,
    duration: '2 hours',
    rating: 4.6,
    participants: 28
  }
];

const mockPOIs = [
  {
    id: 'POI001',
    name: 'Eiffel Tower',
    category: 'Monument',
    status: 'published',
    images: ['https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=300&h=200&fit=crop'],
    description: 'Iconic iron lattice tower on the Champ de Mars in Paris...',
    audioGuides: 12,
    arExperiences: 3,
    translations: 15,
    lastUpdated: '2024-06-10'
  },
  {
    id: 'POI002',
    name: 'Sagrada Familia',
    category: 'Religious Site',
    status: 'published',
    images: ['https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=300&h=200&fit=crop'],
    description: 'Large unfinished Roman Catholic minor basilica...',
    audioGuides: 8,
    arExperiences: 2,
    translations: 12,
    lastUpdated: '2024-06-08'
  }
];

const mockReviews = [
  {
    id: 'R001',
    type: 'property',
    targetId: 'P001',
    targetTitle: 'Luxury Apartment in Montmartre',
    reviewer: 'David Kim',
    rating: 5,
    content: 'Amazing stay! The apartment was exactly as described and Sarah was a wonderful host.',
    status: 'approved',
    submitted: '2024-06-14',
    flags: [],
    helpfulVotes: 12
  },
  {
    id: 'R002',
    type: 'experience',
    targetId: 'E001',
    targetTitle: 'Private Cooking Class',
    reviewer: 'Lisa Zhang',
    rating: 2,
    content: 'The class was disappointing. The chef seemed unprepared and the ingredients were not fresh.',
    status: 'flagged',
    submitted: '2024-06-15',
    flags: ['negative-review', 'quality-concern'],
    helpfulVotes: 3
  }
];

export function ContentManagement({ onClose }: ContentManagementProps) {
  const [activeTab, setActiveTab] = useState('properties');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'flagged':
        return <Badge variant="destructive">Flagged</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const PropertyCard = ({ property }: { property: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="relative">
          <ImageWithFallback
            src={property.images[0]}
            alt={property.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-2 right-2 flex space-x-1">
            {getStatusBadge(property.status)}
          </div>
          {property.flags.length > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive">
                <Flag className="h-3 w-3 mr-1" />
                {property.flags.length}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">{property.title}</h4>
              <p className="text-sm text-muted-foreground">by {property.host}</p>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{property.location}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span>{property.rating}</span>
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-medium">€{property.price}</span>
                <span className="text-sm text-muted-foreground">/night</span>
              </div>
              {getQualityBadge(property.qualityScore)}
            </div>
            
            {property.flags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600">Issues:</p>
                {property.flags.map((flag: string) => (
                  <p key={flag} className="text-xs text-red-600">• {flag.replace('-', ' ')}</p>
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-2 pt-2">
              <Button size="sm" variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                Review
              </Button>
              <Button size="sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Content Management</h1>
            <p className="text-sm text-muted-foreground">Manage properties, experiences, and user-generated content</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
            <TabsTrigger value="pois">POIs</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="media">Media Assets</TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="properties" className="space-y-6">
            {/* Property Management */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Property Listings</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Pending: 12</Badge>
                <Badge variant="destructive">Flagged: 3</Badge>
                <Badge className="bg-green-100 text-green-800">Approved: 148</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* Quality Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Analytics</CardTitle>
                <CardDescription>Property listing quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-medium">87.5%</p>
                    <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-medium">95.2%</p>
                    <p className="text-sm text-muted-foreground">Photo Quality</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-medium">82.1%</p>
                    <p className="text-sm text-muted-foreground">Description Quality</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-medium">5.8%</p>
                    <p className="text-sm text-muted-foreground">Rejection Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experiences" className="space-y-6">
            {/* Experience Management */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Experience Listings</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Pending: 8</Badge>
                <Badge className="bg-green-100 text-green-800">Approved: 67</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockExperiences.map((experience) => (
                <Card key={experience.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative">
                      <ImageWithFallback
                        src={experience.images[0]}
                        alt={experience.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(experience.status)}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium">{experience.title}</h4>
                          <p className="text-sm text-muted-foreground">by {experience.guide}</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <Badge variant="outline">{experience.category}</Badge>
                          <span className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span>{experience.rating}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-medium">€{experience.price}</span>
                            <span className="text-sm text-muted-foreground"> • {experience.duration}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{experience.participants} participants</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pois" className="space-y-6">
            {/* POI Management */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Points of Interest</h3>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">Published: 234</Badge>
                <Badge variant="secondary">Draft: 12</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {mockPOIs.map((poi) => (
                <Card key={poi.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <ImageWithFallback
                        src={poi.images[0]}
                        alt={poi.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{poi.name}</h4>
                            <p className="text-sm text-muted-foreground">{poi.category}</p>
                            <p className="text-sm mt-2">{poi.description}</p>
                          </div>
                          {getStatusBadge(poi.status)}
                        </div>
                        
                        <div className="flex items-center space-x-6 mt-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Volume2 className="h-3 w-3" />
                            <span>{poi.audioGuides} audio guides</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Camera className="h-3 w-3" />
                            <span>{poi.arExperiences} AR experiences</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Languages className="h-3 w-3" />
                            <span>{poi.translations} translations</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Upload className="h-3 w-3 mr-1" />
                            Add Media
                          </Button>
                          <Button size="sm" variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            Translations
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {/* Review Moderation */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Review Moderation</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Pending: 24</Badge>
                <Badge variant="destructive">Flagged: 5</Badge>
                <Badge className="bg-green-100 text-green-800">Approved: 1,847</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {mockReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{review.targetTitle}</h4>
                            <Badge variant="outline">{review.type}</Badge>
                            {review.flags.length > 0 && (
                              <Badge variant="destructive">
                                <Flag className="h-3 w-3 mr-1" />
                                Flagged
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Review by {review.reviewer} • {review.submitted}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm">{review.content}</p>
                      
                      {review.flags.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-red-600">Flags:</p>
                          {review.flags.map((flag: string) => (
                            <p key={flag} className="text-xs text-red-600">• {flag.replace('-', ' ')}</p>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{review.helpfulVotes} helpful</span>
                          </span>
                          <span>{getStatusBadge(review.status)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Respond
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* Media Asset Management */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Media Asset Library</h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Media
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center p-6">
                <ImageIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-medium">24,856</p>
                <p className="text-sm text-muted-foreground">Images</p>
              </Card>
              <Card className="text-center p-6">
                <Video className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-medium">1,234</p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </Card>
              <Card className="text-center p-6">
                <Volume2 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-medium">567</p>
                <p className="text-sm text-muted-foreground">Audio Files</p>
              </Card>
              <Card className="text-center p-6">
                <FileText className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                <p className="text-2xl font-medium">89</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </Card>
            </div>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Latest media assets added to the library</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">eiffel_tower_sunset.jpg</h4>
                        <p className="text-sm text-muted-foreground">Uploaded by Sarah Chen • 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Video className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">cooking_class_intro.mp4</h4>
                        <p className="text-sm text-muted-foreground">Uploaded by Marie Dubois • 5 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
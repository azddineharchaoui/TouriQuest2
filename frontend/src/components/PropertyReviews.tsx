/**
 * PropertyReviews - Reviews display and submission system
 * Connected to GET/POST /api/v1/properties/{id}/reviews
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Filter,
  SortDesc,
  Search,
  MessageSquare,
  User,
  Calendar,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Award,
  Heart,
  Shield,
  Verified
} from 'lucide-react';

interface PropertyReviewsProps {
  property: Property;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  photos?: string[];
  response?: {
    from: string;
    content: string;
    date: string;
  };
  categories: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}

interface NewReview {
  rating: number;
  title: string;
  content: string;
  categories: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}

export const PropertyReviews: React.FC<PropertyReviewsProps> = ({ property }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters and sorting
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const reviewsPerPage = 10;
  
  // Review submission
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState<NewReview>({
    rating: 5,
    title: '',
    content: '',
    categories: {
      cleanliness: 5,
      communication: 5,
      checkIn: 5,
      accuracy: 5,
      location: 5,
      value: 5
    }
  });

  useEffect(() => {
    fetchReviews();
  }, [property.id, currentPage, filterRating, sortBy, searchTerm]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getPropertyReviews(property.id, {
        page: currentPage,
        limit: reviewsPerPage,
        rating: filterRating,
        sortBy,
        search: searchTerm
      });
      
      setReviews(response.data.reviews);
      setStats(response.data.stats);
      setTotalPages(Math.ceil(response.data.total / reviewsPerPage));
      
    } catch (err: any) {
      setError('Failed to load reviews');
      
      // Mock data fallback
      const mockReviews: Review[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'Sarah Johnson',
          userAvatar: '/api/placeholder/40/40',
          rating: 5,
          title: 'Amazing stay with beautiful views!',
          content: 'This property exceeded all expectations. The location was perfect, the amenities were top-notch, and the host was incredibly responsive. The view from the balcony was breathtaking, especially during sunset. Would definitely stay here again!',
          date: '2024-01-15',
          verified: true,
          helpful: 12,
          photos: ['/api/placeholder/150/150', '/api/placeholder/150/150'],
          categories: {
            cleanliness: 5,
            communication: 5,
            checkIn: 5,
            accuracy: 5,
            location: 5,
            value: 4
          }
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Michael Chen',
          rating: 4,
          title: 'Great location, minor issues',
          content: 'Overall a good experience. The property is in an excellent location with easy access to restaurants and attractions. The space was clean and well-maintained. Only minor issue was the WiFi was a bit slow, but everything else was perfect.',
          date: '2024-01-10',
          verified: true,
          helpful: 8,
          response: {
            from: 'Host',
            content: 'Thank you for your feedback! We\'ve since upgraded our internet service to provide faster WiFi. Hope to host you again soon!',
            date: '2024-01-11'
          },
          categories: {
            cleanliness: 4,
            communication: 5,
            checkIn: 4,
            accuracy: 4,
            location: 5,
            value: 4
          }
        },
        {
          id: '3',
          userId: 'user3',
          userName: 'Emma Davis',
          rating: 5,
          title: 'Perfect for our anniversary',
          content: 'We stayed here for our anniversary and it was absolutely perfect. The property was romantic, clean, and had all the amenities we needed. The host left a lovely welcome gift which was such a nice touch.',
          date: '2024-01-05',
          verified: true,
          helpful: 15,
          categories: {
            cleanliness: 5,
            communication: 5,
            checkIn: 5,
            accuracy: 5,
            location: 4,
            value: 5
          }
        }
      ];
      
      const mockStats: ReviewStats = {
        totalReviews: 47,
        averageRating: 4.6,
        ratingDistribution: {
          5: 28,
          4: 12,
          3: 5,
          2: 1,
          1: 1
        },
        categoryAverages: {
          cleanliness: 4.7,
          communication: 4.8,
          checkIn: 4.6,
          accuracy: 4.5,
          location: 4.4,
          value: 4.3
        }
      };
      
      setReviews(mockReviews);
      setStats(mockStats);
      setTotalPages(5);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      
      const reviewData = {
        ...newReview,
        propertyId: property.id
      };
      
      await propertyService.submitPropertyReview(property.id, reviewData);
      
      // Reset form and refresh reviews
      setNewReview({
        rating: 5,
        title: '',
        content: '',
        categories: {
          cleanliness: 5,
          communication: 5,
          checkIn: 5,
          accuracy: 5,
          location: 5,
          value: 5
        }
      });
      
      setShowReviewForm(false);
      fetchReviews();
      
    } catch (err: any) {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulVote = async (reviewId: string, helpful: boolean) => {
    try {
      await propertyService.voteReviewHelpful(reviewId, helpful);
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful: review.helpful + (helpful ? 1 : -1) }
          : review
      ));
    } catch (err) {
      console.error('Failed to vote on review');
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };
    
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="w-8 text-right">{rating}</span>
        <Star className="w-3 h-3 text-yellow-400 fill-current" />
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-muted-foreground">{count}</span>
      </div>
    );
  };

  const filteredReviews = reviews.filter(review => {
    if (filterRating && review.rating !== filterRating) return false;
    if (searchTerm && !review.content.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !review.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'rating':
        return b.rating - a.rating;
      case 'helpful':
        return b.helpful - a.helpful;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Reviews ({stats?.totalReviews || 0})
          </h3>
          
          <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
            <DialogTrigger asChild>
              <Button>Write a Review</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <Label>Overall Rating</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {newReview.rating}/5
                    </span>
                  </div>
                </div>

                {/* Category Ratings */}
                <div>
                  <Label>Category Ratings</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {Object.entries(newReview.categories).map(([category, rating]) => (
                      <div key={category} className="space-y-1">
                        <Label className="text-sm capitalize">{category}</Label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setNewReview(prev => ({
                                ...prev,
                                categories: { ...prev.categories, [category]: star }
                              }))}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Title */}
                <div>
                  <Label htmlFor="title">Review Title</Label>
                  <Input
                    id="title"
                    value={newReview.title}
                    onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Summarize your experience"
                  />
                </div>

                {/* Review Content */}
                <div>
                  <Label htmlFor="content">Your Review</Label>
                  <Textarea
                    id="content"
                    value={newReview.content}
                    onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Tell us about your stay..."
                    rows={5}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting || !newReview.title || !newReview.content}
                  >
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Review
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Review Stats */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{stats.averageRating.toFixed(1)}</div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(stats.averageRating), 'lg')}
              </div>
              <div className="text-muted-foreground">
                Based on {stats.totalReviews} reviews
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              <h4 className="font-medium mb-3">Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating}>
                  {renderRatingBar(
                    rating,
                    stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution],
                    stats.totalReviews
                  )}
                </div>
              ))}
            </div>

            {/* Category Averages */}
            <div className="space-y-3">
              <h4 className="font-medium mb-3">Category Ratings</h4>
              {Object.entries(stats.categoryAverages).map(([category, rating]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{category}</span>
                  <div className="flex items-center space-x-2">
                    {renderStars(Math.round(rating), 'sm')}
                    <span className="text-sm text-muted-foreground">{rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <SortDesc className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating">Highest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading reviews...</span>
          </div>
        ) : error ? (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        ) : sortedReviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviews found matching your criteria.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedReviews.map((review) => (
              <Card key={review.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={review.userAvatar} alt={review.userName} />
                    <AvatarFallback>
                      {review.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{review.userName}</h4>
                        {review.verified && (
                          <Badge variant="secondary" className="text-xs">
                            <Verified className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <h5 className="font-medium mb-2">{review.title}</h5>
                    <p className="text-muted-foreground mb-4">{review.content}</p>
                    
                    {/* Review Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex space-x-2 mb-4">
                        {review.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Review photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Category Ratings */}
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      {Object.entries(review.categories).map(([category, rating]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize text-muted-foreground">{category}</span>
                          <div className="flex items-center space-x-1">
                            {renderStars(rating, 'sm')}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Host Response */}
                    {review.response && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-blue-700">Response from {review.response.from}</span>
                          <span className="text-sm text-blue-600">
                            {new Date(review.response.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-blue-700">{review.response.content}</p>
                      </div>
                    )}
                    
                    {/* Review Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleHelpfulVote(review.id, true)}
                          className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-green-600"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Helpful ({review.helpful})</span>
                        </button>
                        
                        <button className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-red-600">
                          <Flag className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PropertyReviews;
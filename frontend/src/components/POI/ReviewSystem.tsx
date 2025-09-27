import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Filter, 
  Camera,
  Video,
  Search,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Flag,
  Award,
  Heart,
  Share2
} from 'lucide-react';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  title: string;
  content: string;
  photos: string[];
  videos: string[];
  visitDate: string;
  createdAt: string;
  helpfulCount: number;
  isHelpful: boolean;
  visitorType: 'solo' | 'couple' | 'family' | 'friends' | 'business' | 'local' | 'tourist';
  season: string;
  tags: string[];
  verifiedVisit: boolean;
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    emotions: string[];
  };
  crowdsourcedTips: string[];
  localExpertBadge?: {
    level: 'verified_local' | 'expert_guide' | 'cultural_ambassador';
    badgeIcon: string;
    verificationDate: string;
  };
  translation?: {
    language: string;
    content: string;
    isAuto: boolean;
  };
  response?: {
    from: string;
    content: string;
    createdAt: string;
  };
}

interface ReviewSystemProps {
  poiId: string;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = ({ poiId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWriteReview, setShowWriteReview] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [poiId, selectedFilter, sortBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter: selectedFilter,
        sort: sortBy,
        search: searchQuery
      });
      
      const response = await fetch(`/api/v1/pois/${poiId}/reviews?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        setRatingDistribution(data.ratingDistribution);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async (reviewId: string, isHelpful: boolean) => {
    try {
      const response = await fetch(`/api/v1/reviews/${reviewId}/helpful`, {
        method: isHelpful ? 'POST' : 'DELETE'
      });
      
      if (response.ok) {
        setReviews(reviews.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                isHelpful: isHelpful,
                helpfulCount: review.helpfulCount + (isHelpful ? 1 : -1)
              }
            : review
        ));
      }
    } catch (error) {
      console.error('Failed to update helpful status:', error);
    }
  };

  const getVisitorTypeIcon = (type: string) => {
    switch (type) {
      case 'solo': return '👤';
      case 'couple': return '💑';
      case 'family': return '👨‍👩‍👧‍👦';
      case 'friends': return '👥';
      case 'business': return '💼';
      default: return '👤';
    }
  };

  const getVisitorTypeColor = (type: string) => {
    const colors = {
      solo: 'bg-blue-100 text-blue-800',
      couple: 'bg-pink-100 text-pink-800',  
      family: 'bg-green-100 text-green-800',
      friends: 'bg-purple-100 text-purple-800',
      business: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Review Summary */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Overall Rating */}
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-800 mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= averageRating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-gray-600">{totalReviews.toLocaleString()} reviews</div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{rating}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ 
                      width: `${((ratingDistribution[rating - 1] || 0) / totalReviews) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12">
                  {Math.round(((ratingDistribution[rating - 1] || 0) / totalReviews) * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-semibold">Trending Up</div>
                <div className="text-sm text-gray-600">Recent reviews are positive</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-amber-500" />
              <div>
                <div className="font-semibold">Highly Rated</div>
                <div className="text-sm text-gray-600">95% positive reviews</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-semibold">Popular with</div>
                <div className="text-sm text-gray-600">Families & couples</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowWriteReview(true)}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
          >
            Write a Review
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Reviews</option>
              <option value="solo">Solo Travelers</option>
              <option value="couple">Couples</option>
              <option value="family">Families</option>
              <option value="friends">Friends</option>
              <option value="business">Business</option>
              <option value="verified">Verified Visits</option>
              <option value="photos">With Photos</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            {/* Review Header */}
            <div className="flex items-start gap-4 mb-4">
              <img
                src={review.userAvatar}
                alt={review.userName}
                className="w-12 h-12 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-gray-800">{review.userName}</span>
                  {review.verifiedVisit && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Verified Visit
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full ${getVisitorTypeColor(review.visitorType)}`}>
                    {getVisitorTypeIcon(review.visitorType)} {review.visitorType}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Visited {new Date(review.visitDate).toLocaleDateString()}</span>
                  </div>
                  
                  <span>• {review.season}</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Review Content */}
            <div className="mb-4">
              {review.title && (
                <h4 className="font-semibold text-lg text-gray-800 mb-2">{review.title}</h4>
              )}
              <p className="text-gray-700 leading-relaxed">{review.content}</p>
            </div>

            {/* Review Media */}
            {(review.photos.length > 0 || review.videos.length > 0) && (
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {review.photos.map((photo, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                        <Camera className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                  
                  {review.videos.map((video, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <video
                        src={video}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                        poster={`${video}_thumbnail`}
                      />
                      <div className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Tags */}
            {review.tags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {review.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Management Response */}
            {review.response && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">Response from {review.response.from}</span>
                  <span className="text-sm text-blue-600">
                    {new Date(review.response.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-blue-800">{review.response.content}</p>
              </div>
            )}

            {/* Review Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleHelpful(review.id, !review.isHelpful)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                    review.isHelpful
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpfulCount})</span>
                </button>
                
                <button className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
              
              <button className="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      {reviews.length >= 10 && (
        <div className="text-center">
          <button className="px-8 py-3 border-2 border-gray-300 rounded-xl hover:border-gray-400 transition-colors">
            Load More Reviews
          </button>
        </div>
      )}
    </motion.div>
  );
};
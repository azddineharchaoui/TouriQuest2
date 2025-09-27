import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Share2,
  Globe,
  Brain,
  Shield,
  Sparkles,
  Languages,
  Mic,
  Image,
  FileText,
  Eye,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  User,
  Crown,
  Lightbulb,
  ThumbsUpIcon
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
  audioClips?: string[];
  visitDate: string;
  createdAt: string;
  helpfulCount: number;
  isHelpful: boolean;
  visitorType: 'solo' | 'couple' | 'family' | 'friends' | 'business' | 'local' | 'tourist';
  season: string;
  tags: string[];
  verifiedVisit: boolean;
  
  // Advanced Social Features
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    emotions: string[];
    confidence: number;
  };
  
  crowdsourcedTips: Array<{
    tip: string;
    category: 'timing' | 'budget' | 'access' | 'experience' | 'safety';
    upvotes: number;
    isVerified: boolean;
  }>;
  
  localExpertBadge?: {
    level: 'verified_local' | 'expert_guide' | 'cultural_ambassador' | 'frequent_visitor';
    badgeIcon: string;
    verificationDate: string;
    credentialScore: number;
  };
  
  translation?: {
    originalLanguage: string;
    translatedContent: string;
    isAuto: boolean;
    confidence: number;
  };
  
  socialMetrics: {
    shares: number;
    saves: number;
    replies: number;
    mentions: number;
  };
  
  contextualInfo: {
    weather: string;
    crowdLevel: 'low' | 'medium' | 'high';
    specialEvents?: string[];
    travelPurpose: string;
  };
  
  response?: {
    from: string;
    fromType: 'owner' | 'manager' | 'staff' | 'official';
    content: string;
    createdAt: string;
    isVerified: boolean;
  };
}

interface SocialFeature {
  id: string;
  type: 'check_in' | 'friend_activity' | 'group_plan' | 'contest' | 'achievement';
  content: any;
  timestamp: string;
  userId: string;
}

interface EnhancedReviewSystemProps {
  poiId: string;
}

export const EnhancedReviewSystem: React.FC<EnhancedReviewSystemProps> = ({ poiId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating' | 'sentiment'>('recent');
  const [filterBy, setFilterBy] = useState<{
    visitorType: string;
    sentiment: string;
    language: string;
    hasMedia: boolean;
    hasExpertBadge: boolean;
    timeRange: string;
  }>({
    visitorType: 'all',
    sentiment: 'all',
    language: 'all',
    hasMedia: false,
    hasExpertBadge: false,
    timeRange: 'all'
  });
  
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [socialActivities, setSocialActivities] = useState<SocialFeature[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReviews();
    fetchSocialActivities();
    generateAIInsights();
  }, [poiId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [reviews, sortBy, filterBy]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialActivities = async () => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/social-activities`);
      if (response.ok) {
        const data = await response.json();
        setSocialActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch social activities:', error);
    }
  };

  const generateAIInsights = async () => {
    try {
      const response = await fetch(`/api/v1/ai/review-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.insights);
        setTrendingTopics(data.trendingTopics);
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...reviews];

    // Apply filters
    if (filterBy.visitorType !== 'all') {
      filtered = filtered.filter(review => review.visitorType === filterBy.visitorType);
    }
    
    if (filterBy.sentiment !== 'all') {
      filtered = filtered.filter(review => review.sentiment.label === filterBy.sentiment);
    }
    
    if (filterBy.hasMedia) {
      filtered = filtered.filter(review => 
        review.photos.length > 0 || review.videos.length > 0 || review.audioClips?.length
      );
    }
    
    if (filterBy.hasExpertBadge) {
      filtered = filtered.filter(review => review.localExpertBadge);
    }

    // Apply sorting
    switch (sortBy) {
      case 'helpful':
        filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'sentiment':
        filtered.sort((a, b) => b.sentiment.score - a.sentiment.score);
        break;
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    setFilteredReviews(filtered);
  };

  const submitReview = async (reviewData: any) => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews(prev => [newReview, ...prev]);
        setShowWriteReview(false);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/v1/pois/${poiId}/reviews/${reviewId}/helpful`, {
        method: 'POST'
      });

      if (response.ok) {
        setReviews(prev => 
          prev.map(review => 
            review.id === reviewId 
              ? { ...review, helpfulCount: review.helpfulCount + 1, isHelpful: true }
              : review
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  const translateReview = async (reviewId: string, targetLanguage: string) => {
    try {
      const response = await fetch(`/api/v1/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reviews.find(r => r.id === reviewId)?.content,
          targetLanguage
        })
      });

      if (response.ok) {
        const translation = await response.json();
        setReviews(prev => 
          prev.map(review => 
            review.id === reviewId 
              ? { 
                  ...review, 
                  translation: {
                    originalLanguage: review.translation?.originalLanguage || 'en',
                    translatedContent: translation.text,
                    isAuto: true,
                    confidence: translation.confidence
                  }
                }
              : review
          )
        );
      }
    } catch (error) {
      console.error('Failed to translate review:', error);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVisitorTypeIcon = (type: string) => {
    const icons = {
      solo: <User className="w-4 h-4" />,
      couple: <Heart className="w-4 h-4" />,
      family: <Users className="w-4 h-4" />,
      friends: <Users className="w-4 h-4" />,
      business: <MessageSquare className="w-4 h-4" />,
      local: <MapPin className="w-4 h-4" />,
      tourist: <Camera className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <User className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI-Powered Insights Panel */}
      {aiInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold">AI Review Insights</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(aiInsights.averageSentiment * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Positive Sentiment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {aiInsights.commonThemes?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Key Themes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {aiInsights.recommendationScore}/5
              </div>
              <div className="text-sm text-gray-600">AI Recommendation</div>
            </div>
          </div>

          {trendingTopics.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Trending Topics:</h4>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200"
                  >
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Advanced Filters & Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rated</option>
            <option value="sentiment">Most Positive</option>
          </select>

          <select
            value={filterBy.visitorType}
            onChange={(e) => setFilterBy(prev => ({ ...prev, visitorType: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Visitors</option>
            <option value="local">Locals</option>
            <option value="tourist">Tourists</option>
            <option value="family">Families</option>
            <option value="couple">Couples</option>
            <option value="solo">Solo Travelers</option>
            <option value="business">Business</option>
          </select>

          <select
            value={filterBy.sentiment}
            onChange={(e) => setFilterBy(prev => ({ ...prev, sentiment: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterBy.hasMedia}
              onChange={(e) => setFilterBy(prev => ({ ...prev, hasMedia: e.target.checked }))}
              className="rounded"
            />
            <Camera className="w-4 h-4" />
            Has Media
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterBy.hasExpertBadge}
              onChange={(e) => setFilterBy(prev => ({ ...prev, hasExpertBadge: e.target.checked }))}
              className="rounded"
            />
            <Crown className="w-4 h-4" />
            Expert Reviews
          </label>
        </div>

        <button
          onClick={() => setShowWriteReview(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Write Review
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border p-6 space-y-4"
          >
            {/* Review Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={review.userAvatar}
                  alt={review.userName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{review.userName}</h4>
                    {review.localExpertBadge && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        <Crown className="w-3 h-3" />
                        {review.localExpertBadge.level.replace('_', ' ')}
                      </div>
                    )}
                    {review.verifiedVisit && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {getVisitorTypeIcon(review.visitorType)}
                    <span className="capitalize">{review.visitorType}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(review.visitDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(review.sentiment.label)}`}
                >
                  {(review.sentiment.score * 100).toFixed(0)}% {review.sentiment.label}
                </span>
              </div>
            </div>

            {/* Review Content */}
            <div>
              <h5 className="font-medium mb-2">{review.title}</h5>
              <p className="text-gray-700 leading-relaxed">
                {review.translation?.translatedContent || review.content}
              </p>
              
              {review.translation && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  Translated from {review.translation.originalLanguage}
                  {!review.translation.isAuto && <span>(Human verified)</span>}
                </div>
              )}
            </div>

            {/* Crowdsourced Tips */}
            {review.crowdsourcedTips.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h6 className="font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Pro Tips from this visitor:
                </h6>
                <div className="space-y-2">
                  {review.crowdsourcedTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600">•</span>
                      <span>{tip.tip}</span>
                      {tip.isVerified && (
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Gallery */}
            {(review.photos.length > 0 || review.videos.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {review.photos.slice(0, 4).map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={photo}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => setSelectedReview(review)}
                    />
                  </div>
                ))}
                {review.videos.slice(0, 2).map((video, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden relative">
                    <video
                      src={video}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <Video className="w-6 h-6 text-white absolute top-2 right-2" />
                  </div>
                ))}
              </div>
            )}

            {/* Review Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => markHelpful(review.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                    review.isHelpful
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful ({review.helpfulCount})
                </button>

                <button className="flex items-center gap-2 px-3 py-1 rounded-full text-sm hover:bg-gray-100 text-gray-600">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>

                <button
                  onClick={() => translateReview(review.id, 'en')}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm hover:bg-gray-100 text-gray-600"
                >
                  <Globe className="w-4 h-4" />
                  Translate
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                <span>{review.socialMetrics.shares} shares</span>
                <span>•</span>
                <span>{review.socialMetrics.saves} saves</span>
              </div>
            </div>

            {/* Management Response */}
            {review.response && (
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Response from {review.response.from}
                  </span>
                  {review.response.isVerified && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-gray-700 text-sm">{review.response.content}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(review.response.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Load More Button */}
      {filteredReviews.length > 0 && (
        <div className="text-center">
          <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Load More Reviews
          </button>
        </div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowWriteReview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Write Your Review</h3>
                {/* Review form would go here */}
                <div className="text-center text-gray-500 py-8">
                  Advanced multimedia review form with AI assistance would be implemented here
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
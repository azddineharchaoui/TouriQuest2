/**
 * ReviewSubmission - Component for submitting booking reviews
 * Features rating, photos, categories, and detailed feedback
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Star,
  Camera,
  Upload,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingReview, ReviewCategory } from '../../types/booking-types';

interface ReviewSubmissionProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
  className?: string;
}

export const ReviewSubmission: React.FC<ReviewSubmissionProps> = ({
  booking,
  onClose,
  onSuccess,
  className = ''
}) => {
  const [step, setStep] = useState<'rating' | 'details' | 'photos' | 'success'>('rating');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review form state
  const [overallRating, setOverallRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<ReviewCategory[]>([
    { name: 'Cleanliness', rating: 0 },
    { name: 'Accuracy', rating: 0 },
    { name: 'Communication', rating: 0 },
    { name: 'Location', rating: 0 },
    { name: 'Check-in', rating: 0 },
    { name: 'Value', rating: 0 }
  ]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const updateCategoryRating = (categoryName: string, rating: number) => {
    setCategories(prev => prev.map(cat => 
      cat.name === categoryName ? { ...cat, rating } : cat
    ));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + photos.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    setPhotos(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotoUrls(prev => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setError('Please provide an overall rating');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Please provide a title and review content');
      return;
    }

    if (wouldRecommend === null) {
      setError('Please indicate if you would recommend this place');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const review: BookingReview = {
        bookingId: booking.id,
        rating: overallRating,
        title: title.trim(),
        content: content.trim(),
        categories: categories.filter(cat => cat.rating > 0),
        photos: photoUrls, // In real app, photos would be uploaded first
        wouldRecommend
      };

      const response = await bookingService.submitReview(booking.id, review);
      
      if (response.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(response.message || 'Failed to submit review');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while submitting your review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void; size?: number }> = ({ 
    rating, 
    onRatingChange, 
    size = 24 
  }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onRatingChange(star)}
            className="transition-colors hover:scale-110 transform transition-transform"
          >
            <Star
              size={size}
              className={`${
                star <= (hoverRating || rating)
                  ? 'text-yellow-500 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star size={24} />
                Write a Review
              </h2>
              <p className="text-yellow-100 mt-1">{booking.itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'rating' && (
            <div className="p-6 space-y-6">
              {/* Overall Rating */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  How would you rate your overall experience?
                </h3>
                <div className="flex justify-center mb-4">
                  <StarRating 
                    rating={overallRating} 
                    onRatingChange={setOverallRating}
                    size={40}
                  />
                </div>
                <p className="text-gray-600">
                  {overallRating === 0 ? 'Select a rating' :
                   overallRating === 1 ? 'Terrible' :
                   overallRating === 2 ? 'Poor' :
                   overallRating === 3 ? 'Average' :
                   overallRating === 4 ? 'Good' : 'Excellent'}
                </p>
              </div>

              {/* Category Ratings */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Rate specific aspects:</h4>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{category.name}</span>
                      <StarRating 
                        rating={category.rating}
                        onRatingChange={(rating) => updateCategoryRating(category.name, rating)}
                        size={20}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">
                  Would you recommend this place to other travelers?
                </h4>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      wouldRecommend === true
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsUp size={20} />
                    Yes, I recommend
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      wouldRecommend === false
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsDown size={20} />
                    No, I don't recommend
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Tell us about your experience
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience in a few words"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Share details about your stay that would help other travelers..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{content.length}/1000 characters</p>
              </div>

              {/* Review Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Review Guidelines</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be honest and specific about your experience</li>
                  <li>• Focus on aspects that would help other travelers</li>
                  <li>• Avoid personal information or inappropriate content</li>
                  <li>• Be respectful in your language</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'photos' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Add Photos (Optional)
                </h3>
                <p className="text-gray-600 mb-4">
                  Share photos of your stay to help other travelers. Maximum 5 photos.
                </p>
              </div>

              {/* Photo Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Camera className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-lg font-medium text-gray-700 mb-2">Add Photos</p>
                  <p className="text-gray-500">Drag and drop or click to browse</p>
                </label>
              </div>

              {/* Photo Preview */}
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Review photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600">
                  Your review has been submitted successfully. It will help other travelers 
                  make informed decisions.
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  Your review will be visible to other users after our moderation process, 
                  which typically takes 24-48 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="border-t border-gray-200 p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (step === 'rating') onClose();
                  else if (step === 'details') setStep('rating');
                  else if (step === 'photos') setStep('details');
                }}
                className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {step === 'rating' ? 'Cancel' : 'Back'}
              </button>
              
              <button
                onClick={() => {
                  if (step === 'rating') setStep('details');
                  else if (step === 'details') setStep('photos');
                  else handleSubmit();
                }}
                disabled={
                  (step === 'rating' && (overallRating === 0 || wouldRecommend === null)) ||
                  (step === 'details' && (!title.trim() || !content.trim())) ||
                  submitting
                }
                className="flex items-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting && <Loader className="animate-spin" size={16} />}
                {step === 'photos' ? 'Submit Review' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ReviewSubmission;
/**
 * BookingShare - Component for sharing bookings with friends and family
 * Features social sharing, private links, and collaboration tools
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Instagram,
  Link,
  Users,
  Eye,
  Lock,
  Globe,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Download
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types/booking-types';

interface BookingShareProps {
  booking: Booking;
  onClose: () => void;
  className?: string;
}

export const BookingShare: React.FC<BookingShareProps> = ({
  booking,
  onClose,
  className = ''
}) => {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareType, setShareType] = useState<'public' | 'private' | 'limited'>('private');
  const [emails, setEmails] = useState<string>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    generateShareUrl();
  }, [shareType]);

  const generateShareUrl = async () => {
    try {
      setLoading(true);
      
      // Generate share URL based on type
      const baseUrl = bookingService.generateShareableUrl(booking.id);
      const urlWithParams = `${baseUrl}?type=${shareType}&ref=${Date.now()}`;
      
      setShareUrl(urlWithParams);
    } catch (error) {
      console.error('Error generating share URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaEmail = async () => {
    if (!emails.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const emailList = emails.split(',').map(email => email.trim());
      
      const response = await bookingService.shareBooking(booking.id, {
        email: emailList.join(','),
        platform: 'email'
      });

      if (response.success) {
        setSuccess('Booking shared successfully!');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);
      } else {
        setError('Failed to share booking');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to share booking');
    } finally {
      setLoading(false);
    }
  };

  const shareOnSocial = (platform: string) => {
    const text = `Check out my trip to ${booking.itemName}!`;
    const url = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);

    let shareLink = '';
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%20${url}`;
        break;
      default:
        return;
    }

    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Share2 size={24} />
                Share Your Trip
              </h2>
              <p className="text-purple-100 mt-1">{booking.itemName}</p>
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
        <div className="p-6 space-y-6">
          {/* Trip Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-4">
              {booking.itemImages.length > 0 && (
                <img
                  src={booking.itemImages[0]}
                  alt={booking.itemName}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{booking.itemName}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{booking.guests.adults + booking.guests.children} guests</span>
                  <span>${booking.totalAmount.toLocaleString()}</span>
                  <span className="capitalize">{booking.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Privacy Settings</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="shareType"
                  value="private"
                  checked={shareType === 'private'}
                  onChange={(e) => setShareType(e.target.value as any)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="text-gray-500" size={16} />
                    <span className="font-medium text-gray-900">Private Link</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Only people with the link can view your trip details
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="shareType"
                  value="limited"
                  checked={shareType === 'limited'}
                  onChange={(e) => setShareType(e.target.value as any)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="text-gray-500" size={16} />
                    <span className="font-medium text-gray-900">Friends Only</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Limited view with basic trip information only
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="shareType"
                  value="public"
                  checked={shareType === 'public'}
                  onChange={(e) => setShareType(e.target.value as any)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="text-gray-500" size={16} />
                    <span className="font-medium text-gray-900">Public</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Anyone can view and share your trip (excludes personal info)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Share Link</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copied ? <CheckCircle className="text-green-500" size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button
                onClick={() => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
                  window.open(qrUrl, '_blank');
                }}
                className="p-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                title="Generate QR Code"
              >
                <QrCode size={20} />
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-2">Link copied to clipboard!</p>
            )}
          </div>

          {/* Social Sharing */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Share on Social Media</h3>
            <div className="flex gap-3">
              <button
                onClick={() => shareOnSocial('facebook')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Facebook size={16} />
                Facebook
              </button>
              <button
                onClick={() => shareOnSocial('twitter')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Twitter size={16} />
                Twitter
              </button>
              <button
                onClick={() => shareOnSocial('whatsapp')}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageSquare size={16} />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Email Sharing */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Share via Email</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Addresses (comma-separated)
                </label>
                <input
                  type="email"
                  multiple
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="friend@example.com, family@example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Hey! Wanted to share my upcoming trip with you..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
              </div>

              <button
                onClick={shareViaEmail}
                disabled={loading || !emails.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Mail size={16} />
                Send Email Invitation
              </button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Eye className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Privacy Notice</p>
                <p>
                  When you share your trip, recipients can view booking details based on your 
                  privacy settings. Personal information like payment details are never shared.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingShare;
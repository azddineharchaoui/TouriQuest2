import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  Heart,
  Share2,
  MessageCircle,
  Camera,
  Check,
  Award,
  Trophy,
  Gift,
  Target
} from 'lucide-react';

interface SocialFeaturesProps {
  poiId: string;
  poiName: string;
}

interface CheckIn {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  photos: string[];
  comment?: string;
  friends: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}

export const SocialFeatures: React.FC<SocialFeaturesProps> = ({ poiId, poiName }) => {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'Sarah Johnson',
      userAvatar: '/avatars/sarah.jpg',
      timestamp: '2 hours ago',
      photos: ['/photos/checkin1.jpg'],
      comment: 'Amazing experience! The architecture is breathtaking.',
      friends: ['John', 'Mike']
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Mike Chen',
      userAvatar: '/avatars/mike.jpg',
      timestamp: '5 hours ago',
      photos: [],
      friends: ['Sarah', 'Emma']
    }
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: '1',
      title: 'Explorer',
      description: 'Visit 10 different POIs',
      icon: '🗺️',
      progress: 7,
      maxProgress: 10,
      unlocked: false
    },
    {
      id: '2',
      title: 'Social Butterfly',
      description: 'Check in with 5 friends',
      icon: '🦋',
      progress: 3,
      maxProgress: 5,
      unlocked: false
    },
    {
      id: '3',
      title: 'Photo Master',
      description: 'Share 20 photos',
      icon: '📸',
      progress: 15,
      maxProgress: 20,
      unlocked: false
    }
  ]);

  const handleCheckIn = () => {
    // Implement check-in logic
    setShowCheckIn(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Check-in Section */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Check In</h3>
            <p className="text-white/80">Share your visit with friends</p>
          </div>
          <button
            onClick={handleCheckIn}
            className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-full transition-colors flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Check In Here
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">124</div>
            <div className="text-sm text-white/80">Check-ins Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold">8</div>
            <div className="text-sm text-white/80">Friends Here</div>
          </div>
          <div>
            <div className="text-2xl font-bold">1.2k</div>
            <div className="text-sm text-white/80">Total This Week</div>
          </div>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          Recent Check-ins
        </h3>
        
        <div className="space-y-4">
          {recentCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={checkIn.userAvatar}
                alt={checkIn.userName}
                className="w-12 h-12 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{checkIn.userName}</span>
                  <span className="text-sm text-gray-500">checked in</span>
                  <span className="text-sm text-gray-500">{checkIn.timestamp}</span>
                </div>
                
                {checkIn.comment && (
                  <p className="text-gray-700 mb-2">{checkIn.comment}</p>
                )}
                
                {checkIn.photos.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {checkIn.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Check-in photo ${index + 1}`}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <button className="flex items-center gap-1 hover:text-red-500">
                    <Heart className="w-4 h-4" />
                    Like
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-500">
                    <MessageCircle className="w-4 h-4" />
                    Comment
                  </button>
                  <button className="flex items-center gap-1 hover:text-green-500">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  
                  {checkIn.friends.length > 0 && (
                    <span className="text-blue-600">
                      with {checkIn.friends.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements & Gamification */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Your Achievements
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-center mb-3">
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <h4 className="font-semibold">{achievement.title}</h4>
                <p className="text-sm text-gray-600">{achievement.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{achievement.progress}/{achievement.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      achievement.unlocked ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${(achievement.progress / achievement.maxProgress) * 100}%`
                    }}
                  />
                </div>
              </div>
              
              {achievement.unlocked && (
                <div className="mt-3 text-center">
                  <span className="px-3 py-1 bg-amber-500 text-white text-xs rounded-full">
                    Unlocked!
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Group Visit Planning */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-500" />
          Plan a Group Visit
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Invite Friends</h4>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Search friends..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Invite
              </button>
            </div>
            
            <div className="space-y-2">
              {['Emma Wilson', 'John Doe', 'Lisa Brown'].map((friend, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {friend.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium">{friend}</span>
                  </div>
                  <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-full hover:bg-green-600">
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Suggested Times</h4>
            <div className="space-y-2">
              {[
                { time: 'Tomorrow 2:00 PM', available: 3 },
                { time: 'Weekend 10:00 AM', available: 5 },
                { time: 'Next Monday 4:00 PM', available: 2 }
              ].map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                  <div>
                    <div className="font-medium">{slot.time}</div>
                    <div className="text-sm text-gray-600">{slot.available} friends available</div>
                  </div>
                  <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600">
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCheckIn(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Check in at {poiName}</h3>
              
              <div className="space-y-4">
                <textarea
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Camera className="w-4 h-4" />
                    Add Photo
                  </button>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Users className="w-4 h-4" />
                    Tag Friends
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCheckIn(false)}
                    className="flex-1 py-2 px-4 border-2 border-gray-300 rounded-lg hover:border-gray-400"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    Check In
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
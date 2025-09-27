import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check,
  Users,
  Star,
  Heart,
  Share2,
  Camera,
  MapPin,
  Clock,
  Trophy,
  Crown,
  Award,
  Target,
  Calendar,
  User,
  MessageCircle,
  Zap,
  Sparkles,
  Globe,
  TrendingUp,
  Gift,
  Flag,
  Eye,
  ThumbsUp,
  UserPlus,
  Settings,
  Bell,
  Competition
} from 'lucide-react';

interface CheckIn {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  location: string;
  mood: 'excited' | 'happy' | 'amazed' | 'peaceful' | 'adventurous';
  photo?: string;
  caption?: string;
  companions: number;
  weather: string;
  tags: string[];
  achievements?: Achievement[];
  isFirst: boolean;
  privacy: 'public' | 'friends' | 'private';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'exploration' | 'social' | 'cultural' | 'adventure' | 'sustainability';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  progress?: {
    current: number;
    total: number;
  };
}

interface Contest {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  prize: string;
  participantCount: number;
  category: 'photo' | 'story' | 'challenge' | 'social';
  rules: string[];
  submissions: number;
  isActive: boolean;
  userParticipated: boolean;
}

interface FriendActivity {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  activityType: 'check_in' | 'achievement' | 'review' | 'photo' | 'plan';
  content: any;
  timestamp: string;
  location: string;
  isNew: boolean;
}

interface GroupPlan {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: Array<{
    userId: string;
    name: string;
    avatar: string;
    status: 'confirmed' | 'maybe' | 'declined';
    role: 'organizer' | 'member';
  }>;
  visitDate: string;
  meetingPoint: string;
  activities: string[];
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  chat: Array<{
    userId: string;
    message: string;
    timestamp: string;
  }>;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
}

interface SocialCommunityFeaturesProps {
  poiId: string;
  currentUserId: string;
}

export const SocialCommunityFeatures: React.FC<SocialCommunityFeaturesProps> = ({ 
  poiId, 
  currentUserId 
}) => {
  const [activeTab, setActiveTab] = useState<'checkins' | 'friends' | 'contests' | 'groups' | 'achievements'>('checkins');
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [groupPlans, setGroupPlans] = useState<GroupPlan[]>([]);
  
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    mood: 'happy' as const,
    caption: '',
    companions: 1,
    tags: [] as string[],
    photo: null as File | null,
    privacy: 'public' as const
  });
  
  const [newGroupPlan, setNewGroupPlan] = useState({
    name: '',
    description: '',
    visitDate: '',
    meetingPoint: '',
    activities: [] as string[],
    invites: [] as string[]
  });

  const [socialStats, setSocialStats] = useState({
    totalCheckIns: 0,
    achievementsUnlocked: 0,
    friendsConnected: 0,
    contestsWon: 0,
    groupPlansOrganized: 0
  });

  useEffect(() => {
    fetchSocialData();
  }, [poiId, currentUserId]);

  const fetchSocialData = async () => {
    try {
      // Fetch recent check-ins
      const checkInsResponse = await fetch(`/api/v1/pois/${poiId}/checkins`);
      if (checkInsResponse.ok) {
        const checkInsData = await checkInsResponse.json();
        setRecentCheckIns(checkInsData.checkins);
      }

      // Fetch friend activities
      const friendsResponse = await fetch(`/api/v1/social/friends/activities?poiId=${poiId}`);
      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriendActivities(friendsData.activities);
      }

      // Fetch active contests
      const contestsResponse = await fetch(`/api/v1/social/contests?poiId=${poiId}&active=true`);
      if (contestsResponse.ok) {
        const contestsData = await contestsResponse.json();
        setActiveContests(contestsData.contests);
      }

      // Fetch user achievements
      const achievementsResponse = await fetch(`/api/v1/social/achievements?userId=${currentUserId}&poiId=${poiId}`);
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setUserAchievements(achievementsData.achievements);
      }

      // Fetch group plans
      const groupsResponse = await fetch(`/api/v1/social/groups?poiId=${poiId}&userId=${currentUserId}`);
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setGroupPlans(groupsData.groups);
      }

      // Fetch social stats
      const statsResponse = await fetch(`/api/v1/social/stats?userId=${currentUserId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSocialStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch social data:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const formData = new FormData();
      formData.append('poiId', poiId);
      formData.append('mood', checkInData.mood);
      formData.append('caption', checkInData.caption);
      formData.append('companions', checkInData.companions.toString());
      formData.append('tags', JSON.stringify(checkInData.tags));
      formData.append('privacy', checkInData.privacy);
      
      if (checkInData.photo) {
        formData.append('photo', checkInData.photo);
      }

      const response = await fetch('/api/v1/social/checkin', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newCheckIn = await response.json();
        setRecentCheckIns(prev => [newCheckIn, ...prev]);
        setShowCheckInModal(false);
        
        // Reset form
        setCheckInData({
          mood: 'happy',
          caption: '',
          companions: 1,
          tags: [],
          photo: null,
          privacy: 'public'
        });
      }
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };

  const createGroupPlan = async () => {
    try {
      const response = await fetch('/api/v1/social/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGroupPlan,
          poiId,
          organizerId: currentUserId
        })
      });

      if (response.ok) {
        const groupPlan = await response.json();
        setGroupPlans(prev => [groupPlan, ...prev]);
        setShowGroupModal(false);
        
        // Reset form
        setNewGroupPlan({
          name: '',
          description: '',
          visitDate: '',
          meetingPoint: '',
          activities: [],
          invites: []
        });
      }
    } catch (error) {
      console.error('Failed to create group plan:', error);
    }
  };

  const getMoodIcon = (mood: string) => {
    const icons = {
      excited: '🤩',
      happy: '😊',
      amazed: '😲',
      peaceful: '😌',
      adventurous: '🚀'
    };
    return icons[mood as keyof typeof icons] || '😊';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (activityType: string) => {
    const icons = {
      check_in: <Check className="w-4 h-4" />,
      achievement: <Trophy className="w-4 h-4" />,
      review: <Star className="w-4 h-4" />,
      photo: <Camera className="w-4 h-4" />,
      plan: <Calendar className="w-4 h-4" />
    };
    return icons[activityType as keyof typeof icons] || <User className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Social Stats Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Your Social Journey</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{socialStats.totalCheckIns}</div>
            <div className="text-sm text-gray-600">Check-ins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{socialStats.achievementsUnlocked}</div>
            <div className="text-sm text-gray-600">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{socialStats.friendsConnected}</div>
            <div className="text-sm text-gray-600">Friends</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{socialStats.contestsWon}</div>
            <div className="text-sm text-gray-600">Contests Won</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{socialStats.groupPlansOrganized}</div>
            <div className="text-sm text-gray-600">Groups Led</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'checkins', label: 'Check-ins', icon: <Check className="w-4 h-4" /> },
            { id: 'friends', label: 'Friend Activity', icon: <Users className="w-4 h-4" /> },
            { id: 'contests', label: 'Contests', icon: <Trophy className="w-4 h-4" /> },
            { id: 'groups', label: 'Group Plans', icon: <Calendar className="w-4 h-4" /> },
            { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Check-ins Tab */}
      {activeTab === 'checkins' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recent Check-ins</h3>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Check In Here
            </button>
          </div>

          <div className="space-y-4">
            {recentCheckIns.map((checkIn) => (
              <motion.div
                key={checkIn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border p-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={checkIn.userAvatar}
                    alt={checkIn.userName}
                    className="w-10 h-10 rounded-full"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{checkIn.userName}</h4>
                      <span className="text-xl">{getMoodIcon(checkIn.mood)}</span>
                      {checkIn.isFirst && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          First Visit!
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(checkIn.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <Users className="w-3 h-3" />
                      <span>{checkIn.companions} {checkIn.companions === 1 ? 'person' : 'people'}</span>
                      <span>•</span>
                      <span>{checkIn.weather}</span>
                    </div>
                    
                    {checkIn.caption && (
                      <p className="text-gray-700 mb-2">{checkIn.caption}</p>
                    )}
                    
                    {checkIn.photo && (
                      <img
                        src={checkIn.photo}
                        alt="Check-in photo"
                        className="w-full max-w-md h-48 object-cover rounded-lg mb-2"
                      />
                    )}
                    
                    {checkIn.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {checkIn.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {checkIn.achievements && checkIn.achievements.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">Unlocked achievements:</span>
                        {checkIn.achievements.map((achievement, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                          >
                            {achievement.name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <button className="flex items-center gap-1 hover:text-blue-600">
                        <Heart className="w-4 h-4" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-blue-600">
                        <MessageCircle className="w-4 h-4" />
                        <span>Comment</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-blue-600">
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Friend Activity Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What Your Friends Are Up To</h3>
          
          {friendActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-lg border p-4 flex items-center gap-4"
            >
              <img
                src={activity.friendAvatar}
                alt={activity.friendName}
                className="w-10 h-10 rounded-full"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getActivityIcon(activity.activityType)}
                  <span className="font-semibold">{activity.friendName}</span>
                  <span className="text-gray-600">
                    {activity.activityType === 'check_in' && 'checked in at'}
                    {activity.activityType === 'achievement' && 'unlocked an achievement at'}
                    {activity.activityType === 'review' && 'reviewed'}
                    {activity.activityType === 'photo' && 'shared a photo from'}
                    {activity.activityType === 'plan' && 'created a group plan for'}
                  </span>
                  <span className="font-medium">{activity.location}</span>
                  
                  {activity.isNew && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      New
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
              </div>
              
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-sm">
                View
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Contests Tab */}
      {activeTab === 'contests' && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Active Contests</h3>
          
          <div className="grid gap-6">
            {activeContests.map((contest) => (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-orange-900">{contest.title}</h4>
                    <p className="text-orange-700">{contest.description}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-orange-600">Prize</div>
                    <div className="font-semibold text-orange-900">{contest.prize}</div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{contest.participantCount}</div>
                    <div className="text-sm text-orange-700">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{contest.submissions}</div>
                    <div className="text-sm text-red-700">Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.ceil((new Date(contest.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-sm text-purple-700">Days Left</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-orange-700 capitalize">{contest.category} Contest</span>
                  </div>
                  
                  <button
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      contest.userParticipated
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                    disabled={contest.userParticipated}
                  >
                    {contest.userParticipated ? 'Participating' : 'Join Contest'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Group Plans Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Group Visit Plans</h3>
            <button
              onClick={() => setShowGroupModal(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Group Plan
            </button>
          </div>
          
          <div className="space-y-4">
            {groupPlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{plan.name}</h4>
                    <p className="text-gray-600">{plan.description}</p>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    plan.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    plan.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                    plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {plan.status}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(plan.visitDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{plan.meetingPoint}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Budget Range</div>
                    <div className="font-medium">
                      {plan.budget.currency}{plan.budget.min} - {plan.budget.currency}{plan.budget.max}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {plan.members.slice(0, 5).map((member, index) => (
                      <img
                        key={member.userId}
                        src={member.avatar}
                        alt={member.name}
                        className="w-8 h-8 rounded-full border-2 border-white"
                        title={member.name}
                      />
                    ))}
                    {plan.members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                        +{plan.members.length - 5}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-sm">
                      View Details
                    </button>
                    <button className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">
                      Join Chat
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Your Achievements</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAchievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg border p-4 text-center"
              >
                <div className="text-4xl mb-3">{achievement.icon}</div>
                
                <h4 className="font-semibold mb-2">{achievement.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRarityColor(achievement.rarity)}`}>
                  <Sparkles className="w-3 h-3" />
                  {achievement.rarity}
                </div>
                
                {achievement.progress && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${(achievement.progress.current / achievement.progress.total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {achievement.progress.current} / {achievement.progress.total}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCheckInModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Check In</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">How are you feeling?</label>
                  <div className="flex gap-2">
                    {(['excited', 'happy', 'amazed', 'peaceful', 'adventurous'] as const).map((mood) => (
                      <button
                        key={mood}
                        onClick={() => setCheckInData(prev => ({ ...prev, mood }))}
                        className={`p-3 rounded-lg border transition-colors ${
                          checkInData.mood === mood
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{getMoodIcon(mood)}</div>
                        <div className="text-xs capitalize">{mood}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Share your experience</label>
                  <textarea
                    value={checkInData.caption}
                    onChange={(e) => setCheckInData(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="What's special about this place?"
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Group size</label>
                    <input
                      type="number"
                      min="1"
                      value={checkInData.companions}
                      onChange={(e) => setCheckInData(prev => ({ ...prev, companions: parseInt(e.target.value) || 1 }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Privacy</label>
                    <select
                      value={checkInData.privacy}
                      onChange={(e) => setCheckInData(prev => ({ ...prev, privacy: e.target.value as any }))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleCheckIn}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Check In
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Plan Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Create Group Plan</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={newGroupPlan.name}
                    onChange={(e) => setNewGroupPlan(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekend Adventure"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newGroupPlan.description}
                    onChange={(e) => setNewGroupPlan(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What's the plan?"
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Visit Date</label>
                  <input
                    type="date"
                    value={newGroupPlan.visitDate}
                    onChange={(e) => setNewGroupPlan(prev => ({ ...prev, visitDate: e.target.value }))}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Meeting Point</label>
                  <input
                    type="text"
                    value={newGroupPlan.meetingPoint}
                    onChange={(e) => setNewGroupPlan(prev => ({ ...prev, meetingPoint: e.target.value }))}
                    placeholder="Where should everyone meet?"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={createGroupPlan}
                    className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Create Plan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
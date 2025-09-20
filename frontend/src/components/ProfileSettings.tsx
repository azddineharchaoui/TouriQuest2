import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Globe, 
  Users, 
  Eye, 
  EyeOff, 
  Bell, 
  MapPin, 
  MessageCircle, 
  Star, 
  Shield,
  Camera,
  Edit,
  Save,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';

interface ProfileSettingsProps {
  onClose: () => void;
  userProfile: any;
}

export function ProfileSettings({ onClose, userProfile }: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState('profile');
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showLocation: true,
    showTravelStats: true,
    allowMessages: true,
    showFollowers: true,
    showActivity: true,
    allowTagging: true,
    shareWithFriends: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    followNotifications: true,
    messageNotifications: true,
    tripUpdates: true,
    reviewNotifications: false,
    marketingEmails: false,
    weeklyDigest: true
  });

  const [profileData, setProfileData] = useState({
    name: userProfile.name,
    username: userProfile.username,
    tagline: userProfile.tagline,
    location: userProfile.location,
    bio: 'Passionate traveler exploring the world sustainably. Love discovering hidden gems and authentic cultural experiences.'
  });

  const sections = [
    { id: 'profile', name: 'Profile Info', icon: Edit },
    { id: 'privacy', name: 'Privacy', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'safety', name: 'Safety', icon: Shield }
  ];

  const handlePrivacyChange = (setting: string, value: boolean | string) => {
    setPrivacySettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleNotificationChange = (setting: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-medium">Profile Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{section.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Update your profile details and bio</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={profileData.username}
                            onChange={(e) => handleProfileChange('username', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="tagline">Travel Tagline</Label>
                        <Input
                          id="tagline"
                          value={profileData.tagline}
                          onChange={(e) => handleProfileChange('tagline', e.target.value)}
                          placeholder="Describe your travel style in a few words"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => handleProfileChange('location', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => handleProfileChange('bio', e.target.value)}
                          placeholder="Tell others about your travel experiences and interests"
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                          {profileData.bio.length}/500 characters
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Photos</CardTitle>
                      <CardDescription>Manage your profile and cover photos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium">Profile Picture</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              JPG, PNG up to 5MB
                            </p>
                            <Button size="sm" variant="outline">
                              <Camera className="h-4 w-4 mr-2" />
                              Change Photo
                            </Button>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Cover Photo</h4>
                          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                            <Camera className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <Button size="sm" variant="outline">
                            <Camera className="h-4 w-4 mr-2" />
                            Change Cover
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Privacy Settings</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Visibility</CardTitle>
                      <CardDescription>Control who can see your profile and content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Profile Visibility</Label>
                        <Select
                          value={privacySettings.profileVisibility}
                          onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center space-x-2">
                                <Globe className="h-4 w-4" />
                                <span>Public - Anyone can see</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="followers">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Followers Only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center space-x-2">
                                <Lock className="h-4 w-4" />
                                <span>Private - Invitation only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Current Location</Label>
                            <p className="text-sm text-muted-foreground">Allow others to see your current city</p>
                          </div>
                          <Switch
                            checked={privacySettings.showLocation}
                            onCheckedChange={(checked) => handlePrivacyChange('showLocation', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Travel Statistics</Label>
                            <p className="text-sm text-muted-foreground">Display your travel stats on your profile</p>
                          </div>
                          <Switch
                            checked={privacySettings.showTravelStats}
                            onCheckedChange={(checked) => handlePrivacyChange('showTravelStats', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Allow Direct Messages</Label>
                            <p className="text-sm text-muted-foreground">Let others send you private messages</p>
                          </div>
                          <Switch
                            checked={privacySettings.allowMessages}
                            onCheckedChange={(checked) => handlePrivacyChange('allowMessages', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Followers/Following</Label>
                            <p className="text-sm text-muted-foreground">Display your social connections</p>
                          </div>
                          <Switch
                            checked={privacySettings.showFollowers}
                            onCheckedChange={(checked) => handlePrivacyChange('showFollowers', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Activity Status</Label>
                            <p className="text-sm text-muted-foreground">Let others see when you were last active</p>
                          </div>
                          <Switch
                            checked={privacySettings.showActivity}
                            onCheckedChange={(checked) => handlePrivacyChange('showActivity', checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Push Notifications</CardTitle>
                      <CardDescription>Manage your mobile and desktop notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                        </div>
                        <Switch
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>New Followers</Label>
                          <p className="text-sm text-muted-foreground">When someone follows you</p>
                        </div>
                        <Switch
                          checked={notificationSettings.followNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('followNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Direct Messages</Label>
                          <p className="text-sm text-muted-foreground">When you receive a message</p>
                        </div>
                        <Switch
                          checked={notificationSettings.messageNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('messageNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Trip Updates</Label>
                          <p className="text-sm text-muted-foreground">Updates about your bookings and trips</p>
                        </div>
                        <Switch
                          checked={notificationSettings.tripUpdates}
                          onCheckedChange={(checked) => handleNotificationChange('tripUpdates', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Email Notifications</CardTitle>
                      <CardDescription>Control what emails you receive from TouriQuest</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                        </div>
                        <Switch
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Weekly Travel Digest</Label>
                          <p className="text-sm text-muted-foreground">Weekly summary of trending destinations</p>
                        </div>
                        <Switch
                          checked={notificationSettings.weeklyDigest}
                          onCheckedChange={(checked) => handleNotificationChange('weeklyDigest', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Marketing Emails</Label>
                          <p className="text-sm text-muted-foreground">Promotional offers and travel deals</p>
                        </div>
                        <Switch
                          checked={notificationSettings.marketingEmails}
                          onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'safety' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Safety & Security</h3>
                  
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      TouriQuest is designed for travel sharing and booking. Never share sensitive personal information like full addresses, financial details, or travel documents with other users.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Verification</CardTitle>
                      <CardDescription>Verify your identity to build trust with the community</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-green-600" />
                            <div>
                              <Label>Email Verification</Label>
                              <p className="text-sm text-muted-foreground">Verified email address</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Label>Phone Verification</Label>
                              <p className="text-sm text-muted-foreground">Add a verified phone number</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Verify
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Label>Identity Verification</Label>
                              <p className="text-sm text-muted-foreground">Upload government ID for higher trust</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Start
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Contacts</CardTitle>
                      <CardDescription>Set up emergency contacts for travel safety</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency-name">Emergency Contact Name</Label>
                        <Input id="emergency-name" placeholder="Full name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
                        <Input id="emergency-phone" placeholder="+1 (555) 123-4567" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency-relation">Relationship</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="spouse">Spouse/Partner</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
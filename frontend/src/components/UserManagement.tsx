import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Shield, 
  MessageSquare, 
  Eye, 
  Edit, 
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MapPin,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  Download,
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

interface UserManagementProps {
  onClose?: () => void;
}

const mockUsers = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c?w=100&h=100&fit=crop',
    status: 'active',
    joinDate: '2024-01-15',
    lastActive: '2 hours ago',
    totalBookings: 23,
    totalSpent: 5420,
    reviewScore: 4.8,
    verifications: {
      email: true,
      phone: true,
      id: true,
      host: false
    },
    location: 'San Francisco, CA',
    flags: [],
    accountType: 'premium'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    email: 'marcus.r@email.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    status: 'active',
    joinDate: '2023-11-20',
    lastActive: '1 day ago',
    totalBookings: 12,
    totalSpent: 2850,
    reviewScore: 4.6,
    verifications: {
      email: true,
      phone: true,
      id: false,
      host: true
    },
    location: 'Barcelona, Spain',
    flags: [],
    accountType: 'host'
  },
  {
    id: '3',
    name: 'Emily Johnson',
    email: 'emily.j@email.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    status: 'suspended',
    joinDate: '2024-02-03',
    lastActive: '5 days ago',
    totalBookings: 3,
    totalSpent: 890,
    reviewScore: 3.2,
    verifications: {
      email: true,
      phone: false,
      id: false,
      host: false
    },
    location: 'London, UK',
    flags: ['payment-dispute', 'inappropriate-content'],
    accountType: 'standard'
  }
];

const supportTickets = [
  {
    id: 'T-001',
    userId: '1',
    subject: 'Booking cancellation refund',
    status: 'open',
    priority: 'high',
    created: '2024-06-15 14:30',
    lastUpdate: '1 hour ago',
    category: 'billing'
  },
  {
    id: 'T-002',
    userId: '2',
    subject: 'Property listing not appearing',
    status: 'pending',
    priority: 'medium',
    created: '2024-06-14 09:15',
    lastUpdate: '6 hours ago',
    category: 'technical'
  }
];

export function UserManagement({ onClose }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesType = typeFilter === 'all' || user.accountType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const UserDetailModal = ({ user }: { user: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>User Profile - {user.name}</DialogTitle>
          <DialogDescription>Complete user information and management</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium">{user.name}</h3>
                  {getStatusBadge(user.status)}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{user.location}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {user.joinDate}</span>
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Verification Status */}
            <div>
              <h4 className="font-medium mb-3">Verification Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </span>
                  {user.verifications.email ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Phone</span>
                  </span>
                  {user.verifications.phone ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>ID Document</span>
                  </span>
                  {user.verifications.id ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Host Verification</span>
                  </span>
                  {user.verifications.host ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Activity Stats */}
            <div>
              <h4 className="font-medium mb-3">Activity Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-medium">{user.totalBookings}</p>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-medium">${user.totalSpent.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-medium">{user.reviewScore}/5</p>
                  <p className="text-sm text-muted-foreground">Review Score</p>
                </div>
                <div>
                  <p className="text-2xl font-medium">{user.lastActive}</p>
                  <p className="text-sm text-muted-foreground">Last Active</p>
                </div>
              </div>
            </div>

            {/* Flags and Issues */}
            {user.flags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Flags & Issues</h4>
                  <div className="space-y-2">
                    {user.flags.map((flag: string) => (
                      <div key={flag} className="flex items-center space-x-2">
                        <Flag className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{flag.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Admin Actions */}
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Admin Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Account
                </Button>
                <Button variant="destructive" size="sm">
                  <UserX className="h-4 w-4 mr-2" />
                  Suspend User
                </Button>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <h4 className="font-medium mb-3">Admin Notes</h4>
              <Textarea 
                placeholder="Add internal notes about this user..."
                className="min-h-[80px]"
              />
              <Button size="sm" className="mt-2">Save Notes</Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage user accounts and support tickets</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Send className="h-4 w-4 mr-2" />
              Bulk Message
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Directory</TabsTrigger>
            <TabsTrigger value="verification">Verification Queue</TabsTrigger>
            <TabsTrigger value="support">Support Tickets</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name or email..."
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="host">Host</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button variant="outline" size="sm">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                      <Button variant="destructive" size="sm">
                        <UserX className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User List */}
            <Card>
              <CardHeader>
                <CardTitle>User Directory ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserSelect(user.id)}
                      />
                      
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{user.name}</h4>
                          {getStatusBadge(user.status)}
                          <Badge variant="outline">{user.accountType}</Badge>
                          {user.flags.length > 0 && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {user.flags.length} flag{user.flags.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>{user.totalBookings} bookings</span>
                          <span>${user.totalSpent.toLocaleString()} spent</span>
                          <span className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-current text-yellow-400" />
                            <span>{user.reviewScore}</span>
                          </span>
                          <span>Last active: {user.lastActive}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <UserDetailModal user={user} />
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verification Queue</CardTitle>
                <CardDescription>Review and approve user verification requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">John Davidson</h4>
                        <p className="text-sm text-muted-foreground">ID Document Verification</p>
                        <p className="text-xs text-muted-foreground">Submitted 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">Review</Button>
                      <Button size="sm">Approve</Button>
                      <Button variant="destructive" size="sm">Reject</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop" />
                        <AvatarFallback>AL</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">Anna Liu</h4>
                        <p className="text-sm text-muted-foreground">Host Background Check</p>
                        <p className="text-xs text-muted-foreground">Submitted 1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">Review</Button>
                      <Button size="sm">Approve</Button>
                      <Button variant="destructive" size="sm">Reject</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Customer support ticket management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket) => {
                    const user = mockUsers.find(u => u.id === ticket.userId);
                    return (
                      <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback>{user?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{ticket.subject}</h4>
                              <Badge variant="outline">{ticket.id}</Badge>
                              {getPriorityBadge(ticket.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {user?.name} • {ticket.category} • {ticket.created}
                            </p>
                            <p className="text-xs text-muted-foreground">Last update: {ticket.lastUpdate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">View</Button>
                          <Button size="sm">Respond</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Communications</CardTitle>
                <CardDescription>Send messages to user segments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Target Audience</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="hosts">Hosts Only</SelectItem>
                      <SelectItem value="premium">Premium Members</SelectItem>
                      <SelectItem value="new">New Users (30 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Message Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select message type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="update">Platform Update</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input placeholder="Enter message subject" />
                </div>

                <div>
                  <label className="text-sm font-medium">Message Content</label>
                  <Textarea 
                    placeholder="Enter your message content..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline">Save as Draft</Button>
                  <Button variant="outline">Preview</Button>
                </div>
              </CardContent>
            </Card>

            {/* Communication History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Communications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Summer Promotion Campaign</h4>
                      <p className="text-sm text-muted-foreground">Sent to 45,230 users • 68% open rate</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2 days ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Platform Update Notification</h4>
                      <p className="text-sm text-muted-foreground">Sent to all users • 82% open rate</p>
                    </div>
                    <span className="text-xs text-muted-foreground">1 week ago</span>
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
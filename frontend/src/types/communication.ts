import { ApiResponse, PaginatedResponse } from './common';

// Communication Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  isRead: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'support' | 'group';
  title: string;
  participants: Array<{
    userId: string;
    name: string;
    avatar?: string;
    role: 'user' | 'support' | 'admin';
    joinedAt: string;
    lastSeen?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    bookingId?: string;
    propertyId?: string;
    experienceId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
  };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category: 'booking' | 'payment' | 'technical' | 'general' | 'complaint' | 'feature_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  conversationId?: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'support' | 'admin';
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  isInternal: boolean;
  createdAt: string;
}

export interface CreateMessageRequest {
  conversationId?: string;
  recipientId?: string;
  content: string;
  type?: Message['type'];
  attachments?: File[];
}

export interface CreateConversationRequest {
  type: Conversation['type'];
  title: string;
  participantIds: string[];
  initialMessage?: string;
  metadata?: Conversation['metadata'];
}

export interface CreateSupportTicketRequest {
  subject: string;
  description: string;
  category: SupportTicket['category'];
  priority: SupportTicket['priority'];
  attachments?: File[];
  metadata?: {
    bookingId?: string;
    propertyId?: string;
    experienceId?: string;
    url?: string;
    userAgent?: string;
  };
}

export interface UpdateSupportTicketRequest {
  subject?: string;
  description?: string;
  category?: SupportTicket['category'];
  priority?: SupportTicket['priority'];
  status?: SupportTicket['status'];
  assignedToId?: string;
  tags?: string[];
}

export interface TicketReplyRequest {
  ticketId: string;
  content: string;
  attachments?: File[];
  isInternal?: boolean;
}

// API Response Types
export type MessagesResponse = ApiResponse<PaginatedResponse<Message>>;
export type MessageDetailsResponse = ApiResponse<Message>;
export type ConversationsResponse = ApiResponse<PaginatedResponse<Conversation>>;
export type ConversationDetailsResponse = ApiResponse<Conversation>;
export type SupportTicketsResponse = ApiResponse<PaginatedResponse<SupportTicket>>;
export type SupportTicketDetailsResponse = ApiResponse<SupportTicket>;
export type CreateSupportTicketResponse = ApiResponse<SupportTicket>;
export type TicketRepliesResponse = ApiResponse<PaginatedResponse<TicketReply>>;
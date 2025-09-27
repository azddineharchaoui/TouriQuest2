"""
Messages API endpoints for comprehensive communication system
Handles messaging interface, conversation management, and message operations
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import desc, and_, or_

from app.core.database import get_db
from app.models.message_models import Message, Conversation, MessageStatus, MessageType, ConversationType
from app.services.message_service import message_service
from app.services.notification_service import notification_service
from app.core.auth import get_current_user
from app.core.permissions import require_permissions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/messages", tags=["messages"])
security = HTTPBearer()


# Pydantic models for request/response
class MessageCreateRequest(BaseModel):
    """Request model for creating a new message"""
    conversation_id: str
    content: str
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None
    scheduled_for: Optional[datetime] = None


class MessageUpdateRequest(BaseModel):
    """Request model for updating a message"""
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    """Response model for message data"""
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str]
    content: str
    message_type: MessageType
    status: MessageStatus
    reply_to_id: Optional[str]
    reply_to_content: Optional[str]
    attachments: List[Dict[str, Any]]
    reactions: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime]
    is_edited: bool
    edit_count: int

    class Config:
        from_attributes = True


class MessagesListResponse(BaseModel):
    """Response model for messages list"""
    messages: List[MessageResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[str]


class MessageSearchRequest(BaseModel):
    """Request model for message search"""
    query: str
    conversation_ids: Optional[List[str]] = None
    sender_ids: Optional[List[str]] = None
    message_types: Optional[List[MessageType]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_metadata: bool = False


class MessageReactionRequest(BaseModel):
    """Request model for message reactions"""
    reaction: str  # emoji or reaction type
    action: str = Field(..., regex="^(add|remove)$")


class MessageThreadResponse(BaseModel):
    """Response model for message thread"""
    original_message: MessageResponse
    replies: List[MessageResponse]
    total_replies: int


@router.get("/", response_model=MessagesListResponse)
async def get_messages(
    conversation_id: Optional[str] = Query(None, description="Filter by conversation ID"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to return"),
    include_read: bool = Query(True, description="Include read messages"),
    message_type: Optional[MessageType] = Query(None, description="Filter by message type"),
    search_query: Optional[str] = Query(None, description="Search in message content"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get user messages with advanced filtering and pagination
    
    Features:
    - Conversation-based filtering
    - Cursor-based pagination for performance
    - Message type filtering (text, image, file, etc.)
    - Content search with full-text search
    - Read status filtering
    - Rich metadata inclusion
    """
    try:
        # Build query filters
        filters = {
            "user_id": current_user.id,
            "conversation_id": conversation_id,
            "cursor": cursor,
            "limit": limit,
            "include_read": include_read,
            "message_type": message_type,
            "search_query": search_query
        }
        
        # Get messages with service layer
        result = await message_service.get_user_messages(db, **filters)
        
        return MessagesListResponse(
            messages=[MessageResponse.from_orm(msg) for msg in result["messages"]],
            total_count=result["total_count"],
            has_more=result["has_more"],
            next_cursor=result["next_cursor"]
        )
        
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )


@router.post("/", response_model=MessageResponse)
async def create_message(
    message_data: MessageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send a new message in a conversation
    
    Features:
    - Rich content support (text, media, files)
    - Reply threading with context
    - Message scheduling for later delivery
    - Attachment handling with validation
    - Real-time delivery via WebSocket
    - Automatic read receipts
    """
    try:
        # Validate conversation access
        conversation = await message_service.get_conversation_by_id(
            db, message_data.conversation_id, current_user.id
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Create message
        message_dict = message_data.dict()
        message_dict["sender_id"] = current_user.id
        
        message = await message_service.create_message(db, message_dict)
        
        # Send real-time notifications
        await message_service.notify_message_sent(message, current_user)
        
        return MessageResponse.from_orm(message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed message information
    
    Features:
    - Full message content and metadata
    - Attachment details with download URLs
    - Reply context and threading
    - Read receipts and delivery status
    - Reaction counts and user lists
    """
    try:
        message = await message_service.get_message_by_id(
            db, message_id, current_user.id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        # Mark as read if not already
        await message_service.mark_message_read(db, message_id, current_user.id)
        
        return MessageResponse.from_orm(message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting message {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve message"
        )


@router.put("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    message_data: MessageUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update message content (edit message)
    
    Features:
    - Content editing with history tracking
    - Edit timestamp and version tracking
    - Permission validation (sender only)
    - Real-time edit notifications
    - Metadata updates
    """
    try:
        # Validate message ownership
        message = await message_service.get_message_by_id(
            db, message_id, current_user.id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        if message.sender_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own messages"
            )
        
        # Update message
        updated_message = await message_service.update_message(
            db, message_id, message_data.dict(exclude_unset=True)
        )
        
        # Notify about edit
        await message_service.notify_message_edited(updated_message, current_user)
        
        return MessageResponse.from_orm(updated_message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating message {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update message"
        )


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    soft_delete: bool = Query(True, description="Soft delete (hide) vs hard delete"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete a message
    
    Features:
    - Soft delete (hide message) or hard delete
    - Permission validation (sender or admin)
    - Cascade deletion for replies
    - Real-time deletion notifications
    """
    try:
        # Validate message ownership or admin permission
        message = await message_service.get_message_by_id(
            db, message_id, current_user.id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        if message.sender_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own messages"
            )
        
        # Delete message
        await message_service.delete_message(db, message_id, soft_delete)
        
        # Notify about deletion
        await message_service.notify_message_deleted(message, current_user)
        
        return {"message": "Message deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message"
        )


@router.post("/{message_id}/react", response_model=Dict[str, Any])
async def add_reaction(
    message_id: str,
    reaction_data: MessageReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Add or remove reaction to a message
    
    Features:
    - Emoji reactions with custom emojis
    - Reaction aggregation and counts
    - User reaction tracking
    - Real-time reaction updates
    """
    try:
        # Validate message exists and user has access
        message = await message_service.get_message_by_id(
            db, message_id, current_user.id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        # Add/remove reaction
        if reaction_data.action == "add":
            result = await message_service.add_reaction(
                db, message_id, current_user.id, reaction_data.reaction
            )
        else:
            result = await message_service.remove_reaction(
                db, message_id, current_user.id, reaction_data.reaction
            )
        
        # Notify about reaction
        await message_service.notify_reaction_changed(
            message, current_user, reaction_data.reaction, reaction_data.action
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling reaction for message {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to handle reaction"
        )


@router.get("/{message_id}/thread", response_model=MessageThreadResponse)
async def get_message_thread(
    message_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get message thread (replies to a message)
    
    Features:
    - Threaded replies with nesting
    - Pagination for large threads
    - Reply count and metadata
    - Context preservation
    """
    try:
        thread = await message_service.get_message_thread(
            db, message_id, current_user.id, limit
        )
        
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message thread not found or access denied"
            )
        
        return MessageThreadResponse(
            original_message=MessageResponse.from_orm(thread["original_message"]),
            replies=[MessageResponse.from_orm(reply) for reply in thread["replies"]],
            total_replies=thread["total_replies"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting message thread {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve message thread"
        )


@router.post("/search", response_model=MessagesListResponse)
async def search_messages(
    search_data: MessageSearchRequest,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Advanced message search
    
    Features:
    - Full-text search across message content
    - Multi-criteria filtering (date, type, sender, conversation)
    - Relevance scoring and ranking
    - Metadata search capabilities
    - Search result highlighting
    """
    try:
        search_filters = search_data.dict()
        search_filters.update({
            "user_id": current_user.id,
            "limit": limit,
            "offset": offset
        })
        
        results = await message_service.search_messages(db, **search_filters)
        
        return MessagesListResponse(
            messages=[MessageResponse.from_orm(msg) for msg in results["messages"]],
            total_count=results["total_count"],
            has_more=results["has_more"],
            next_cursor=None  # Search doesn't use cursor pagination
        )
        
    except Exception as e:
        logger.error(f"Error searching messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search messages"
        )


@router.post("/{message_id}/forward")
async def forward_message(
    message_id: str,
    conversation_ids: List[str] = Body(...),
    comment: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Forward message to other conversations
    
    Features:
    - Multi-conversation forwarding
    - Optional forwarding comment
    - Permission validation for target conversations
    - Forwarding history tracking
    """
    try:
        # Validate original message access
        message = await message_service.get_message_by_id(
            db, message_id, current_user.id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        # Forward message
        result = await message_service.forward_message(
            db, message_id, conversation_ids, current_user.id, comment
        )
        
        return {
            "message": "Message forwarded successfully",
            "forwarded_to": result["forwarded_conversations"],
            "failed": result["failed_conversations"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forwarding message {message_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to forward message"
        )


@router.put("/mark-read")
async def mark_messages_read(
    message_ids: List[str] = Body(...),
    conversation_id: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark multiple messages or entire conversation as read
    
    Features:
    - Bulk message marking
    - Conversation-level read marking
    - Read receipt notifications
    - Unread count updates
    """
    try:
        if conversation_id:
            # Mark entire conversation as read
            result = await message_service.mark_conversation_read(
                db, conversation_id, current_user.id
            )
        else:
            # Mark specific messages as read
            result = await message_service.mark_messages_read(
                db, message_ids, current_user.id
            )
        
        return {
            "message": "Messages marked as read",
            "marked_count": result["marked_count"]
        }
        
    except Exception as e:
        logger.error(f"Error marking messages as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark messages as read"
        )


@router.get("/statistics", response_model=Dict[str, Any])
async def get_message_statistics(
    conversation_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get messaging statistics and analytics
    
    Features:
    - Message count trends over time
    - Conversation activity metrics
    - Response time analytics
    - Message type distribution
    - Engagement statistics
    """
    try:
        stats = await message_service.get_message_statistics(
            db, current_user.id, conversation_id, days
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting message statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve message statistics"
        )
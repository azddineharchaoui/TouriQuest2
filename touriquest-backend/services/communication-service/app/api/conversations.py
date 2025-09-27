"""
Conversations API endpoints for conversation management
Handles conversation creation, management, and participant operations
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.conversation_models import Conversation, ConversationType, ConversationStatus, Participant, ParticipantRole
from app.services.conversation_service import conversation_service
from app.services.message_service import message_service
from app.core.auth import get_current_user
from app.core.permissions import require_permissions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])
security = HTTPBearer()


# Pydantic models
class ConversationCreateRequest(BaseModel):
    """Request model for creating a conversation"""
    title: Optional[str] = None
    description: Optional[str] = None
    conversation_type: ConversationType = ConversationType.PRIVATE
    participant_ids: List[str] = Field(default_factory=list)
    is_group: bool = False
    settings: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ConversationUpdateRequest(BaseModel):
    """Request model for updating a conversation"""
    title: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ParticipantResponse(BaseModel):
    """Response model for conversation participant"""
    user_id: str
    username: str
    display_name: str
    avatar_url: Optional[str]
    role: ParticipantRole
    joined_at: datetime
    last_read_at: Optional[datetime]
    is_online: bool
    is_typing: bool

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Response model for conversation data"""
    id: str
    title: Optional[str]
    description: Optional[str]
    conversation_type: ConversationType
    status: ConversationStatus
    is_group: bool
    participant_count: int
    creator_id: str
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str]
    last_message_sender: Optional[str]
    unread_count: int
    is_muted: bool
    is_pinned: bool
    settings: Dict[str, Any]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    # Participants (limited for list views, full for detail views)
    participants: List[ParticipantResponse]

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """Response model for conversations list"""
    conversations: List[ConversationResponse]
    total_count: int
    unread_total: int
    has_more: bool
    next_cursor: Optional[str]


class AddParticipantRequest(BaseModel):
    """Request model for adding participants"""
    user_ids: List[str]
    role: ParticipantRole = ParticipantRole.MEMBER
    send_notification: bool = True


class UpdateParticipantRequest(BaseModel):
    """Request model for updating participant"""
    role: Optional[ParticipantRole] = None
    permissions: Optional[List[str]] = None


@router.get("/", response_model=ConversationListResponse)
async def get_conversations(
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Number of conversations to return"),
    conversation_type: Optional[ConversationType] = Query(None, description="Filter by conversation type"),
    include_archived: bool = Query(False, description="Include archived conversations"),
    search_query: Optional[str] = Query(None, description="Search in conversation titles"),
    unread_only: bool = Query(False, description="Show only conversations with unread messages"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get user's conversations with filtering and pagination
    
    Features:
    - Real-time unread count updates
    - Conversation type filtering (direct, group, support)
    - Search across conversation titles and descriptions
    - Archived conversation handling
    - Cursor-based pagination for performance
    - Last message preview with sender info
    - Online status and typing indicators
    """
    try:
        filters = {
            "user_id": current_user.id,
            "cursor": cursor,
            "limit": limit,
            "conversation_type": conversation_type,
            "include_archived": include_archived,
            "search_query": search_query,
            "unread_only": unread_only
        }
        
        result = await conversation_service.get_user_conversations(db, **filters)
        
        return ConversationListResponse(
            conversations=[ConversationResponse.from_orm(conv) for conv in result["conversations"]],
            total_count=result["total_count"],
            unread_total=result["unread_total"],
            has_more=result["has_more"],
            next_cursor=result["next_cursor"]
        )
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )


@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new conversation
    
    Features:
    - Direct message (1-on-1) conversations
    - Group conversations with multiple participants
    - Support ticket conversations
    - Custom conversation settings and metadata
    - Automatic participant notifications
    - Smart conversation title generation
    """
    try:
        # Validate participants exist
        if conversation_data.participant_ids:
            valid_participants = await conversation_service.validate_participants(
                db, conversation_data.participant_ids
            )
            if len(valid_participants) != len(conversation_data.participant_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Some participants were not found"
                )
        
        # Create conversation
        conversation_dict = conversation_data.dict()
        conversation_dict["creator_id"] = current_user.id
        
        # Auto-add creator as admin participant
        if current_user.id not in conversation_dict["participant_ids"]:
            conversation_dict["participant_ids"].append(current_user.id)
        
        conversation = await conversation_service.create_conversation(db, conversation_dict)
        
        # Send notifications to participants
        await conversation_service.notify_conversation_created(conversation, current_user)
        
        return ConversationResponse.from_orm(conversation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    include_messages: bool = Query(False, description="Include recent messages"),
    message_limit: int = Query(20, ge=1, le=100, description="Number of messages to include"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed conversation information
    
    Features:
    - Full participant list with roles and status
    - Conversation settings and permissions
    - Optional recent message inclusion
    - Real-time online status
    - Typing indicators
    - Message count and read receipts
    """
    try:
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id, include_messages, message_limit
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Update user's last seen timestamp
        await conversation_service.update_last_seen(db, conversation_id, current_user.id)
        
        return ConversationResponse.from_orm(conversation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation"
        )


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    conversation_data: ConversationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update conversation details
    
    Features:
    - Title and description updates
    - Settings and permissions management
    - Metadata updates
    - Admin permission validation
    - Change notifications to participants
    """
    try:
        # Validate user has permission to update
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is admin or creator
        is_admin = await conversation_service.is_conversation_admin(
            db, conversation_id, current_user.id
        )
        
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this conversation"
            )
        
        # Update conversation
        updated_conversation = await conversation_service.update_conversation(
            db, conversation_id, conversation_data.dict(exclude_unset=True)
        )
        
        # Notify participants about changes
        await conversation_service.notify_conversation_updated(
            updated_conversation, current_user
        )
        
        return ConversationResponse.from_orm(updated_conversation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update conversation"
        )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    archive_only: bool = Query(True, description="Archive instead of permanent delete"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete or archive a conversation
    
    Features:
    - Soft delete (archive) vs hard delete
    - Creator/admin permission validation
    - Participant notifications
    - Message cleanup handling
    """
    try:
        # Validate conversation exists and user has permission
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check permissions (creator or admin)
        if conversation.creator_id != current_user.id:
            is_admin = await conversation_service.is_conversation_admin(
                db, conversation_id, current_user.id
            )
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this conversation"
                )
        
        # Delete/archive conversation
        await conversation_service.delete_conversation(
            db, conversation_id, archive_only, current_user.id
        )
        
        # Notify participants
        await conversation_service.notify_conversation_deleted(conversation, current_user)
        
        action = "archived" if archive_only else "deleted"
        return {"message": f"Conversation {action} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )


@router.post("/{conversation_id}/participants", response_model=List[ParticipantResponse])
async def add_participants(
    conversation_id: str,
    participant_data: AddParticipantRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Add participants to a conversation
    
    Features:
    - Bulk participant addition
    - Role assignment (member, moderator, admin)
    - Permission validation
    - Notification to new and existing participants
    - Duplicate prevention
    """
    try:
        # Validate conversation and permissions
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user can add participants
        can_add = await conversation_service.can_add_participants(
            db, conversation_id, current_user.id
        )
        
        if not can_add:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add participants"
            )
        
        # Add participants
        added_participants = await conversation_service.add_participants(
            db, conversation_id, participant_data.user_ids, 
            participant_data.role, current_user.id
        )
        
        # Send notifications if requested
        if participant_data.send_notification:
            await conversation_service.notify_participants_added(
                conversation, added_participants, current_user
            )
        
        return [ParticipantResponse.from_orm(p) for p in added_participants]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding participants to {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add participants"
        )


@router.get("/{conversation_id}/participants", response_model=List[ParticipantResponse])
async def get_participants(
    conversation_id: str,
    include_offline: bool = Query(True, description="Include offline participants"),
    role_filter: Optional[ParticipantRole] = Query(None, description="Filter by role"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get conversation participants
    
    Features:
    - Real-time online status
    - Role-based filtering
    - Participant permissions and roles
    - Join date and activity information
    """
    try:
        # Validate access to conversation
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Get participants
        participants = await conversation_service.get_participants(
            db, conversation_id, include_offline, role_filter
        )
        
        return [ParticipantResponse.from_orm(p) for p in participants]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting participants for {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve participants"
        )


@router.put("/{conversation_id}/participants/{user_id}")
async def update_participant(
    conversation_id: str,
    user_id: str,
    participant_data: UpdateParticipantRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update participant role and permissions
    
    Features:
    - Role changes (promote/demote)
    - Permission management
    - Admin permission validation
    - Change notifications
    """
    try:
        # Validate permissions
        is_admin = await conversation_service.is_conversation_admin(
            db, conversation_id, current_user.id
        )
        
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update participants"
            )
        
        # Update participant
        updated_participant = await conversation_service.update_participant(
            db, conversation_id, user_id, participant_data.dict(exclude_unset=True)
        )
        
        if not updated_participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Notify about role change
        await conversation_service.notify_participant_updated(
            conversation_id, updated_participant, current_user
        )
        
        return {"message": "Participant updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating participant {user_id} in {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update participant"
        )


@router.delete("/{conversation_id}/participants/{user_id}")
async def remove_participant(
    conversation_id: str,
    user_id: str,
    send_notification: bool = Query(True, description="Send notification to removed user"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Remove participant from conversation
    
    Features:
    - Admin permission validation
    - Self-removal (leave conversation)
    - Notification to removed user and remaining participants
    - Creator protection (can't be removed)
    """
    try:
        # Allow self-removal or require admin permission
        if user_id != current_user.id:
            is_admin = await conversation_service.is_conversation_admin(
                db, conversation_id, current_user.id
            )
            
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to remove participants"
                )
        
        # Check if trying to remove creator
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if conversation and conversation.creator_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove conversation creator"
            )
        
        # Remove participant
        removed = await conversation_service.remove_participant(
            db, conversation_id, user_id
        )
        
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Send notifications
        if send_notification:
            await conversation_service.notify_participant_removed(
                conversation_id, user_id, current_user
            )
        
        action = "left" if user_id == current_user.id else "removed"
        return {"message": f"Participant {action} conversation successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing participant {user_id} from {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove participant"
        )


@router.post("/{conversation_id}/mute")
async def mute_conversation(
    conversation_id: str,
    mute_until: Optional[datetime] = Body(None, description="Mute until specific time, null for indefinite"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mute/unmute conversation notifications
    
    Features:
    - Temporary or permanent muting
    - Personal mute settings (doesn't affect others)
    - Scheduled unmuting
    """
    try:
        # Validate conversation access
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Toggle mute status
        await conversation_service.toggle_mute(
            db, conversation_id, current_user.id, mute_until
        )
        
        action = "muted" if mute_until != False else "unmuted"
        return {"message": f"Conversation {action} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error muting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mute conversation"
        )


@router.post("/{conversation_id}/pin")
async def toggle_pin_conversation(
    conversation_id: str,
    pinned: bool = Body(..., description="Pin or unpin conversation"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Pin/unpin conversation for user
    
    Features:
    - Personal pinning (doesn't affect other users)
    - Pinned conversations appear at top of list
    - Pin limit enforcement
    """
    try:
        # Validate conversation access
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Toggle pin status
        await conversation_service.toggle_pin(
            db, conversation_id, current_user.id, pinned
        )
        
        action = "pinned" if pinned else "unpinned"
        return {"message": f"Conversation {action} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pinning conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pin conversation"
        )


@router.get("/{conversation_id}/typing", response_model=List[Dict[str, Any]])
async def get_typing_users(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get users currently typing in conversation
    
    Features:
    - Real-time typing indicators
    - Typing timeout handling
    - Exclude current user from results
    """
    try:
        # Validate conversation access
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Get typing users
        typing_users = await conversation_service.get_typing_users(
            db, conversation_id, exclude_user_id=current_user.id
        )
        
        return typing_users
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting typing users for {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get typing users"
        )


@router.post("/{conversation_id}/typing")
async def update_typing_status(
    conversation_id: str,
    is_typing: bool = Body(..., description="Whether user is currently typing"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update user's typing status in conversation
    
    Features:
    - Real-time typing indicator broadcasts
    - Automatic timeout handling
    - Throttling to prevent spam
    """
    try:
        # Validate conversation access
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, current_user.id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        
        # Update typing status
        await conversation_service.update_typing_status(
            db, conversation_id, current_user.id, is_typing
        )
        
        return {"message": "Typing status updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating typing status for {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update typing status"
        )
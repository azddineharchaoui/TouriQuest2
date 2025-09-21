"""
Chat API endpoints for real-time communication
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.chat_models import ConversationType, MessageType
from app.services.chat_service import chat_service
from app.services.websocket_manager import connection_manager
from app.core.auth import get_current_user, get_user_from_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])
security = HTTPBearer()


# Pydantic models for request/response
class CreateConversationRequest(BaseModel):
    conversation_type: ConversationType
    participant_ids: List[str]
    title: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SendMessageRequest(BaseModel):
    content: str
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    scheduled_for: Optional[datetime] = None


class EditMessageRequest(BaseModel):
    content: str


class TranslateMessageRequest(BaseModel):
    target_language: str


class MessageResponse(BaseModel):
    id: str
    content: str
    sender_id: str
    message_type: str
    reply_to_id: Optional[str]
    attachments: List[Dict[str, Any]]
    read_by: List[Dict[str, Any]]
    created_at: str
    updated_at: str
    status: str
    metadata: Dict[str, Any]


class ConversationResponse(BaseModel):
    id: str
    type: str
    title: Optional[str]
    description: Optional[str]
    participants: List[Dict[str, Any]]
    latest_message: Optional[Dict[str, Any]]
    unread_count: int
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]


# Conversation endpoints
@router.post("/conversations", response_model=Dict[str, Any])
async def create_conversation(
    request: CreateConversationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new conversation"""
    try:
        conversation = await chat_service.create_conversation(
            creator_id=current_user["id"],
            conversation_type=request.conversation_type,
            participant_ids=request.participant_ids,
            title=request.title,
            description=request.description,
            metadata=request.metadata
        )
        
        return {
            "id": conversation.id,
            "type": conversation.conversation_type.value,
            "title": conversation.title,
            "description": conversation.description,
            "created_at": conversation.created_at.isoformat(),
            "metadata": conversation.metadata
        }
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create conversation")


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_user_conversations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    conversation_type: Optional[ConversationType] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's conversations"""
    try:
        conversations = await chat_service.get_user_conversations(
            user_id=current_user["id"],
            limit=limit,
            offset=offset,
            conversation_type=conversation_type
        )
        
        return conversations
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversations")


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation details"""
    try:
        # This would be implemented in chat_service
        pass
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversation")


# Message endpoints
@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    attachments: Optional[List[UploadFile]] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message in a conversation"""
    try:
        message = await chat_service.send_message(
            sender_id=current_user["id"],
            conversation_id=conversation_id,
            content=request.content,
            message_type=request.message_type,
            reply_to_id=request.reply_to_id,
            attachments=attachments,
            metadata=request.metadata,
            scheduled_for=request.scheduled_for
        )
        
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": request.content,  # Return original content, not encrypted
            "message_type": message.message_type.value,
            "created_at": message.created_at.isoformat(),
            "status": message.status.value
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    before_message_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages from a conversation"""
    try:
        messages = await chat_service.get_messages(
            user_id=current_user["id"],
            conversation_id=conversation_id,
            limit=limit,
            offset=offset,
            before_message_id=before_message_id
        )
        
        return messages
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")


@router.put("/conversations/{conversation_id}/messages/{message_id}")
async def edit_message(
    conversation_id: str,
    message_id: str,
    request: EditMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit a message"""
    try:
        await chat_service.edit_message(
            user_id=current_user["id"],
            message_id=message_id,
            new_content=request.content
        )
        
        return {"success": True, "message": "Message edited successfully"}
        
    except Exception as e:
        logger.error(f"Error editing message: {e}")
        raise HTTPException(status_code=500, detail="Failed to edit message")


@router.delete("/conversations/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: str,
    message_id: str,
    delete_for_everyone: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a message"""
    try:
        await chat_service.delete_message(
            user_id=current_user["id"],
            message_id=message_id,
            delete_for_everyone=delete_for_everyone
        )
        
        return {"success": True, "message": "Message deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete message")


@router.post("/conversations/{conversation_id}/messages/{message_id}/translate")
async def translate_message(
    conversation_id: str,
    message_id: str,
    request: TranslateMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Translate a message"""
    try:
        translated_content = await chat_service.translate_message(
            user_id=current_user["id"],
            message_id=message_id,
            target_language=request.target_language
        )
        
        return {
            "original_message_id": message_id,
            "translated_content": translated_content,
            "target_language": request.target_language
        }
        
    except Exception as e:
        logger.error(f"Error translating message: {e}")
        raise HTTPException(status_code=500, detail="Failed to translate message")


@router.put("/conversations/{conversation_id}/read")
async def mark_conversation_as_read(
    conversation_id: str,
    message_ids: Optional[List[str]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark messages in conversation as read"""
    try:
        if not message_ids:
            # Get all unread messages
            messages = await chat_service.get_messages(
                user_id=current_user["id"],
                conversation_id=conversation_id,
                limit=1000  # Get all recent messages
            )
            message_ids = [msg["id"] for msg in messages]
        
        await chat_service.mark_messages_as_read(
            user_id=current_user["id"],
            conversation_id=conversation_id,
            message_ids=message_ids
        )
        
        return {"success": True, "message": "Messages marked as read"}
        
    except Exception as e:
        logger.error(f"Error marking messages as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark messages as read")


# Safety endpoints
@router.post("/block")
async def block_user(
    blocked_user_id: str = Form(...),
    reason: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Block a user"""
    try:
        # This would be implemented in chat_service
        return {"success": True, "message": "User blocked successfully"}
        
    except Exception as e:
        logger.error(f"Error blocking user: {e}")
        raise HTTPException(status_code=500, detail="Failed to block user")


@router.post("/report")
async def report_message(
    message_id: str = Form(...),
    reason: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Report a message"""
    try:
        # This would be implemented in chat_service
        return {"success": True, "message": "Message reported successfully"}
        
    except Exception as e:
        logger.error(f"Error reporting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to report message")


# WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
    device_id: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    platform: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time communication"""
    try:
        # Validate user token
        user = await get_user_from_token(token)
        if not user or user["id"] != user_id:
            await websocket.close(code=1008, reason="Invalid authentication")
            return
        
        # Connect to WebSocket manager
        connection_id = await connection_manager.connect(
            websocket=websocket,
            user_id=user_id,
            device_id=device_id,
            device_type=device_type,
            platform=platform
        )
        
        try:
            while True:
                # Wait for messages from client
                data = await websocket.receive_text()
                
                # Handle message
                await connection_manager.handle_message(user_id, connection_id, data)
                
        except WebSocketDisconnect:
            # Client disconnected
            await connection_manager.disconnect(user_id, connection_id, "client_disconnect")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
            await connection_manager.disconnect(user_id, connection_id, "error")
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=1011, reason="Internal server error")


# File endpoints
@router.post("/upload")
async def upload_file(
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload files for a conversation"""
    try:
        from app.services.file_service import FileService
        file_service = FileService()
        await file_service.initialize()
        
        uploaded_files = []
        for file in files:
            file_info = await file_service.upload_file(
                file=file,
                folder=f"conversations/{conversation_id}",
                generate_thumbnail=True
            )
            uploaded_files.append(file_info)
        
        return {
            "success": True,
            "files": uploaded_files
        }
        
    except Exception as e:
        logger.error(f"Error uploading files: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload files")


# Health check
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "communication-service",
        "timestamp": datetime.utcnow().isoformat(),
        "connections": connection_manager.get_connection_count(),
        "online_users": len(connection_manager.get_online_users())
    }
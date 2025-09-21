"""
Chat messaging service with encryption, delivery tracking, and conversation management
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union, Tuple
import json
import logging
from pathlib import Path
import hashlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, UploadFile
import redis.asyncio as redis
from celery import current_app as celery_app

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.chat_models import (
    Conversation, Message, MessageRead, MessageDelivery, MessageAttachment,
    ConversationType, MessageType, MessageStatus, User, BlockedUser,
    conversation_participants, ScheduledMessage, MessageTemplate
)
from app.services.websocket_manager import connection_manager, WebSocketMessage
from app.services.file_service import FileService
from app.services.notification_service import NotificationService
from app.services.translation_service import TranslationService

logger = logging.getLogger(__name__)


class MessageEncryption:
    """Message encryption service"""
    
    def __init__(self):
        self.master_key = settings.MESSAGE_ENCRYPTION_KEY.encode()
    
    def _derive_key(self, conversation_id: str) -> bytes:
        """Derive encryption key for a conversation"""
        salt = conversation_id.encode()[:16].ljust(16, b'0')
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(self.master_key))
    
    def encrypt_message(self, message: str, conversation_id: str) -> str:
        """Encrypt a message for a conversation"""
        try:
            key = self._derive_key(conversation_id)
            fernet = Fernet(key)
            encrypted = fernet.encrypt(message.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Error encrypting message: {e}")
            raise
    
    def decrypt_message(self, encrypted_message: str, conversation_id: str) -> str:
        """Decrypt a message for a conversation"""
        try:
            key = self._derive_key(conversation_id)
            fernet = Fernet(key)
            encrypted_data = base64.b64decode(encrypted_message.encode())
            decrypted = fernet.decrypt(encrypted_data)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Error decrypting message: {e}")
            raise


class MessageQueue:
    """Message queue for reliable delivery"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis_client = redis.from_url(settings.redis_url_complete)
    
    async def enqueue_message(self, message_id: str, recipients: List[str], priority: str = "normal"):
        """Queue message for delivery"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            queue_name = f"message_queue_{priority}"
            message_data = {
                "message_id": message_id,
                "recipients": recipients,
                "queued_at": datetime.utcnow().isoformat(),
                "priority": priority
            }
            
            await self.redis_client.lpush(queue_name, json.dumps(message_data))
            
        except Exception as e:
            logger.error(f"Error queuing message: {e}")
    
    async def dequeue_message(self, priority: str = "normal") -> Optional[Dict[str, Any]]:
        """Dequeue message for delivery"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            queue_name = f"message_queue_{priority}"
            message_data = await self.redis_client.brpop([queue_name], timeout=1)
            
            if message_data:
                return json.loads(message_data[1])
            return None
            
        except Exception as e:
            logger.error(f"Error dequeuing message: {e}")
            return None


class ChatService:
    """Main chat service for messaging operations"""
    
    def __init__(self):
        self.encryption = MessageEncryption()
        self.message_queue = MessageQueue()
        self.file_service = FileService()
        self.notification_service = NotificationService()
        self.translation_service = TranslationService()
        self.redis_client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize the chat service"""
        await self.message_queue.initialize()
        await self.file_service.initialize()
        await self.notification_service.initialize()
        await self.translation_service.initialize()
        
        self.redis_client = redis.from_url(settings.redis_url_complete)
    
    # Conversation Management
    
    async def create_conversation(
        self,
        creator_id: str,
        conversation_type: ConversationType,
        participant_ids: List[str],
        title: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Conversation:
        """Create a new conversation"""
        async with AsyncSessionLocal() as session:
            try:
                # Validate participants exist and are not blocked
                await self._validate_participants(session, creator_id, participant_ids)
                
                # Create conversation
                conversation = Conversation(
                    id=str(uuid.uuid4()),
                    creator_id=creator_id,
                    conversation_type=conversation_type,
                    title=title,
                    description=description,
                    metadata=metadata or {},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                session.add(conversation)
                await session.flush()  # Get the conversation ID
                
                # Add participants
                all_participants = list(set([creator_id] + participant_ids))
                for participant_id in all_participants:
                    stmt = conversation_participants.insert().values(
                        conversation_id=conversation.id,
                        user_id=participant_id,
                        joined_at=datetime.utcnow(),
                        is_active=True
                    )
                    await session.execute(stmt)
                
                await session.commit()
                
                # Send notifications to participants
                await self._notify_conversation_created(conversation, all_participants)
                
                # Send WebSocket notifications
                for participant_id in participant_ids:
                    if participant_id != creator_id:
                        await connection_manager.send_to_user(
                            participant_id,
                            WebSocketMessage(
                                type="conversation_created",
                                data={
                                    "conversation_id": conversation.id,
                                    "creator_id": creator_id,
                                    "type": conversation_type.value,
                                    "title": title,
                                    "participants": all_participants
                                },
                                timestamp=datetime.utcnow(),
                                conversation_id=conversation.id
                            )
                        )
                
                return conversation
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error creating conversation: {e}")
                raise HTTPException(status_code=500, detail="Failed to create conversation")
    
    async def get_user_conversations(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        conversation_type: Optional[ConversationType] = None
    ) -> List[Dict[str, Any]]:
        """Get user's conversations with latest messages"""
        async with AsyncSessionLocal() as session:
            try:
                # Base query
                stmt = (
                    select(Conversation)
                    .join(conversation_participants)
                    .where(
                        and_(
                            conversation_participants.c.user_id == user_id,
                            conversation_participants.c.is_active == True
                        )
                    )
                    .options(selectinload(Conversation.messages))
                )
                
                # Add type filter if specified
                if conversation_type:
                    stmt = stmt.where(Conversation.conversation_type == conversation_type)
                
                # Order by last message time
                stmt = stmt.order_by(desc(Conversation.updated_at))
                
                # Add pagination
                stmt = stmt.limit(limit).offset(offset)
                
                result = await session.execute(stmt)
                conversations = result.unique().scalars().all()
                
                # Format response with latest message and unread count
                formatted_conversations = []
                for conversation in conversations:
                    # Get latest message
                    latest_message = None
                    if conversation.messages:
                        latest_message = max(conversation.messages, key=lambda m: m.created_at)
                    
                    # Get unread count
                    unread_count = await self._get_unread_count(session, conversation.id, user_id)
                    
                    # Get participants
                    participants = await self._get_conversation_participants_info(session, conversation.id)
                    
                    formatted_conversations.append({
                        "id": conversation.id,
                        "type": conversation.conversation_type.value,
                        "title": conversation.title,
                        "description": conversation.description,
                        "participants": participants,
                        "latest_message": {
                            "id": latest_message.id,
                            "content": await self._decrypt_message_content(latest_message, conversation.id),
                            "sender_id": latest_message.sender_id,
                            "created_at": latest_message.created_at.isoformat(),
                            "message_type": latest_message.message_type.value
                        } if latest_message else None,
                        "unread_count": unread_count,
                        "created_at": conversation.created_at.isoformat(),
                        "updated_at": conversation.updated_at.isoformat(),
                        "metadata": conversation.metadata
                    })
                
                return formatted_conversations
                
            except Exception as e:
                logger.error(f"Error getting user conversations: {e}")
                raise HTTPException(status_code=500, detail="Failed to get conversations")
    
    # Message Operations
    
    async def send_message(
        self,
        sender_id: str,
        conversation_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        reply_to_id: Optional[str] = None,
        attachments: Optional[List[UploadFile]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        scheduled_for: Optional[datetime] = None
    ) -> Message:
        """Send a message in a conversation"""
        async with AsyncSessionLocal() as session:
            try:
                # Validate sender has access to conversation
                await self._validate_conversation_access(session, conversation_id, sender_id)
                
                # Check if user is blocked
                await self._check_user_blocked(session, conversation_id, sender_id)
                
                # Create message
                message_id = str(uuid.uuid4())
                
                # Encrypt content if enabled
                encrypted_content = content
                if settings.CHAT_ENCRYPTION_ENABLED:
                    encrypted_content = self.encryption.encrypt_message(content, conversation_id)
                
                message = Message(
                    id=message_id,
                    conversation_id=conversation_id,
                    sender_id=sender_id,
                    content=encrypted_content,
                    message_type=message_type,
                    reply_to_id=reply_to_id,
                    metadata=metadata or {},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    status=MessageStatus.PENDING
                )
                
                session.add(message)
                await session.flush()
                
                # Handle attachments
                attachment_data = []
                if attachments:
                    for attachment in attachments:
                        file_info = await self.file_service.upload_file(
                            attachment,
                            f"messages/{message_id}",
                            allowed_types=settings.CHAT_ALLOWED_FILE_TYPES
                        )
                        
                        attachment_obj = MessageAttachment(
                            id=str(uuid.uuid4()),
                            message_id=message_id,
                            file_name=file_info["filename"],
                            file_size=file_info["size"],
                            file_type=file_info["type"],
                            file_url=file_info["url"],
                            created_at=datetime.utcnow()
                        )
                        
                        session.add(attachment_obj)
                        attachment_data.append({
                            "id": attachment_obj.id,
                            "filename": attachment_obj.file_name,
                            "size": attachment_obj.file_size,
                            "type": attachment_obj.file_type,
                            "url": attachment_obj.file_url
                        })
                
                # Handle scheduled messages
                if scheduled_for:
                    if scheduled_for <= datetime.utcnow():
                        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
                    
                    scheduled_message = ScheduledMessage(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        scheduled_for=scheduled_for,
                        created_at=datetime.utcnow()
                    )
                    session.add(scheduled_message)
                    message.status = MessageStatus.SCHEDULED
                else:
                    message.status = MessageStatus.SENT
                
                await session.commit()
                
                # If not scheduled, send immediately
                if not scheduled_for:
                    await self._deliver_message(message, attachment_data)
                else:
                    # Queue for scheduled delivery
                    await self._schedule_message_delivery(message_id, scheduled_for)
                
                return message
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error sending message: {e}")
                raise HTTPException(status_code=500, detail="Failed to send message")
    
    async def get_messages(
        self,
        user_id: str,
        conversation_id: str,
        limit: int = 50,
        offset: int = 0,
        before_message_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get messages from a conversation"""
        async with AsyncSessionLocal() as session:
            try:
                # Validate user access
                await self._validate_conversation_access(session, conversation_id, user_id)
                
                # Build query
                stmt = (
                    select(Message)
                    .where(Message.conversation_id == conversation_id)
                    .options(selectinload(Message.attachments))
                    .order_by(desc(Message.created_at))
                )
                
                # Add before_message_id filter for pagination
                if before_message_id:
                    before_message = await session.get(Message, before_message_id)
                    if before_message:
                        stmt = stmt.where(Message.created_at < before_message.created_at)
                
                stmt = stmt.limit(limit).offset(offset)
                
                result = await session.execute(stmt)
                messages = result.unique().scalars().all()
                
                # Format messages
                formatted_messages = []
                for message in messages:
                    # Decrypt content
                    content = await self._decrypt_message_content(message, conversation_id)
                    
                    # Get read status
                    read_by = await self._get_message_read_status(session, message.id)
                    
                    # Format attachments
                    attachments = [
                        {
                            "id": att.id,
                            "filename": att.file_name,
                            "size": att.file_size,
                            "type": att.file_type,
                            "url": att.file_url
                        }
                        for att in message.attachments
                    ]
                    
                    formatted_messages.append({
                        "id": message.id,
                        "content": content,
                        "sender_id": message.sender_id,
                        "message_type": message.message_type.value,
                        "reply_to_id": message.reply_to_id,
                        "attachments": attachments,
                        "read_by": read_by,
                        "created_at": message.created_at.isoformat(),
                        "updated_at": message.updated_at.isoformat(),
                        "status": message.status.value,
                        "metadata": message.metadata
                    })
                
                # Mark messages as read
                await self.mark_messages_as_read(user_id, conversation_id, [m["id"] for m in formatted_messages])
                
                return formatted_messages
                
            except Exception as e:
                logger.error(f"Error getting messages: {e}")
                raise HTTPException(status_code=500, detail="Failed to get messages")
    
    async def mark_messages_as_read(self, user_id: str, conversation_id: str, message_ids: List[str]):
        """Mark messages as read by user"""
        async with AsyncSessionLocal() as session:
            try:
                # Validate access
                await self._validate_conversation_access(session, conversation_id, user_id)
                
                # Mark messages as read
                for message_id in message_ids:
                    # Check if already read
                    existing_read = await session.execute(
                        select(MessageRead).where(
                            and_(
                                MessageRead.message_id == message_id,
                                MessageRead.user_id == user_id
                            )
                        )
                    )
                    
                    if not existing_read.scalar_one_or_none():
                        read_record = MessageRead(
                            message_id=message_id,
                            user_id=user_id,
                            read_at=datetime.utcnow()
                        )
                        session.add(read_record)
                
                await session.commit()
                
                # Send read receipts via WebSocket
                await self._send_read_receipts(conversation_id, user_id, message_ids)
                
            except Exception as e:
                logger.error(f"Error marking messages as read: {e}")
    
    async def delete_message(self, user_id: str, message_id: str, delete_for_everyone: bool = False):
        """Delete a message"""
        async with AsyncSessionLocal() as session:
            try:
                # Get message
                message = await session.get(Message, message_id)
                if not message:
                    raise HTTPException(status_code=404, detail="Message not found")
                
                # Validate permissions
                if delete_for_everyone and message.sender_id != user_id:
                    # Check if user is admin of the conversation
                    is_admin = await self._is_conversation_admin(session, message.conversation_id, user_id)
                    if not is_admin:
                        raise HTTPException(status_code=403, detail="Insufficient permissions")
                elif not delete_for_everyone and message.sender_id != user_id:
                    raise HTTPException(status_code=403, detail="Can only delete your own messages")
                
                if delete_for_everyone:
                    # Hard delete for everyone
                    message.status = MessageStatus.DELETED
                    message.content = "[Message deleted]"
                    message.updated_at = datetime.utcnow()
                else:
                    # Soft delete for user only
                    if not message.metadata:
                        message.metadata = {}
                    if "deleted_for" not in message.metadata:
                        message.metadata["deleted_for"] = []
                    message.metadata["deleted_for"].append(user_id)
                
                await session.commit()
                
                # Send WebSocket notification
                await connection_manager.send_to_conversation(
                    message.conversation_id,
                    WebSocketMessage(
                        type="message_deleted",
                        data={
                            "message_id": message_id,
                            "deleted_by": user_id,
                            "delete_for_everyone": delete_for_everyone
                        },
                        timestamp=datetime.utcnow(),
                        conversation_id=message.conversation_id
                    )
                )
                
            except Exception as e:
                logger.error(f"Error deleting message: {e}")
                raise HTTPException(status_code=500, detail="Failed to delete message")
    
    async def edit_message(self, user_id: str, message_id: str, new_content: str):
        """Edit a message"""
        async with AsyncSessionLocal() as session:
            try:
                # Get message
                message = await session.get(Message, message_id)
                if not message:
                    raise HTTPException(status_code=404, detail="Message not found")
                
                # Validate permissions
                if message.sender_id != user_id:
                    raise HTTPException(status_code=403, detail="Can only edit your own messages")
                
                # Check if message is too old to edit
                time_since_sent = datetime.utcnow() - message.created_at
                if time_since_sent > timedelta(minutes=settings.CHAT_EDIT_TIME_LIMIT):
                    raise HTTPException(status_code=400, detail="Message too old to edit")
                
                # Store original content in metadata
                if not message.metadata:
                    message.metadata = {}
                if "edit_history" not in message.metadata:
                    message.metadata["edit_history"] = []
                
                message.metadata["edit_history"].append({
                    "content": message.content,
                    "edited_at": message.updated_at.isoformat()
                })
                
                # Update content
                if settings.CHAT_ENCRYPTION_ENABLED:
                    message.content = self.encryption.encrypt_message(new_content, message.conversation_id)
                else:
                    message.content = new_content
                
                message.updated_at = datetime.utcnow()
                message.metadata["edited"] = True
                
                await session.commit()
                
                # Send WebSocket notification
                await connection_manager.send_to_conversation(
                    message.conversation_id,
                    WebSocketMessage(
                        type="message_edited",
                        data={
                            "message_id": message_id,
                            "new_content": new_content,
                            "edited_by": user_id,
                            "edited_at": message.updated_at.isoformat()
                        },
                        timestamp=datetime.utcnow(),
                        conversation_id=message.conversation_id,
                        message_id=message_id
                    )
                )
                
            except Exception as e:
                logger.error(f"Error editing message: {e}")
                raise HTTPException(status_code=500, detail="Failed to edit message")
    
    # Message Translation
    
    async def translate_message(self, user_id: str, message_id: str, target_language: str) -> str:
        """Translate a message to target language"""
        async with AsyncSessionLocal() as session:
            try:
                # Get message
                message = await session.get(Message, message_id)
                if not message:
                    raise HTTPException(status_code=404, detail="Message not found")
                
                # Validate access
                await self._validate_conversation_access(session, message.conversation_id, user_id)
                
                # Decrypt content
                content = await self._decrypt_message_content(message, message.conversation_id)
                
                # Translate
                translated_content = await self.translation_service.translate_text(
                    content, target_language
                )
                
                return translated_content
                
            except Exception as e:
                logger.error(f"Error translating message: {e}")
                raise HTTPException(status_code=500, detail="Failed to translate message")
    
    # Private helper methods
    
    async def _deliver_message(self, message: Message, attachments: List[Dict[str, Any]]):
        """Deliver message to all conversation participants"""
        try:
            async with AsyncSessionLocal() as session:
                # Get conversation participants
                participants = await self._get_conversation_participants(session, message.conversation_id)
                
                # Decrypt content for delivery
                content = await self._decrypt_message_content(message, message.conversation_id)
                
                # Send via WebSocket
                ws_message = WebSocketMessage(
                    type="new_message",
                    data={
                        "id": message.id,
                        "conversation_id": message.conversation_id,
                        "sender_id": message.sender_id,
                        "content": content,
                        "message_type": message.message_type.value,
                        "attachments": attachments,
                        "created_at": message.created_at.isoformat(),
                        "metadata": message.metadata
                    },
                    timestamp=message.created_at,
                    user_id=message.sender_id,
                    conversation_id=message.conversation_id,
                    message_id=message.id
                )
                
                # Send to each participant
                for participant_id in participants:
                    if participant_id != message.sender_id:
                        await connection_manager.send_to_user(participant_id, ws_message)
                        
                        # Queue for push notification if user is offline
                        if not connection_manager.is_user_online(participant_id):
                            await self.notification_service.send_message_notification(
                                participant_id,
                                message.sender_id,
                                content,
                                message.conversation_id
                            )
                
                # Update message status
                message.status = MessageStatus.DELIVERED
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error delivering message: {e}")
    
    async def _decrypt_message_content(self, message: Message, conversation_id: str) -> str:
        """Decrypt message content if encryption is enabled"""
        if settings.CHAT_ENCRYPTION_ENABLED:
            try:
                return self.encryption.decrypt_message(message.content, conversation_id)
            except Exception as e:
                logger.error(f"Error decrypting message {message.id}: {e}")
                return "[Decryption failed]"
        return message.content
    
    async def _validate_conversation_access(self, session: AsyncSession, conversation_id: str, user_id: str):
        """Validate user has access to conversation"""
        stmt = select(conversation_participants).where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == user_id,
                conversation_participants.c.is_active == True
            )
        )
        result = await session.execute(stmt)
        if not result.fetchone():
            raise HTTPException(status_code=403, detail="Access denied to conversation")
    
    async def _validate_participants(self, session: AsyncSession, creator_id: str, participant_ids: List[str]):
        """Validate participants exist and are not blocked"""
        all_users = [creator_id] + participant_ids
        
        # Check users exist
        stmt = select(User.id).where(User.id.in_(all_users))
        result = await session.execute(stmt)
        existing_users = [row[0] for row in result.fetchall()]
        
        missing_users = set(all_users) - set(existing_users)
        if missing_users:
            raise HTTPException(status_code=400, detail=f"Users not found: {missing_users}")
        
        # Check for blocked users
        for participant_id in participant_ids:
            blocked = await session.execute(
                select(BlockedUser).where(
                    or_(
                        and_(BlockedUser.blocker_id == creator_id, BlockedUser.blocked_id == participant_id),
                        and_(BlockedUser.blocker_id == participant_id, BlockedUser.blocked_id == creator_id)
                    )
                )
            )
            if blocked.scalar_one_or_none():
                raise HTTPException(status_code=400, detail=f"User {participant_id} is blocked")
    
    async def _check_user_blocked(self, session: AsyncSession, conversation_id: str, user_id: str):
        """Check if user is blocked in conversation"""
        participants = await self._get_conversation_participants(session, conversation_id)
        
        for participant_id in participants:
            if participant_id != user_id:
                blocked = await session.execute(
                    select(BlockedUser).where(
                        or_(
                            and_(BlockedUser.blocker_id == participant_id, BlockedUser.blocked_id == user_id),
                            and_(BlockedUser.blocker_id == user_id, BlockedUser.blocked_id == participant_id)
                        )
                    )
                )
                if blocked.scalar_one_or_none():
                    raise HTTPException(status_code=403, detail="User is blocked")
    
    async def _get_conversation_participants(self, session: AsyncSession, conversation_id: str) -> List[str]:
        """Get list of conversation participants"""
        stmt = select(conversation_participants.c.user_id).where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.is_active == True
            )
        )
        result = await session.execute(stmt)
        return [row[0] for row in result.fetchall()]
    
    async def _get_conversation_participants_info(self, session: AsyncSession, conversation_id: str) -> List[Dict[str, Any]]:
        """Get detailed info about conversation participants"""
        stmt = (
            select(User, conversation_participants.c.joined_at)
            .join(conversation_participants, User.id == conversation_participants.c.user_id)
            .where(
                and_(
                    conversation_participants.c.conversation_id == conversation_id,
                    conversation_participants.c.is_active == True
                )
            )
        )
        result = await session.execute(stmt)
        
        participants = []
        for user, joined_at in result.fetchall():
            participants.append({
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "joined_at": joined_at.isoformat(),
                "is_online": connection_manager.is_user_online(user.id)
            })
        
        return participants
    
    async def _get_unread_count(self, session: AsyncSession, conversation_id: str, user_id: str) -> int:
        """Get unread message count for user in conversation"""
        stmt = (
            select(func.count(Message.id))
            .outerjoin(
                MessageRead,
                and_(
                    MessageRead.message_id == Message.id,
                    MessageRead.user_id == user_id
                )
            )
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                    MessageRead.id.is_(None)
                )
            )
        )
        result = await session.execute(stmt)
        return result.scalar() or 0
    
    async def _get_message_read_status(self, session: AsyncSession, message_id: str) -> List[Dict[str, Any]]:
        """Get read status for a message"""
        stmt = (
            select(MessageRead.user_id, MessageRead.read_at)
            .where(MessageRead.message_id == message_id)
        )
        result = await session.execute(stmt)
        
        return [
            {
                "user_id": user_id,
                "read_at": read_at.isoformat()
            }
            for user_id, read_at in result.fetchall()
        ]
    
    async def _is_conversation_admin(self, session: AsyncSession, conversation_id: str, user_id: str) -> bool:
        """Check if user is admin of conversation"""
        stmt = select(Conversation.creator_id).where(Conversation.id == conversation_id)
        result = await session.execute(stmt)
        creator_id = result.scalar_one_or_none()
        return creator_id == user_id
    
    async def _send_read_receipts(self, conversation_id: str, user_id: str, message_ids: List[str]):
        """Send read receipts via WebSocket"""
        message = WebSocketMessage(
            type="messages_read",
            data={
                "conversation_id": conversation_id,
                "user_id": user_id,
                "message_ids": message_ids,
                "read_at": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            conversation_id=conversation_id
        )
        
        await connection_manager.send_to_conversation(conversation_id, message, exclude_user_id=user_id)
    
    async def _notify_conversation_created(self, conversation: Conversation, participants: List[str]):
        """Send notifications for new conversation"""
        for participant_id in participants:
            if participant_id != conversation.creator_id:
                await self.notification_service.send_conversation_notification(
                    participant_id,
                    conversation.creator_id,
                    conversation.id,
                    "added_to_conversation"
                )
    
    async def _schedule_message_delivery(self, message_id: str, scheduled_for: datetime):
        """Schedule message for future delivery"""
        # This would typically use Celery for scheduled tasks
        try:
            from celery import current_app
            current_app.send_task(
                'deliver_scheduled_message',
                args=[message_id],
                eta=scheduled_for
            )
        except Exception as e:
            logger.error(f"Error scheduling message delivery: {e}")


# Global chat service instance
chat_service = ChatService()
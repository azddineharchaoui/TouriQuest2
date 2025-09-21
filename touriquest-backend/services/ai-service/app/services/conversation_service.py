"""
Conversation management service with history, context, and analytics.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import redis.asyncio as redis
from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.database import (
    Conversation, ChatMessage, ConversationAnalytics,
    UserContext, ConversationEmbedding
)
from app.models.schemas import (
    ConversationCreate, ConversationWithMessages, ChatMessageCreate,
    ChatMessageResponse, ConversationStatus, MessageType, IntentType,
    Language, UserContext as UserContextSchema
)

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manages conversations, history, and context."""
    
    def __init__(self):
        """Initialize conversation manager."""
        self.redis_client = None
        self._setup_redis()
    
    async def _setup_redis(self):
        """Setup Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.redis_client = None
    
    async def create_conversation(
        self,
        db: AsyncSession,
        user_id: UUID,
        conversation_data: ConversationCreate
    ) -> Conversation:
        """Create a new conversation."""
        try:
            # Create conversation
            conversation = Conversation(
                user_id=user_id,
                title=conversation_data.title,
                language=conversation_data.language.value,
                context=conversation_data.context or {},
                status=ConversationStatus.ACTIVE.value
            )
            
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            
            # Initialize analytics
            analytics = ConversationAnalytics(
                conversation_id=conversation.id,
                user_id=user_id
            )
            db.add(analytics)
            await db.commit()
            
            # Cache conversation
            await self._cache_conversation(conversation)
            
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            return conversation
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            await db.rollback()
            raise
    
    async def get_conversation(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        include_messages: bool = False
    ) -> Optional[Conversation]:
        """Get conversation by ID."""
        try:
            # Try cache first
            cached = await self._get_cached_conversation(conversation_id)
            if cached and not include_messages:
                return cached
            
            # Query database
            query = db.query(Conversation).filter(Conversation.id == conversation_id)
            
            if include_messages:
                query = query.options(
                    selectinload(Conversation.messages).selectinload(ChatMessage.conversation)
                )
            
            conversation = await query.first()
            
            if conversation:
                await self._cache_conversation(conversation)
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
            return None
    
    async def get_user_conversations(
        self,
        db: AsyncSession,
        user_id: UUID,
        status: Optional[ConversationStatus] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Conversation]:
        """Get user's conversations."""
        try:
            query = db.query(Conversation).filter(Conversation.user_id == user_id)
            
            if status:
                query = query.filter(Conversation.status == status.value)
            
            query = query.order_by(desc(Conversation.last_message_at)).limit(limit).offset(offset)
            
            conversations = await query.all()
            
            # Cache conversations
            for conv in conversations:
                await self._cache_conversation(conv)
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting user conversations: {str(e)}")
            return []
    
    async def add_message(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
        message_data: ChatMessageCreate,
        is_from_ai: bool = False
    ) -> ChatMessage:
        """Add message to conversation."""
        try:
            # Get conversation
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            # Create message
            message = ChatMessage(
                conversation_id=conversation_id,
                user_id=user_id,
                content=message_data.content,
                message_type=message_data.message_type.value,
                metadata=message_data.metadata or {},
                is_from_ai=is_from_ai
            )
            
            db.add(message)
            
            # Update conversation
            conversation.message_count += 1
            conversation.last_message_at = datetime.utcnow()
            
            # Auto-generate title from first user message
            if not conversation.title and not is_from_ai and conversation.message_count == 1:
                conversation.title = self._generate_conversation_title(message_data.content)
            
            await db.commit()
            await db.refresh(message)
            
            # Update cache
            await self._cache_conversation(conversation)
            await self._cache_message(message)
            
            # Update analytics
            await self._update_conversation_analytics(db, conversation_id, message)
            
            logger.info(f"Added message to conversation {conversation_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error adding message: {str(e)}")
            await db.rollback()
            raise
    
    async def get_conversation_history(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get conversation message history."""
        try:
            # Try cache first
            cache_key = f"conversation_history:{conversation_id}:{limit}:{offset}"
            if self.redis_client:
                cached_history = await self.redis_client.get(cache_key)
                if cached_history:
                    return json.loads(cached_history)
            
            # Query database
            messages = await db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conversation_id
            ).order_by(ChatMessage.created_at).offset(offset).limit(limit).all()
            
            # Format messages
            history = []
            for msg in messages:
                history.append({
                    "id": str(msg.id),
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "is_from_ai": msg.is_from_ai,
                    "intent": msg.intent,
                    "confidence": msg.confidence,
                    "metadata": msg.metadata,
                    "created_at": msg.created_at.isoformat()
                })
            
            # Cache history
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key,
                    settings.conversation_cache_ttl,
                    json.dumps(history)
                )
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            return []
    
    async def update_conversation_context(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        context_updates: Dict[str, Any]
    ) -> bool:
        """Update conversation context."""
        try:
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                return False
            
            # Merge context
            current_context = conversation.context or {}
            current_context.update(context_updates)
            conversation.context = current_context
            
            await db.commit()
            
            # Update cache
            await self._cache_conversation(conversation)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation context: {str(e)}")
            await db.rollback()
            return False
    
    async def archive_conversation(
        self,
        db: AsyncSession,
        conversation_id: UUID
    ) -> bool:
        """Archive a conversation."""
        try:
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                return False
            
            conversation.status = ConversationStatus.ARCHIVED.value
            await db.commit()
            
            # Update cache
            await self._cache_conversation(conversation)
            
            return True
            
        except Exception as e:
            logger.error(f"Error archiving conversation: {str(e)}")
            await db.rollback()
            return False
    
    async def delete_conversation(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        hard_delete: bool = False
    ) -> bool:
        """Delete a conversation (soft or hard delete)."""
        try:
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                return False
            
            if hard_delete:
                # Hard delete - remove from database
                await db.delete(conversation)
            else:
                # Soft delete - mark as deleted
                conversation.status = ConversationStatus.DELETED.value
            
            await db.commit()
            
            # Remove from cache
            await self._remove_cached_conversation(conversation_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            await db.rollback()
            return False
    
    async def get_conversation_analytics(
        self,
        db: AsyncSession,
        conversation_id: UUID
    ) -> Optional[ConversationAnalytics]:
        """Get conversation analytics."""
        try:
            analytics = await db.query(ConversationAnalytics).filter(
                ConversationAnalytics.conversation_id == conversation_id
            ).first()
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting conversation analytics: {str(e)}")
            return None
    
    async def search_conversations(
        self,
        db: AsyncSession,
        user_id: UUID,
        query: str,
        limit: int = 10
    ) -> List[Conversation]:
        """Search conversations by content."""
        try:
            # Simple text search in conversation titles and last messages
            conversations = await db.query(Conversation).filter(
                Conversation.user_id == user_id,
                Conversation.status != ConversationStatus.DELETED.value
            ).filter(
                func.lower(Conversation.title).contains(query.lower())
            ).order_by(desc(Conversation.last_message_at)).limit(limit).all()
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error searching conversations: {str(e)}")
            return []
    
    def _generate_conversation_title(self, first_message: str) -> str:
        """Generate conversation title from first message."""
        # Truncate and clean first message
        title = first_message.strip()
        if len(title) > 50:
            title = title[:47] + "..."
        
        # Remove special characters
        title = ''.join(c for c in title if c.isalnum() or c.isspace())
        
        return title or "New Conversation"
    
    async def _update_conversation_analytics(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        message: ChatMessage
    ):
        """Update conversation analytics."""
        try:
            analytics = await db.query(ConversationAnalytics).filter(
                ConversationAnalytics.conversation_id == conversation_id
            ).first()
            
            if analytics:
                # Update message counts
                analytics.total_messages += 1
                if message.is_from_ai:
                    analytics.ai_messages += 1
                else:
                    analytics.user_messages += 1
                
                # Update voice message count
                if message.message_type == MessageType.VOICE.value:
                    analytics.voice_messages += 1
                
                # Update intent distribution
                if message.intent:
                    intent_dist = analytics.intent_distribution or {}
                    intent_dist[message.intent] = intent_dist.get(message.intent, 0) + 1
                    analytics.intent_distribution = intent_dist
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error updating analytics: {str(e)}")
    
    # Cache management methods
    async def _cache_conversation(self, conversation: Conversation):
        """Cache conversation data."""
        if not self.redis_client:
            return
        
        try:
            cache_key = f"conversation:{conversation.id}"
            data = {
                "id": str(conversation.id),
                "user_id": str(conversation.user_id),
                "title": conversation.title,
                "status": conversation.status,
                "language": conversation.language,
                "context": conversation.context,
                "message_count": conversation.message_count,
                "created_at": conversation.created_at.isoformat(),
                "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None
            }
            
            await self.redis_client.setex(
                cache_key,
                settings.conversation_cache_ttl,
                json.dumps(data)
            )
            
        except Exception as e:
            logger.warning(f"Error caching conversation: {str(e)}")
    
    async def _get_cached_conversation(self, conversation_id: UUID) -> Optional[Conversation]:
        """Get conversation from cache."""
        if not self.redis_client:
            return None
        
        try:
            cache_key = f"conversation:{conversation_id}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                # Convert back to Conversation object (simplified)
                conversation = Conversation()
                conversation.id = UUID(data["id"])
                conversation.user_id = UUID(data["user_id"])
                conversation.title = data["title"]
                conversation.status = data["status"]
                conversation.language = data["language"]
                conversation.context = data["context"]
                conversation.message_count = data["message_count"]
                conversation.created_at = datetime.fromisoformat(data["created_at"])
                if data["last_message_at"]:
                    conversation.last_message_at = datetime.fromisoformat(data["last_message_at"])
                
                return conversation
                
        except Exception as e:
            logger.warning(f"Error getting cached conversation: {str(e)}")
        
        return None
    
    async def _cache_message(self, message: ChatMessage):
        """Cache message data."""
        if not self.redis_client:
            return
        
        try:
            cache_key = f"message:{message.id}"
            data = {
                "id": str(message.id),
                "conversation_id": str(message.conversation_id),
                "user_id": str(message.user_id),
                "content": message.content,
                "message_type": message.message_type,
                "is_from_ai": message.is_from_ai,
                "intent": message.intent,
                "confidence": message.confidence,
                "metadata": message.metadata,
                "created_at": message.created_at.isoformat()
            }
            
            await self.redis_client.setex(
                cache_key,
                settings.conversation_cache_ttl,
                json.dumps(data)
            )
            
        except Exception as e:
            logger.warning(f"Error caching message: {str(e)}")
    
    async def _remove_cached_conversation(self, conversation_id: UUID):
        """Remove conversation from cache."""
        if not self.redis_client:
            return
        
        try:
            cache_key = f"conversation:{conversation_id}"
            await self.redis_client.delete(cache_key)
            
        except Exception as e:
            logger.warning(f"Error removing cached conversation: {str(e)}")


# User context management
class UserContextManager:
    """Manages user context for personalized conversations."""
    
    def __init__(self):
        """Initialize user context manager."""
        self.redis_client = None
        self._setup_redis()
    
    async def _setup_redis(self):
        """Setup Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
    
    async def get_user_context(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[UserContextSchema]:
        """Get user context."""
        try:
            # Try cache first
            if self.redis_client:
                cache_key = f"user_context:{user_id}"
                cached_context = await self.redis_client.get(cache_key)
                if cached_context:
                    data = json.loads(cached_context)
                    return UserContextSchema(**data)
            
            # Query database
            context = await db.query(UserContext).filter(
                UserContext.user_id == user_id
            ).first()
            
            if context:
                context_schema = UserContextSchema(
                    user_id=context.user_id,
                    current_location=context.current_location,
                    travel_history=context.travel_history,
                    preferences=context.preferences,
                    recent_searches=context.recent_searches,
                    current_bookings=context.current_bookings,
                    interests=context.interests,
                    budget_range=context.budget_range,
                    travel_companions=context.travel_companions,
                    session_id=context.session_id
                )
                
                # Cache context
                await self._cache_user_context(context_schema)
                
                return context_schema
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user context: {str(e)}")
            return None
    
    async def update_user_context(
        self,
        db: AsyncSession,
        user_id: UUID,
        context_updates: Dict[str, Any]
    ) -> bool:
        """Update user context."""
        try:
            # Get or create context
            context = await db.query(UserContext).filter(
                UserContext.user_id == user_id
            ).first()
            
            if not context:
                context = UserContext(user_id=user_id)
                db.add(context)
            
            # Update fields
            for field, value in context_updates.items():
                if hasattr(context, field):
                    setattr(context, field, value)
            
            await db.commit()
            
            # Update cache
            context_schema = UserContextSchema(
                user_id=context.user_id,
                current_location=context.current_location,
                travel_history=context.travel_history,
                preferences=context.preferences,
                recent_searches=context.recent_searches,
                current_bookings=context.current_bookings,
                interests=context.interests,
                budget_range=context.budget_range,
                travel_companions=context.travel_companions,
                session_id=context.session_id
            )
            await self._cache_user_context(context_schema)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating user context: {str(e)}")
            await db.rollback()
            return False
    
    async def _cache_user_context(self, context: UserContextSchema):
        """Cache user context."""
        if not self.redis_client:
            return
        
        try:
            cache_key = f"user_context:{context.user_id}"
            data = context.model_dump(mode='json')
            
            await self.redis_client.setex(
                cache_key,
                settings.context_cache_ttl,
                json.dumps(data)
            )
            
        except Exception as e:
            logger.warning(f"Error caching user context: {str(e)}")


# Global service instances
conversation_manager = ConversationManager()
user_context_manager = UserContextManager()
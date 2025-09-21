"""
Chat API endpoints for AI assistant.
"""
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.schemas import (
    ChatMessageCreate, ChatMessageResponse, Conversation,
    ConversationCreate, ConversationWithMessages, StandardResponse,
    Language, UserContext
)
from app.services import (
    conversation_manager, user_context_manager, gemini_service,
    function_registry
)
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Chat"])


@router.post("/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    conversation_id: UUID,
    message: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Send a chat message and get AI response."""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Get or create conversation
        conversation = await conversation_manager.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Verify user has access to conversation
        if conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to conversation"
            )
        
        # Add user message
        user_message = await conversation_manager.add_message(
            db, conversation_id, user_id, message, is_from_ai=False
        )
        
        # Get user context
        user_context = await user_context_manager.get_user_context(db, user_id)
        
        # Get conversation history
        history = await conversation_manager.get_conversation_history(
            db, conversation_id, limit=20
        )
        
        # Generate AI response
        response_text, intent, confidence, suggestions, function_calls = await gemini_service.generate_response(
            message.content,
            history,
            user_context,
            Language(conversation.language)
        )
        
        # Execute function calls if any
        function_results = []
        for func_call in function_calls:
            result = await function_registry.execute_function(
                func_call["function"],
                func_call.get("parameters", {}),
                user_context,
                db
            )
            function_results.append(result)
        
        # Create AI response message
        ai_message_data = ChatMessageCreate(
            content=response_text,
            metadata={
                "suggestions": suggestions,
                "function_calls": function_calls,
                "function_results": [r.model_dump() for r in function_results],
                "intent": intent.value if intent else None,
                "confidence": confidence
            }
        )
        
        # Add AI response to conversation
        ai_message = await conversation_manager.add_message(
            db, conversation_id, user_id, ai_message_data, is_from_ai=True
        )
        
        # Update message with intent and confidence
        if intent:
            ai_message.intent = intent.value
        ai_message.confidence = confidence
        await db.commit()
        
        # Create response
        response = ChatMessageResponse(
            id=ai_message.id,
            conversation_id=conversation_id,
            content=response_text,
            intent=intent,
            confidence=confidence,
            suggestions=suggestions,
            actions=[r.model_dump() for r in function_results if r.success],
            metadata=ai_message.metadata
        )
        
        logger.info(f"Chat message processed for user {user_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.post("/conversations", response_model=Conversation)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new conversation."""
    try:
        user_id = UUID(current_user["user_id"])
        
        conversation = await conversation_manager.create_conversation(
            db, user_id, conversation_data
        )
        
        logger.info(f"Created conversation {conversation.id} for user {user_id}")
        return conversation
        
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )


@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_user_conversations(
    user_id: UUID,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get user's conversations."""
    try:
        # Verify user access
        if UUID(current_user["user_id"]) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        conversations = await conversation_manager.get_user_conversations(
            db, user_id, limit=limit, offset=offset
        )
        
        return conversations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversations"
        )


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get conversation message history."""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Verify conversation access
        conversation = await conversation_manager.get_conversation(db, conversation_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        messages = await conversation_manager.get_conversation_history(
            db, conversation_id, limit=limit, offset=offset
        )
        
        return {"messages": messages}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get messages"
        )


@router.delete("/conversations/{conversation_id}", response_model=StandardResponse)
async def delete_conversation(
    conversation_id: UUID,
    hard_delete: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a conversation."""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Verify conversation access
        conversation = await conversation_manager.get_conversation(db, conversation_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        success = await conversation_manager.delete_conversation(
            db, conversation_id, hard_delete
        )
        
        if success:
            return StandardResponse(
                success=True,
                message="Conversation deleted successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete conversation"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )
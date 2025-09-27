"""
WebSocket API endpoints for real-time communication
Handles WebSocket connections, real-time messaging, and live updates
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.websocket_manager import connection_manager
from app.services.message_service import message_service
from app.core.auth import get_user_from_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])
security = HTTPBearer()


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="Authentication token"),
    user_id: Optional[str] = Query(None, description="User ID (for testing)")
):
    """
    WebSocket endpoint for real-time communication
    
    Features:
    - JWT authentication via query parameter
    - Real-time message delivery
    - Typing indicators
    - Presence updates
    - Room-based messaging
    - Connection health monitoring
    - Auto-reconnection support
    """
    connection_id = None
    
    try:
        # Authenticate user
        if token:
            try:
                user = await get_user_from_token(token)
                user_id = user.id
            except Exception as e:
                logger.warning(f"WebSocket authentication failed: {e}")
                await websocket.close(code=1008, reason="Authentication failed")
                return
        
        if not user_id:
            await websocket.close(code=1008, reason="User ID required")
            return
        
        # Accept connection and register with manager
        connection_id = await connection_manager.connect(websocket, user_id)
        
        logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")
        
        # Send connection confirmation
        await connection_manager.send_to_connection(connection_id, {
            "type": "connection_established",
            "data": {
                "connection_id": connection_id,
                "user_id": user_id,
                "server_time": datetime.utcnow().isoformat(),
                "supported_features": [
                    "real_time_messaging",
                    "typing_indicators", 
                    "presence_updates",
                    "room_management",
                    "file_sharing",
                    "voice_messages"
                ]
            }
        })
        
        # Message handling loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                
                # Handle the message
                await connection_manager.handle_message(connection_id, data)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: connection={connection_id}")
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                # Send error message to client
                await connection_manager.send_to_connection(connection_id, {
                    "type": "error",
                    "data": {
                        "message": "Message processing error",
                        "error_code": "MESSAGE_PROCESSING_ERROR"
                    }
                })
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected during setup: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Clean up connection
        if connection_id:
            await connection_manager.disconnect(connection_id)


@router.websocket("/conversation/{conversation_id}")
async def conversation_websocket(
    websocket: WebSocket,
    conversation_id: str,
    token: Optional[str] = Query(None, description="Authentication token"),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for conversation-specific real-time communication
    
    Features:
    - Conversation-scoped messaging
    - Automatic room joining for conversation
    - Message history replay
    - Typing indicators within conversation
    - Read receipt updates
    - Participant presence tracking
    """
    connection_id = None
    
    try:
        # Authenticate user
        if not token:
            await websocket.close(code=1008, reason="Authentication token required")
            return
        
        try:
            user = await get_user_from_token(token)
            user_id = user.id
        except Exception as e:
            logger.warning(f"Conversation WebSocket authentication failed: {e}")
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        # Validate conversation access
        has_access = await message_service.validate_conversation_access(
            db, conversation_id, user_id
        )
        
        if not has_access:
            await websocket.close(code=1003, reason="Access denied to conversation")
            return
        
        # Accept connection
        connection_id = await connection_manager.connect(websocket, user_id)
        
        # Join conversation room
        room_id = f"conversation_{conversation_id}"
        await connection_manager.join_room(connection_id, room_id)
        
        # Send conversation info and recent messages
        conversation_info = await message_service.get_conversation_info(
            db, conversation_id, user_id
        )
        
        recent_messages = await message_service.get_recent_messages(
            db, conversation_id, limit=50
        )
        
        await connection_manager.send_to_connection(connection_id, {
            "type": "conversation_joined",
            "data": {
                "conversation_id": conversation_id,
                "conversation_info": conversation_info,
                "recent_messages": recent_messages,
                "participants": await message_service.get_conversation_participants(
                    db, conversation_id
                )
            }
        })
        
        # Register conversation-specific message handlers
        await _register_conversation_handlers(connection_id, conversation_id, user_id, db)
        
        # Message handling loop
        while True:
            try:
                data = await websocket.receive_text()
                await _handle_conversation_message(
                    connection_id, conversation_id, user_id, data, db
                )
                
            except WebSocketDisconnect:
                logger.info(f"Conversation WebSocket disconnected: {connection_id}")
                break
            except Exception as e:
                logger.error(f"Error in conversation WebSocket: {e}")
                await connection_manager.send_to_connection(connection_id, {
                    "type": "error",
                    "data": {"message": str(e)}
                })
                
    except Exception as e:
        logger.error(f"Conversation WebSocket error: {e}")
    finally:
        if connection_id:
            # Leave conversation room
            await connection_manager.leave_room(connection_id, f"conversation_{conversation_id}")
            await connection_manager.disconnect(connection_id)


async def _register_conversation_handlers(
    connection_id: str, 
    conversation_id: str, 
    user_id: str, 
    db: AsyncSession
):
    """Register conversation-specific message handlers"""
    
    async def handle_send_message(data: Dict[str, Any]):
        """Handle sending a message in the conversation"""
        try:
            message_content = data.get("content", "")
            message_type = data.get("message_type", "text")
            reply_to_id = data.get("reply_to_id")
            
            # Create message in database
            message = await message_service.create_message(db, {
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "content": message_content,
                "message_type": message_type,
                "reply_to_id": reply_to_id
            })
            
            # Broadcast to conversation room
            room_id = f"conversation_{conversation_id}"
            await connection_manager.broadcast_to_room(room_id, {
                "type": "new_message",
                "data": {
                    "message": message.dict(),
                    "conversation_id": conversation_id
                }
            })
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            await connection_manager.send_to_connection(connection_id, {
                "type": "error",
                "data": {"message": "Failed to send message"}
            })
    
    async def handle_typing_indicator(data: Dict[str, Any]):
        """Handle typing indicator updates"""
        try:
            is_typing = data.get("is_typing", False)
            
            # Update typing status
            await message_service.update_typing_status(
                db, conversation_id, user_id, is_typing
            )
            
            # Broadcast to others in room
            room_id = f"conversation_{conversation_id}"
            await connection_manager.broadcast_to_room(room_id, {
                "type": "typing_indicator",
                "data": {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "is_typing": is_typing
                }
            }, exclude_user=user_id)
            
        except Exception as e:
            logger.error(f"Error handling typing indicator: {e}")
    
    async def handle_mark_read(data: Dict[str, Any]):
        """Handle marking messages as read"""
        try:
            message_ids = data.get("message_ids", [])
            
            # Mark messages as read
            await message_service.mark_messages_read(db, message_ids, user_id)
            
            # Broadcast read receipts
            room_id = f"conversation_{conversation_id}"
            await connection_manager.broadcast_to_room(room_id, {
                "type": "messages_read",
                "data": {
                    "user_id": user_id,
                    "message_ids": message_ids,
                    "read_at": datetime.utcnow().isoformat()
                }
            }, exclude_user=user_id)
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")
    
    # Register handlers with connection manager
    connection_manager.register_handler(f"send_message_{connection_id}", handle_send_message)
    connection_manager.register_handler(f"typing_{connection_id}", handle_typing_indicator)
    connection_manager.register_handler(f"mark_read_{connection_id}", handle_mark_read)


async def _handle_conversation_message(
    connection_id: str,
    conversation_id: str,
    user_id: str,
    message_data: str,
    db: AsyncSession
):
    """Handle conversation-specific WebSocket messages"""
    try:
        data = json.loads(message_data)
        message_type = data.get("type")
        
        # Route to appropriate handler
        if message_type == "send_message":
            handler = connection_manager.message_handlers.get(f"send_message_{connection_id}")
            if handler:
                await handler(data.get("data", {}))
                
        elif message_type == "typing":
            handler = connection_manager.message_handlers.get(f"typing_{connection_id}")
            if handler:
                await handler(data.get("data", {}))
                
        elif message_type == "mark_read":
            handler = connection_manager.message_handlers.get(f"mark_read_{connection_id}")
            if handler:
                await handler(data.get("data", {}))
                
        else:
            # Fallback to general message handler
            await connection_manager.handle_message(connection_id, message_data)
            
    except json.JSONDecodeError:
        await connection_manager.send_to_connection(connection_id, {
            "type": "error",
            "data": {"message": "Invalid JSON format"}
        })
    except Exception as e:
        logger.error(f"Error handling conversation message: {e}")
        await connection_manager.send_to_connection(connection_id, {
            "type": "error",
            "data": {"message": "Message processing error"}
        })


# HTTP endpoints for WebSocket management
@router.get("/connections")
async def get_websocket_connections(
    current_user = Depends(get_current_user)
):
    """
    Get WebSocket connection statistics (admin only)
    
    Features:
    - Active connection count
    - Online user list
    - Room membership statistics
    - Connection health metrics
    """
    try:
        # Check admin permission
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        stats = connection_manager.get_stats()
        
        return {
            "websocket_stats": stats,
            "active_rooms": list(connection_manager.room_members.keys()),
            "connection_health": "healthy"
        }
        
    except Exception as e:
        logger.error(f"Error getting WebSocket connections: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve connection statistics"
        )


@router.post("/broadcast")
async def broadcast_message(
    message: Dict[str, Any],
    room_id: Optional[str] = None,
    user_ids: Optional[list] = None,
    current_user = Depends(get_current_user)
):
    """
    Broadcast message via WebSocket (admin only)
    
    Features:
    - Room-based broadcasting
    - User-specific targeting
    - System announcements
    - Emergency notifications
    """
    try:
        # Check admin permission
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        sent_count = 0
        
        if room_id:
            # Broadcast to room
            sent_count = await connection_manager.broadcast_to_room(room_id, message)
        elif user_ids:
            # Send to specific users
            for user_id in user_ids:
                sent = await connection_manager.send_to_user(user_id, message)
                sent_count += sent
        else:
            # Broadcast to all connections (system announcement)
            for user_id in connection_manager.user_connections.keys():
                sent = await connection_manager.send_to_user(user_id, message)
                sent_count += sent
        
        return {
            "message": "Broadcast sent",
            "recipients": sent_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to broadcast message"
        )


@router.delete("/connections/{connection_id}")
async def disconnect_websocket(
    connection_id: str,
    reason: str = "Admin disconnect",
    current_user = Depends(get_current_user)
):
    """
    Forcefully disconnect a WebSocket connection (admin only)
    
    Features:
    - Admin connection management
    - Graceful disconnection with reason
    - Audit logging for disconnections
    """
    try:
        # Check admin permission
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Send disconnect notice
        await connection_manager.send_to_connection(connection_id, {
            "type": "forced_disconnect",
            "data": {
                "reason": reason,
                "reconnect_allowed": True
            }
        })
        
        # Disconnect
        await connection_manager.disconnect(connection_id)
        
        return {
            "message": "Connection disconnected",
            "connection_id": connection_id,
            "reason": reason
        }
        
    except Exception as e:
        logger.error(f"Error disconnecting WebSocket: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to disconnect WebSocket"
        )
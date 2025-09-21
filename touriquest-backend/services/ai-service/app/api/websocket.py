"""
WebSocket API endpoint for real-time chat.
"""
import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.websockets import WebSocketState

from app.services import connection_manager, websocket_handler

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    user_id: UUID,
    conversation_id: Optional[UUID] = Query(None),
    token: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time chat."""
    connection_id = None
    
    try:
        # TODO: Validate token and authenticate user
        # For now, we'll accept the connection
        
        # Connect user
        connection_id = await connection_manager.connect(
            websocket, user_id, conversation_id
        )
        
        logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")
        
        # Handle messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Process message
                await websocket_handler.handle_message(
                    websocket, connection_id, user_id, message_data
                )
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: user={user_id}")
                break
            except json.JSONDecodeError:
                await connection_manager.send_error_message(
                    connection_id,
                    "Invalid JSON format",
                    "INVALID_JSON"
                )
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                await connection_manager.send_error_message(
                    connection_id,
                    "Error processing message",
                    "MESSAGE_ERROR"
                )
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        # Disconnect user
        if connection_id:
            await connection_manager.disconnect(connection_id, user_id)


@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    user_id: UUID,
    token: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time notifications."""
    connection_id = None
    
    try:
        # TODO: Validate token and authenticate user
        
        # Connect user for notifications only
        connection_id = await connection_manager.connect(websocket, user_id)
        
        logger.info(f"Notification WebSocket connected: user={user_id}")
        
        # Keep connection alive and handle ping/pong
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                if message_data.get("type") == "ping":
                    await websocket_handler._handle_ping(connection_id)
                    
            except WebSocketDisconnect:
                logger.info(f"Notification WebSocket disconnected: user={user_id}")
                break
            except Exception as e:
                logger.error(f"Error in notification WebSocket: {str(e)}")
                break
                
    except Exception as e:
        logger.error(f"Notification WebSocket error: {str(e)}")
    finally:
        if connection_id:
            await connection_manager.disconnect(connection_id, user_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    try:
        stats = connection_manager.get_connection_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket stats: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
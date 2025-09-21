"""
WebSocket service for real-time chat communication.
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from app.models.schemas import (
    WebSocketMessage, TypingIndicator, MessageType
)

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time chat."""
    
    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[UUID, Set[str]] = {}
        self.conversation_connections: Dict[UUID, Set[str]] = {}
        self.typing_users: Dict[UUID, Set[UUID]] = {}  # conversation_id -> set of typing user_ids
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: UUID,
        conversation_id: Optional[UUID] = None
    ) -> str:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Generate connection ID
        connection_id = f"{user_id}_{datetime.utcnow().timestamp()}"
        
        # Store connection
        self.active_connections[connection_id] = websocket
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Track conversation connections
        if conversation_id:
            if conversation_id not in self.conversation_connections:
                self.conversation_connections[conversation_id] = set()
            self.conversation_connections[conversation_id].add(connection_id)
        
        logger.info(f"User {user_id} connected with connection {connection_id}")
        
        # Send welcome message
        await self._send_to_connection(connection_id, {
            "type": "connection",
            "data": {
                "status": "connected",
                "connection_id": connection_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        return connection_id
    
    async def disconnect(self, connection_id: str, user_id: UUID):
        """Disconnect a WebSocket connection."""
        try:
            # Remove from active connections
            if connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.close()
                del self.active_connections[connection_id]
            
            # Remove from user connections
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove from conversation connections
            for conv_id, connections in self.conversation_connections.items():
                connections.discard(connection_id)
                if not connections:
                    del self.conversation_connections[conv_id]
                    break
            
            # Remove from typing indicators
            for conv_id in list(self.typing_users.keys()):
                self.typing_users[conv_id].discard(user_id)
                if not self.typing_users[conv_id]:
                    del self.typing_users[conv_id]
            
            logger.info(f"User {user_id} disconnected from connection {connection_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting {connection_id}: {str(e)}")
    
    async def send_message_to_conversation(
        self,
        conversation_id: UUID,
        message: Dict[str, Any],
        exclude_connection: Optional[str] = None
    ):
        """Send message to all users in a conversation."""
        if conversation_id not in self.conversation_connections:
            return
        
        connections = self.conversation_connections[conversation_id].copy()
        if exclude_connection:
            connections.discard(exclude_connection)
        
        websocket_message = WebSocketMessage(
            type="chat_message",
            data=message
        )
        
        for connection_id in connections:
            await self._send_to_connection(
                connection_id,
                websocket_message.model_dump()
            )
    
    async def send_message_to_user(
        self,
        user_id: UUID,
        message: Dict[str, Any],
        exclude_connection: Optional[str] = None
    ):
        """Send message to all connections of a specific user."""
        if user_id not in self.user_connections:
            return
        
        connections = self.user_connections[user_id].copy()
        if exclude_connection:
            connections.discard(exclude_connection)
        
        websocket_message = WebSocketMessage(
            type="notification",
            data=message
        )
        
        for connection_id in connections:
            await self._send_to_connection(
                connection_id,
                websocket_message.model_dump()
            )
    
    async def broadcast_typing_indicator(
        self,
        conversation_id: UUID,
        user_id: UUID,
        is_typing: bool,
        exclude_connection: Optional[str] = None
    ):
        """Broadcast typing indicator to conversation participants."""
        # Update typing state
        if conversation_id not in self.typing_users:
            self.typing_users[conversation_id] = set()
        
        if is_typing:
            self.typing_users[conversation_id].add(user_id)
        else:
            self.typing_users[conversation_id].discard(user_id)
        
        # Create typing indicator message
        typing_indicator = TypingIndicator(
            user_id=user_id,
            conversation_id=conversation_id,
            is_typing=is_typing
        )
        
        message = WebSocketMessage(
            type="typing",
            data=typing_indicator.model_dump()
        )
        
        # Send to conversation participants
        if conversation_id in self.conversation_connections:
            connections = self.conversation_connections[conversation_id].copy()
            if exclude_connection:
                connections.discard(exclude_connection)
            
            for connection_id in connections:
                await self._send_to_connection(connection_id, message.model_dump())
    
    async def send_ai_response(
        self,
        conversation_id: UUID,
        response_data: Dict[str, Any]
    ):
        """Send AI response to conversation participants."""
        message = WebSocketMessage(
            type="ai_response",
            data=response_data
        )
        
        await self.send_message_to_conversation(
            conversation_id,
            message.model_dump()["data"]
        )
    
    async def send_system_message(
        self,
        conversation_id: UUID,
        system_message: str,
        message_type: str = "info"
    ):
        """Send system message to conversation participants."""
        message = WebSocketMessage(
            type="system",
            data={
                "message": system_message,
                "message_type": message_type,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        await self.send_message_to_conversation(
            conversation_id,
            message.model_dump()["data"]
        )
    
    async def send_error_message(
        self,
        connection_id: str,
        error_message: str,
        error_code: Optional[str] = None
    ):
        """Send error message to specific connection."""
        message = WebSocketMessage(
            type="error",
            data={
                "error": error_message,
                "error_code": error_code,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        await self._send_to_connection(connection_id, message.model_dump())
    
    async def get_conversation_participants(self, conversation_id: UUID) -> Set[UUID]:
        """Get active participants in a conversation."""
        participants = set()
        
        if conversation_id in self.conversation_connections:
            for connection_id in self.conversation_connections[conversation_id]:
                # Extract user_id from connection_id
                try:
                    user_id_str = connection_id.split('_')[0]
                    participants.add(UUID(user_id_str))
                except (ValueError, IndexError):
                    continue
        
        return participants
    
    async def get_typing_users(self, conversation_id: UUID) -> Set[UUID]:
        """Get users currently typing in a conversation."""
        return self.typing_users.get(conversation_id, set())
    
    async def _send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to a specific connection."""
        if connection_id not in self.active_connections:
            return
        
        websocket = self.active_connections[connection_id]
        
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(json.dumps(message))
            else:
                # Connection is closed, remove it
                del self.active_connections[connection_id]
                
        except Exception as e:
            logger.error(f"Error sending message to connection {connection_id}: {str(e)}")
            # Remove broken connection
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            "total_connections": len(self.active_connections),
            "active_users": len(self.user_connections),
            "active_conversations": len(self.conversation_connections),
            "typing_conversations": len(self.typing_users)
        }


class WebSocketHandler:
    """Handles WebSocket message processing."""
    
    def __init__(self, connection_manager: ConnectionManager):
        """Initialize WebSocket handler."""
        self.connection_manager = connection_manager
    
    async def handle_message(
        self,
        websocket: WebSocket,
        connection_id: str,
        user_id: UUID,
        message_data: Dict[str, Any]
    ):
        """Handle incoming WebSocket message."""
        try:
            message_type = message_data.get("type")
            data = message_data.get("data", {})
            
            if message_type == "typing":
                await self._handle_typing_indicator(connection_id, user_id, data)
            elif message_type == "join_conversation":
                await self._handle_join_conversation(connection_id, user_id, data)
            elif message_type == "leave_conversation":
                await self._handle_leave_conversation(connection_id, user_id, data)
            elif message_type == "ping":
                await self._handle_ping(connection_id)
            else:
                await self.connection_manager.send_error_message(
                    connection_id,
                    f"Unknown message type: {message_type}",
                    "INVALID_MESSAGE_TYPE"
                )
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")
            await self.connection_manager.send_error_message(
                connection_id,
                "Error processing message",
                "MESSAGE_PROCESSING_ERROR"
            )
    
    async def _handle_typing_indicator(
        self,
        connection_id: str,
        user_id: UUID,
        data: Dict[str, Any]
    ):
        """Handle typing indicator message."""
        try:
            conversation_id = UUID(data.get("conversation_id"))
            is_typing = data.get("is_typing", False)
            
            await self.connection_manager.broadcast_typing_indicator(
                conversation_id,
                user_id,
                is_typing,
                exclude_connection=connection_id
            )
            
        except (ValueError, KeyError) as e:
            await self.connection_manager.send_error_message(
                connection_id,
                "Invalid typing indicator data",
                "INVALID_TYPING_DATA"
            )
    
    async def _handle_join_conversation(
        self,
        connection_id: str,
        user_id: UUID,
        data: Dict[str, Any]
    ):
        """Handle join conversation message."""
        try:
            conversation_id = UUID(data.get("conversation_id"))
            
            # Add connection to conversation
            if conversation_id not in self.connection_manager.conversation_connections:
                self.connection_manager.conversation_connections[conversation_id] = set()
            self.connection_manager.conversation_connections[conversation_id].add(connection_id)
            
            # Send confirmation
            await self.connection_manager._send_to_connection(connection_id, {
                "type": "joined_conversation",
                "data": {
                    "conversation_id": str(conversation_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            })
            
        except (ValueError, KeyError) as e:
            await self.connection_manager.send_error_message(
                connection_id,
                "Invalid join conversation data",
                "INVALID_JOIN_DATA"
            )
    
    async def _handle_leave_conversation(
        self,
        connection_id: str,
        user_id: UUID,
        data: Dict[str, Any]
    ):
        """Handle leave conversation message."""
        try:
            conversation_id = UUID(data.get("conversation_id"))
            
            # Remove connection from conversation
            if conversation_id in self.connection_manager.conversation_connections:
                self.connection_manager.conversation_connections[conversation_id].discard(connection_id)
                if not self.connection_manager.conversation_connections[conversation_id]:
                    del self.connection_manager.conversation_connections[conversation_id]
            
            # Stop typing indicator if active
            if conversation_id in self.connection_manager.typing_users:
                self.connection_manager.typing_users[conversation_id].discard(user_id)
                if not self.connection_manager.typing_users[conversation_id]:
                    del self.connection_manager.typing_users[conversation_id]
            
            # Send confirmation
            await self.connection_manager._send_to_connection(connection_id, {
                "type": "left_conversation",
                "data": {
                    "conversation_id": str(conversation_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            })
            
        except (ValueError, KeyError) as e:
            await self.connection_manager.send_error_message(
                connection_id,
                "Invalid leave conversation data",
                "INVALID_LEAVE_DATA"
            )
    
    async def _handle_ping(self, connection_id: str):
        """Handle ping message."""
        await self.connection_manager._send_to_connection(connection_id, {
            "type": "pong",
            "data": {
                "timestamp": datetime.utcnow().isoformat()
            }
        })


# Global instances
connection_manager = ConnectionManager()
websocket_handler = WebSocketHandler(connection_manager)
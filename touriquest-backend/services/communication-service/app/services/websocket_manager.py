"""
WebSocket connection manager for real-time communication
"""

from typing import Dict, List, Set, Optional, Any, Callable
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from fastapi import WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.chat_models import UserConnection, UserStatus, TypingIndicator
import uuid

logger = logging.getLogger(__name__)


@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "conversation_id": self.conversation_id,
            "message_id": self.message_id
        }


@dataclass
class ConnectionInfo:
    """Connection information"""
    websocket: WebSocket
    user_id: str
    connection_id: str
    device_id: Optional[str]
    device_type: Optional[str]
    platform: Optional[str]
    connected_at: datetime
    last_ping: datetime
    is_active: bool = True


class WebSocketConnectionManager:
    """Manages WebSocket connections with Redis for scaling"""
    
    def __init__(self):
        self.connections: Dict[str, Dict[str, ConnectionInfo]] = {}  # user_id -> {connection_id: ConnectionInfo}
        self.redis_client: Optional[redis.Redis] = None
        self.message_handlers: Dict[str, Callable] = {}
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.cleanup_task: Optional[asyncio.Task] = None
        self._shutdown = False
        
    async def initialize(self):
        """Initialize the connection manager"""
        try:
            # Initialize Redis connection
            self.redis_client = redis.from_url(
                settings.redis_url_complete,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=True
            )
            
            # Test Redis connection
            await self.redis_client.ping()
            
            # Start background tasks
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            # Register default message handlers
            self._register_default_handlers()
            
            logger.info("WebSocket connection manager initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket manager: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown the connection manager"""
        self._shutdown = True
        
        # Cancel background tasks
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        # Close all connections
        for user_connections in self.connections.values():
            for connection_info in user_connections.values():
                await self._close_connection(connection_info)
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("WebSocket connection manager shutdown")
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        device_id: Optional[str] = None,
        device_type: Optional[str] = None,
        platform: Optional[str] = None
    ) -> str:
        """Connect a new WebSocket client"""
        try:
            await websocket.accept()
            
            # Generate unique connection ID
            connection_id = str(uuid.uuid4())
            
            # Check connection limits
            user_connections = self.connections.get(user_id, {})
            if len(user_connections) >= settings.WS_MAX_CONNECTIONS_PER_USER:
                # Disconnect oldest connection
                oldest_connection = min(
                    user_connections.values(),
                    key=lambda x: x.connected_at
                )
                await self.disconnect(user_id, oldest_connection.connection_id)
            
            # Create connection info
            connection_info = ConnectionInfo(
                websocket=websocket,
                user_id=user_id,
                connection_id=connection_id,
                device_id=device_id,
                device_type=device_type,
                platform=platform,
                connected_at=datetime.utcnow(),
                last_ping=datetime.utcnow()
            )
            
            # Store connection
            if user_id not in self.connections:
                self.connections[user_id] = {}
            self.connections[user_id][connection_id] = connection_info
            
            # Store in Redis for distributed systems
            await self._store_connection_in_redis(connection_info)
            
            # Update user status to online
            await self._update_user_status(user_id, UserStatus.ONLINE)
            
            # Store connection in database
            await self._store_connection_in_db(connection_info)
            
            # Send connection confirmation
            await self.send_to_connection(
                user_id,
                connection_id,
                WebSocketMessage(
                    type="connection_established",
                    data={
                        "connection_id": connection_id,
                        "user_id": user_id,
                        "server_time": datetime.utcnow().isoformat()
                    },
                    timestamp=datetime.utcnow()
                )
            )
            
            # Notify other services about user coming online
            await self._broadcast_user_status_change(user_id, UserStatus.ONLINE)
            
            logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")
            return connection_id
            
        except Exception as e:
            logger.error(f"Failed to connect WebSocket: {e}")
            await websocket.close()
            raise
    
    async def disconnect(self, user_id: str, connection_id: str, reason: str = "client_disconnect"):
        """Disconnect a WebSocket client"""
        try:
            if user_id in self.connections and connection_id in self.connections[user_id]:
                connection_info = self.connections[user_id][connection_id]
                
                # Close WebSocket connection
                await self._close_connection(connection_info)
                
                # Remove from local storage
                del self.connections[user_id][connection_id]
                if not self.connections[user_id]:
                    del self.connections[user_id]
                
                # Remove from Redis
                await self._remove_connection_from_redis(user_id, connection_id)
                
                # Update database
                await self._update_connection_in_db(connection_info, disconnected=True)
                
                # Update user status if no more connections
                if not self._has_active_connections(user_id):
                    await self._update_user_status(user_id, UserStatus.OFFLINE)
                    await self._broadcast_user_status_change(user_id, UserStatus.OFFLINE)
                
                logger.info(f"WebSocket disconnected: user={user_id}, connection={connection_id}, reason={reason}")
                
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
    
    async def send_to_user(self, user_id: str, message: WebSocketMessage) -> bool:
        """Send message to all connections of a user"""
        success_count = 0
        total_connections = 0
        
        # Send to local connections
        if user_id in self.connections:
            for connection_id, connection_info in self.connections[user_id].items():
                if connection_info.is_active:
                    total_connections += 1
                    if await self.send_to_connection(user_id, connection_id, message):
                        success_count += 1
        
        # Send to connections on other servers (via Redis)
        await self._broadcast_message_via_redis(user_id, message)
        
        return success_count > 0 or total_connections == 0
    
    async def send_to_connection(self, user_id: str, connection_id: str, message: WebSocketMessage) -> bool:
        """Send message to a specific connection"""
        try:
            if (user_id in self.connections and 
                connection_id in self.connections[user_id] and
                self.connections[user_id][connection_id].is_active):
                
                connection_info = self.connections[user_id][connection_id]
                
                # Send message
                await connection_info.websocket.send_text(json.dumps(message.to_dict()))
                
                # Update last activity
                connection_info.last_ping = datetime.utcnow()
                
                return True
                
        except (WebSocketDisconnect, ConnectionClosed):
            # Connection closed, clean up
            await self.disconnect(user_id, connection_id, "connection_lost")
        except Exception as e:
            logger.error(f"Error sending message to connection {connection_id}: {e}")
            await self.disconnect(user_id, connection_id, "send_error")
        
        return False
    
    async def send_to_conversation(self, conversation_id: str, message: WebSocketMessage, exclude_user_id: Optional[str] = None):
        """Send message to all participants in a conversation"""
        try:
            # Get conversation participants from database
            async with AsyncSessionLocal() as session:
                participants = await self._get_conversation_participants(session, conversation_id)
            
            # Send to each participant
            for participant_id in participants:
                if participant_id != exclude_user_id:
                    message.conversation_id = conversation_id
                    await self.send_to_user(participant_id, message)
                    
        except Exception as e:
            logger.error(f"Error sending message to conversation {conversation_id}: {e}")
    
    async def broadcast_typing_indicator(self, user_id: str, conversation_id: str, is_typing: bool):
        """Broadcast typing indicator to conversation participants"""
        message = WebSocketMessage(
            type="typing_indicator",
            data={
                "user_id": user_id,
                "conversation_id": conversation_id,
                "is_typing": is_typing,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            user_id=user_id,
            conversation_id=conversation_id
        )
        
        await self.send_to_conversation(conversation_id, message, exclude_user_id=user_id)
        
        # Store/update typing indicator in database
        if is_typing:
            await self._store_typing_indicator(user_id, conversation_id)
        else:
            await self._remove_typing_indicator(user_id, conversation_id)
    
    async def handle_message(self, user_id: str, connection_id: str, raw_message: str):
        """Handle incoming WebSocket message"""
        try:
            # Parse message
            message_data = json.loads(raw_message)
            message_type = message_data.get("type")
            
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](user_id, connection_id, message_data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from user {user_id}")
        except Exception as e:
            logger.error(f"Error handling message from user {user_id}: {e}")
    
    def register_message_handler(self, message_type: str, handler: Callable):
        """Register a message handler for a specific type"""
        self.message_handlers[message_type] = handler
    
    def get_user_connections(self, user_id: str) -> List[str]:
        """Get all connection IDs for a user"""
        if user_id in self.connections:
            return [
                conn_id for conn_id, conn_info in self.connections[user_id].items()
                if conn_info.is_active
            ]
        return []
    
    def get_online_users(self) -> Set[str]:
        """Get set of all online user IDs"""
        return set(self.connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if user has any active connections"""
        return self._has_active_connections(user_id)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(
            len(connections) for connections in self.connections.values()
        )
    
    # Private methods
    
    def _has_active_connections(self, user_id: str) -> bool:
        """Check if user has any active connections"""
        if user_id not in self.connections:
            return False
        return any(
            conn_info.is_active 
            for conn_info in self.connections[user_id].values()
        )
    
    async def _close_connection(self, connection_info: ConnectionInfo):
        """Close a WebSocket connection"""
        try:
            connection_info.is_active = False
            if not connection_info.websocket.client_state.DISCONNECTED:
                await connection_info.websocket.close()
        except Exception as e:
            logger.error(f"Error closing connection: {e}")
    
    async def _heartbeat_loop(self):
        """Background task for sending heartbeat pings"""
        while not self._shutdown:
            try:
                await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
                
                current_time = datetime.utcnow()
                disconnected_connections = []
                
                for user_id, user_connections in self.connections.items():
                    for connection_id, connection_info in user_connections.items():
                        if connection_info.is_active:
                            # Check if connection is stale
                            time_since_ping = (current_time - connection_info.last_ping).total_seconds()
                            
                            if time_since_ping > settings.WS_TIMEOUT:
                                disconnected_connections.append((user_id, connection_id))
                            else:
                                # Send heartbeat ping
                                ping_message = WebSocketMessage(
                                    type="ping",
                                    data={"timestamp": current_time.isoformat()},
                                    timestamp=current_time
                                )
                                await self.send_to_connection(user_id, connection_id, ping_message)
                
                # Clean up stale connections
                for user_id, connection_id in disconnected_connections:
                    await self.disconnect(user_id, connection_id, "heartbeat_timeout")
                    
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
    
    async def _cleanup_loop(self):
        """Background task for cleaning up expired data"""
        while not self._shutdown:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                # Clean up expired typing indicators
                await self._cleanup_expired_typing_indicators()
                
                # Clean up stale Redis connection data
                await self._cleanup_redis_connections()
                
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
    
    def _register_default_handlers(self):
        """Register default message handlers"""
        self.register_message_handler("pong", self._handle_pong)
        self.register_message_handler("typing_start", self._handle_typing_start)
        self.register_message_handler("typing_stop", self._handle_typing_stop)
        self.register_message_handler("status_change", self._handle_status_change)
    
    async def _handle_pong(self, user_id: str, connection_id: str, message_data: Dict[str, Any]):
        """Handle pong response from client"""
        if user_id in self.connections and connection_id in self.connections[user_id]:
            self.connections[user_id][connection_id].last_ping = datetime.utcnow()
    
    async def _handle_typing_start(self, user_id: str, connection_id: str, message_data: Dict[str, Any]):
        """Handle typing start indicator"""
        conversation_id = message_data.get("conversation_id")
        if conversation_id:
            await self.broadcast_typing_indicator(user_id, conversation_id, True)
    
    async def _handle_typing_stop(self, user_id: str, connection_id: str, message_data: Dict[str, Any]):
        """Handle typing stop indicator"""
        conversation_id = message_data.get("conversation_id")
        if conversation_id:
            await self.broadcast_typing_indicator(user_id, conversation_id, False)
    
    async def _handle_status_change(self, user_id: str, connection_id: str, message_data: Dict[str, Any]):
        """Handle user status change"""
        try:
            new_status = UserStatus(message_data.get("status", "online"))
            await self._update_user_status(user_id, new_status)
            await self._broadcast_user_status_change(user_id, new_status)
        except ValueError:
            logger.warning(f"Invalid status change request from user {user_id}")
    
    async def _store_connection_in_redis(self, connection_info: ConnectionInfo):
        """Store connection info in Redis"""
        if self.redis_client:
            try:
                key = f"ws_connection:{connection_info.user_id}:{connection_info.connection_id}"
                data = {
                    "user_id": connection_info.user_id,
                    "connection_id": connection_info.connection_id,
                    "device_id": connection_info.device_id or "",
                    "device_type": connection_info.device_type or "",
                    "platform": connection_info.platform or "",
                    "connected_at": connection_info.connected_at.isoformat(),
                    "server_id": settings.SERVICE_NAME,
                }
                
                await self.redis_client.hset(key, mapping=data)
                await self.redis_client.expire(key, settings.WS_TIMEOUT * 2)
                
            except Exception as e:
                logger.error(f"Error storing connection in Redis: {e}")
    
    async def _remove_connection_from_redis(self, user_id: str, connection_id: str):
        """Remove connection info from Redis"""
        if self.redis_client:
            try:
                key = f"ws_connection:{user_id}:{connection_id}"
                await self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Error removing connection from Redis: {e}")
    
    async def _broadcast_message_via_redis(self, user_id: str, message: WebSocketMessage):
        """Broadcast message to other servers via Redis"""
        if self.redis_client:
            try:
                channel = f"ws_broadcast:{user_id}"
                await self.redis_client.publish(channel, json.dumps(message.to_dict()))
            except Exception as e:
                logger.error(f"Error broadcasting message via Redis: {e}")
    
    async def _update_user_status(self, user_id: str, status: UserStatus):
        """Update user status in Redis"""
        if self.redis_client:
            try:
                key = f"user_status:{user_id}"
                data = {
                    "status": status.value,
                    "last_updated": datetime.utcnow().isoformat()
                }
                await self.redis_client.hset(key, mapping=data)
                await self.redis_client.expire(key, 3600)  # 1 hour
            except Exception as e:
                logger.error(f"Error updating user status: {e}")
    
    async def _broadcast_user_status_change(self, user_id: str, status: UserStatus):
        """Broadcast user status change to interested parties"""
        if self.redis_client:
            try:
                message_data = {
                    "type": "user_status_change",
                    "data": {
                        "user_id": user_id,
                        "status": status.value,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
                
                # Publish to general status change channel
                await self.redis_client.publish("user_status_changes", json.dumps(message_data))
                
            except Exception as e:
                logger.error(f"Error broadcasting status change: {e}")
    
    async def _store_connection_in_db(self, connection_info: ConnectionInfo):
        """Store connection in database"""
        try:
            async with AsyncSessionLocal() as session:
                db_connection = UserConnection(
                    user_id=connection_info.user_id,
                    connection_id=connection_info.connection_id,
                    device_id=connection_info.device_id,
                    device_type=connection_info.device_type,
                    platform=connection_info.platform,
                    connected_at=connection_info.connected_at,
                    last_activity_at=connection_info.last_ping,
                    is_active=True
                )
                
                session.add(db_connection)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error storing connection in database: {e}")
    
    async def _update_connection_in_db(self, connection_info: ConnectionInfo, disconnected: bool = False):
        """Update connection in database"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import update
                
                stmt = update(UserConnection).where(
                    UserConnection.connection_id == connection_info.connection_id
                ).values(
                    last_activity_at=connection_info.last_ping,
                    is_active=not disconnected,
                    disconnected_at=datetime.utcnow() if disconnected else None
                )
                
                await session.execute(stmt)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error updating connection in database: {e}")
    
    async def _get_conversation_participants(self, session: AsyncSession, conversation_id: str) -> List[str]:
        """Get conversation participants from database"""
        try:
            from sqlalchemy import select
            from app.models.chat_models import conversation_participants
            
            stmt = select(conversation_participants.c.user_id).where(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.is_active == True
            )
            
            result = await session.execute(stmt)
            return [str(row[0]) for row in result.fetchall()]
            
        except Exception as e:
            logger.error(f"Error getting conversation participants: {e}")
            return []
    
    async def _store_typing_indicator(self, user_id: str, conversation_id: str):
        """Store typing indicator in database"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                
                # Check if indicator already exists
                stmt = select(TypingIndicator).where(
                    TypingIndicator.user_id == user_id,
                    TypingIndicator.conversation_id == conversation_id
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                
                expires_at = datetime.utcnow() + timedelta(seconds=settings.TYPING_INDICATOR_TIMEOUT)
                
                if existing:
                    # Update existing indicator
                    existing.expires_at = expires_at
                else:
                    # Create new indicator
                    indicator = TypingIndicator(
                        user_id=user_id,
                        conversation_id=conversation_id,
                        expires_at=expires_at
                    )
                    session.add(indicator)
                
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error storing typing indicator: {e}")
    
    async def _remove_typing_indicator(self, user_id: str, conversation_id: str):
        """Remove typing indicator from database"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import delete
                
                stmt = delete(TypingIndicator).where(
                    TypingIndicator.user_id == user_id,
                    TypingIndicator.conversation_id == conversation_id
                )
                
                await session.execute(stmt)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error removing typing indicator: {e}")
    
    async def _cleanup_expired_typing_indicators(self):
        """Clean up expired typing indicators"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import delete
                
                stmt = delete(TypingIndicator).where(
                    TypingIndicator.expires_at < datetime.utcnow()
                )
                
                result = await session.execute(stmt)
                await session.commit()
                
                if result.rowcount > 0:
                    logger.debug(f"Cleaned up {result.rowcount} expired typing indicators")
                    
        except Exception as e:
            logger.error(f"Error cleaning up typing indicators: {e}")
    
    async def _cleanup_redis_connections(self):
        """Clean up stale Redis connection data"""
        if self.redis_client:
            try:
                # This would be more complex in a real implementation
                # For now, we rely on Redis expiration
                pass
            except Exception as e:
                logger.error(f"Error cleaning up Redis connections: {e}")


# Global connection manager instance
connection_manager = WebSocketConnectionManager()
"""WebSocket manager for real-time admin updates."""

from typing import Dict, List
from fastapi import WebSocket
import json
import structlog
from datetime import datetime

logger = structlog.get_logger()


class WebSocketManager:
    """Manages WebSocket connections for real-time admin updates."""
    
    def __init__(self):
        # Store active connections by admin ID
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, admin_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[admin_id] = websocket
        self.connection_metadata[admin_id] = {
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow(),
        }
        
        logger.info("Admin connected via WebSocket", admin_id=admin_id)
        
        # Send welcome message with connection info
        await self.send_personal_message(
            {
                "type": "connection_established",
                "message": "Connected to admin dashboard",
                "timestamp": datetime.utcnow().isoformat(),
                "admin_id": admin_id
            },
            admin_id
        )
    
    def disconnect(self, admin_id: str):
        """Remove a WebSocket connection."""
        if admin_id in self.active_connections:
            del self.active_connections[admin_id]
        if admin_id in self.connection_metadata:
            del self.connection_metadata[admin_id]
            
        logger.info("Admin disconnected from WebSocket", admin_id=admin_id)
    
    async def send_personal_message(self, message: dict, admin_id: str):
        """Send a message to a specific admin."""
        if admin_id in self.active_connections:
            try:
                websocket = self.active_connections[admin_id]
                await websocket.send_text(json.dumps(message))
                
                # Update last ping
                if admin_id in self.connection_metadata:
                    self.connection_metadata[admin_id]["last_ping"] = datetime.utcnow()
                    
            except Exception as e:
                logger.error("Failed to send WebSocket message", admin_id=admin_id, error=str(e))
                # Remove broken connection
                self.disconnect(admin_id)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected admins."""
        disconnected_admins = []
        
        for admin_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error("Failed to broadcast to admin", admin_id=admin_id, error=str(e))
                disconnected_admins.append(admin_id)
        
        # Clean up disconnected admins
        for admin_id in disconnected_admins:
            self.disconnect(admin_id)
    
    async def broadcast_to_roles(self, message: dict, roles: List[str]):
        """Broadcast a message to admins with specific roles."""
        # Note: In a real implementation, you would need to track admin roles
        # For now, we'll broadcast to all and let the frontend filter
        message["target_roles"] = roles
        await self.broadcast_to_all(message)
    
    async def send_alert(self, alert_data: dict, admin_id: str = None):
        """Send an alert notification."""
        alert_message = {
            "type": "alert",
            "data": alert_data,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": alert_data.get("severity", "medium")
        }
        
        if admin_id:
            await self.send_personal_message(alert_message, admin_id)
        else:
            await self.broadcast_to_all(alert_message)
    
    async def send_metrics_update(self, metrics: dict):
        """Send real-time metrics update."""
        message = {
            "type": "metrics_update",
            "data": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_all(message)
    
    async def send_user_action_notification(self, action: str, user_data: dict):
        """Send notification about user actions (new registration, booking, etc.)."""
        message = {
            "type": "user_action",
            "action": action,
            "data": user_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_all(message)
    
    async def send_moderation_notification(self, content_type: str, content_id: str, action: str):
        """Send notification about content moderation actions."""
        message = {
            "type": "moderation_action",
            "content_type": content_type,
            "content_id": content_id,
            "action": action,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_all(message)
    
    async def send_financial_notification(self, transaction_type: str, amount: float, currency: str):
        """Send notification about financial transactions."""
        message = {
            "type": "financial_transaction",
            "transaction_type": transaction_type,
            "amount": amount,
            "currency": currency,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_all(message)
    
    def get_connected_admins(self) -> List[str]:
        """Get list of currently connected admin IDs."""
        return list(self.active_connections.keys())
    
    def get_connection_count(self) -> int:
        """Get number of active connections."""
        return len(self.active_connections)
    
    def get_connection_info(self, admin_id: str) -> dict:
        """Get connection metadata for an admin."""
        return self.connection_metadata.get(admin_id, {})
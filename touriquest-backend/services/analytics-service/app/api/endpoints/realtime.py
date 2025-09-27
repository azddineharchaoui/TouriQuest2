"""
Real-time Analytics API Endpoints

Provides live analytics data through WebSocket connections and REST endpoints
for real-time monitoring of user activity, bookings, and system events.
"""

from datetime import date, timedelta, datetime
from typing import Dict, List, Optional, Any, Set
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, extract, text
import logging
import json
import asyncio
import redis
from decimal import Decimal
import uuid

from app.core.database import get_analytics_db, get_warehouse_db
from app.services.analytics_service import AnalyticsService
from app.models.analytics_models import DataGranularity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["realtime-analytics"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, client_info: Dict[str, Any]):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = client_info
        logger.info(f"WebSocket connected: {client_info}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_info.pop(websocket, None)
            logger.info("WebSocket disconnected")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any], filter_func=None):
        disconnected = []
        for connection in self.active_connections:
            try:
                # Apply filter if provided
                if filter_func and not filter_func(self.connection_info.get(connection, {})):
                    continue
                    
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast to WebSocket: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    def get_connection_count(self) -> int:
        return len(self.active_connections)
    
    def get_connections_by_type(self, connection_type: str) -> List[WebSocket]:
        return [
            conn for conn, info in self.connection_info.items()
            if info.get('type') == connection_type
        ]

manager = ConnectionManager()

# Redis client for real-time data caching (optional)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
except:
    redis_client = None
    logger.warning("Redis not available, using in-memory caching")


@router.websocket("/realtime/events")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str = Query(..., description="Unique client identifier"),
    subscription_types: str = Query("all", description="Comma-separated event types to subscribe to")
):
    """
    WebSocket endpoint for real-time analytics events
    
    Subscription types:
    - active_users: Live user count and activity
    - bookings: Real-time booking events
    - revenue: Live revenue tracking  
    - errors: System error notifications
    - performance: Live performance metrics
    - all: All event types
    """
    
    client_info = {
        "client_id": client_id,
        "type": "realtime_analytics",
        "subscriptions": subscription_types.split(','),
        "connected_at": datetime.utcnow().isoformat()
    }
    
    await manager.connect(websocket, client_info)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "connection_status",
            "status": "connected",
            "client_id": client_id,
            "subscriptions": client_info["subscriptions"],
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Keep connection alive and handle messages
        while True:
            # Wait for client messages (heartbeat, subscription updates, etc.)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "heartbeat":
                    await manager.send_personal_message({
                        "type": "heartbeat_response",
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
                
                elif message.get("type") == "update_subscriptions":
                    new_subscriptions = message.get("subscriptions", [])
                    client_info["subscriptions"] = new_subscriptions
                    manager.connection_info[websocket] = client_info
                    
                    await manager.send_personal_message({
                        "type": "subscription_updated",
                        "subscriptions": new_subscriptions,
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
                
            except asyncio.TimeoutError:
                # Send periodic heartbeat
                await manager.send_personal_message({
                    "type": "server_heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


@router.get("/realtime/active-users")
async def get_active_users(
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get current active users and real-time activity metrics
    """
    try:
        # Get active users in the last 5 minutes
        active_users_query = text("""
            WITH recent_activity AS (
                SELECT 
                    user_id,
                    session_id,
                    device_type,
                    page_path,
                    activity_type,
                    MAX(activity_timestamp) as last_activity,
                    COUNT(*) as activity_count
                FROM user_activity_stream
                WHERE activity_timestamp >= NOW() - INTERVAL '5 minutes'
                GROUP BY user_id, session_id, device_type, page_path, activity_type
            ),
            active_summary AS (
                SELECT 
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(DISTINCT session_id) as active_sessions,
                    device_type,
                    COUNT(*) as total_activities
                FROM recent_activity
                GROUP BY device_type
            ),
            geographic_distribution AS (
                SELECT 
                    u.country,
                    u.city,
                    COUNT(DISTINCT u.user_id) as active_users_count
                FROM recent_activity ra
                JOIN user_locations u ON ra.user_id = u.user_id
                GROUP BY u.country, u.city
                ORDER BY active_users_count DESC
                LIMIT 20
            ),
            page_activity AS (
                SELECT 
                    page_path,
                    COUNT(DISTINCT user_id) as unique_visitors,
                    COUNT(*) as total_interactions,
                    AVG(EXTRACT(EPOCH FROM (NOW() - last_activity))) as avg_time_on_page
                FROM recent_activity
                WHERE activity_type = 'page_view'
                GROUP BY page_path
                ORDER BY unique_visitors DESC
                LIMIT 10
            )
            SELECT 
                (SELECT json_agg(row_to_json(active_summary)) FROM active_summary) as device_summary,
                (SELECT json_agg(row_to_json(geographic_distribution)) FROM geographic_distribution) as geographic_data,
                (SELECT json_agg(row_to_json(page_activity)) FROM page_activity) as page_data,
                (SELECT COUNT(DISTINCT user_id) FROM recent_activity) as total_active_users,
                (SELECT COUNT(DISTINCT session_id) FROM recent_activity) as total_active_sessions
        """)
        
        result = await warehouse_db.execute(active_users_query)
        row = result.fetchone()
        
        # Parse JSON results
        device_summary = json.loads(row.device_summary) if row.device_summary else []
        geographic_data = json.loads(row.geographic_data) if row.geographic_data else []
        page_data = json.loads(row.page_data) if row.page_data else []
        
        # Calculate additional metrics
        total_users = int(row.total_active_users or 0)
        total_sessions = int(row.total_active_sessions or 0)
        
        # Get trending metrics (compare with previous 5-minute window)
        trend_query = text("""
            SELECT 
                COUNT(DISTINCT user_id) as previous_active_users
            FROM user_activity_stream
            WHERE activity_timestamp BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() - INTERVAL '5 minutes'
        """)
        
        trend_result = await warehouse_db.execute(trend_query)
        trend_row = trend_result.fetchone()
        previous_users = int(trend_row.previous_active_users or 0)
        
        user_trend = "stable"
        trend_percentage = 0
        if previous_users > 0:
            trend_percentage = ((total_users - previous_users) / previous_users) * 100
            if trend_percentage > 5:
                user_trend = "increasing"
            elif trend_percentage < -5:
                user_trend = "decreasing"
        
        response_data = {
            "success": True,
            "data": {
                "current_metrics": {
                    "active_users": total_users,
                    "active_sessions": total_sessions,
                    "websocket_connections": manager.get_connection_count(),
                    "user_trend": user_trend,
                    "trend_percentage": round(trend_percentage, 2)
                },
                "device_breakdown": device_summary,
                "geographic_distribution": geographic_data,
                "popular_pages": page_data,
                "real_time_stats": {
                    "data_freshness_seconds": 30,  # Data is updated every 30 seconds
                    "last_updated": datetime.utcnow().isoformat()
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast update to WebSocket connections
        await manager.broadcast({
            "type": "active_users_update",
            "data": response_data["data"]
        }, lambda info: "active_users" in info.get("subscriptions", []) or "all" in info.get("subscriptions", []))
        
        return response_data
    
    except Exception as e:
        logger.error(f"Error in active users endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve active users: {str(e)}"
        )


@router.get("/realtime/live-bookings")
async def get_live_bookings(
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get real-time booking activity and conversion events
    """
    try:
        # Get live booking activity from the last 10 minutes
        live_bookings_query = text("""
            WITH recent_bookings AS (
                SELECT 
                    b.booking_id,
                    b.user_id,
                    b.experience_id,
                    b.booking_status,
                    b.total_amount,
                    b.currency,
                    b.booking_timestamp,
                    b.device_type,
                    e.experience_name,
                    e.category as experience_category,
                    u.country as user_country
                FROM bookings b
                JOIN experiences e ON b.experience_id = e.experience_id
                JOIN users u ON b.user_id = u.user_id
                WHERE b.booking_timestamp >= NOW() - INTERVAL '10 minutes'
            ),
            booking_summary AS (
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN booking_status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN booking_status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    SUM(CASE WHEN booking_status = 'confirmed' THEN total_amount ELSE 0 END) as confirmed_revenue,
                    COUNT(DISTINCT user_id) as unique_customers,
                    COUNT(DISTINCT experience_id) as experiences_booked,
                    AVG(total_amount) as avg_booking_value
                FROM recent_bookings
            ),
            top_experiences AS (
                SELECT 
                    experience_name,
                    experience_category,
                    COUNT(*) as booking_count,
                    SUM(total_amount) as total_revenue
                FROM recent_bookings
                WHERE booking_status = 'confirmed'
                GROUP BY experience_name, experience_category
                ORDER BY booking_count DESC
                LIMIT 10
            ),
            conversion_funnel AS (
                SELECT 
                    'views' as stage,
                    COUNT(DISTINCT user_id) as user_count
                FROM page_views 
                WHERE page_type = 'experience' AND view_timestamp >= NOW() - INTERVAL '10 minutes'
                
                UNION ALL
                
                SELECT 
                    'add_to_cart' as stage,
                    COUNT(DISTINCT user_id) as user_count
                FROM cart_events
                WHERE event_type = 'add_item' AND event_timestamp >= NOW() - INTERVAL '10 minutes'
                
                UNION ALL
                
                SELECT 
                    'checkout_started' as stage,
                    COUNT(DISTINCT user_id) as user_count
                FROM checkout_events
                WHERE event_type = 'checkout_start' AND event_timestamp >= NOW() - INTERVAL '10 minutes'
                
                UNION ALL
                
                SELECT 
                    'booking_completed' as stage,
                    COUNT(DISTINCT user_id) as user_count
                FROM recent_bookings
                WHERE booking_status = 'confirmed'
            )
            SELECT 
                (SELECT row_to_json(booking_summary) FROM booking_summary) as summary,
                (SELECT json_agg(row_to_json(top_experiences)) FROM top_experiences) as top_experiences,
                (SELECT json_agg(row_to_json(conversion_funnel)) FROM conversion_funnel) as funnel_data,
                (SELECT json_agg(
                    json_build_object(
                        'booking_id', booking_id,
                        'user_country', user_country,
                        'experience_name', experience_name,
                        'total_amount', total_amount,
                        'currency', currency,
                        'booking_status', booking_status,
                        'timestamp', booking_timestamp,
                        'device_type', device_type
                    )
                ) FROM recent_bookings ORDER BY booking_timestamp DESC LIMIT 20) as recent_bookings_list
        """)
        
        result = await warehouse_db.execute(live_bookings_query)
        row = result.fetchone()
        
        # Parse JSON results
        summary = json.loads(row.summary) if row.summary else {}
        top_experiences = json.loads(row.top_experiences) if row.top_experiences else []
        funnel_data = json.loads(row.funnel_data) if row.funnel_data else []
        recent_bookings_list = json.loads(row.recent_bookings_list) if row.recent_bookings_list else []
        
        # Calculate conversion rates
        funnel_dict = {item['stage']: item['user_count'] for item in funnel_data}
        
        conversion_rates = {}
        if funnel_dict.get('views', 0) > 0:
            conversion_rates['view_to_cart'] = round(
                (funnel_dict.get('add_to_cart', 0) / funnel_dict['views']) * 100, 2
            )
        if funnel_dict.get('add_to_cart', 0) > 0:
            conversion_rates['cart_to_checkout'] = round(
                (funnel_dict.get('checkout_started', 0) / funnel_dict['add_to_cart']) * 100, 2
            )
        if funnel_dict.get('checkout_started', 0) > 0:
            conversion_rates['checkout_to_booking'] = round(
                (funnel_dict.get('booking_completed', 0) / funnel_dict['checkout_started']) * 100, 2
            )
        if funnel_dict.get('views', 0) > 0:
            conversion_rates['overall_conversion'] = round(
                (funnel_dict.get('booking_completed', 0) / funnel_dict['views']) * 100, 2
            )
        
        response_data = {
            "success": True,
            "data": {
                "booking_summary": {
                    "total_bookings": int(summary.get('total_bookings', 0)),
                    "confirmed_bookings": int(summary.get('confirmed_bookings', 0)),
                    "pending_bookings": int(summary.get('pending_bookings', 0)),
                    "cancelled_bookings": int(summary.get('cancelled_bookings', 0)),
                    "confirmed_revenue": float(summary.get('confirmed_revenue', 0)),
                    "unique_customers": int(summary.get('unique_customers', 0)),
                    "experiences_booked": int(summary.get('experiences_booked', 0)),
                    "avg_booking_value": round(float(summary.get('avg_booking_value', 0)), 2)
                },
                "top_experiences": top_experiences,
                "conversion_funnel": {
                    "stages": funnel_data,
                    "conversion_rates": conversion_rates
                },
                "recent_bookings": recent_bookings_list,
                "real_time_stats": {
                    "data_window_minutes": 10,
                    "last_updated": datetime.utcnow().isoformat(),
                    "live_connections": manager.get_connection_count()
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast update to WebSocket connections
        await manager.broadcast({
            "type": "live_bookings_update",
            "data": response_data["data"]
        }, lambda info: "bookings" in info.get("subscriptions", []) or "all" in info.get("subscriptions", []))
        
        return response_data
    
    except Exception as e:
        logger.error(f"Error in live bookings endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve live bookings: {str(e)}"
        )


@router.get("/realtime/system-events")
async def get_system_events(
    event_types: Optional[str] = Query(None, description="Filter by event types (error,performance,security)"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get real-time system events, errors, and performance alerts
    """
    try:
        # Build filter conditions
        filter_conditions = ["se.event_timestamp >= NOW() - INTERVAL '5 minutes'"]
        params = {}
        
        if event_types:
            event_type_list = event_types.split(',')
            filter_conditions.append("se.event_type = ANY(:event_types)")
            params['event_types'] = event_type_list
        
        if severity:
            filter_conditions.append("se.severity = :severity")
            params['severity'] = severity
        
        filter_clause = " AND ".join(filter_conditions)
        
        # Get recent system events
        events_query = text(f"""
            WITH recent_events AS (
                SELECT 
                    se.event_id,
                    se.event_type,
                    se.severity,
                    se.service_name,
                    se.event_message,
                    se.event_details,
                    se.event_timestamp,
                    se.resolved,
                    se.impact_level
                FROM system_events se
                WHERE {filter_clause}
                ORDER BY se.event_timestamp DESC
                LIMIT 100
            ),
            event_summary AS (
                SELECT 
                    event_type,
                    severity,
                    COUNT(*) as event_count,
                    COUNT(CASE WHEN resolved = FALSE THEN 1 END) as unresolved_count,
                    MAX(event_timestamp) as latest_occurrence
                FROM recent_events
                GROUP BY event_type, severity
            ),
            service_health AS (
                SELECT 
                    service_name,
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as critical_events,
                    COUNT(CASE WHEN resolved = FALSE THEN 1 END) as unresolved_events,
                    CASE 
                        WHEN COUNT(CASE WHEN severity = 'critical' THEN 1 END) > 0 THEN 'critical'
                        WHEN COUNT(CASE WHEN severity = 'high' THEN 1 END) > 0 THEN 'degraded'
                        WHEN COUNT(CASE WHEN severity = 'medium' THEN 1 END) > 0 THEN 'warning'
                        ELSE 'healthy'
                    END as health_status
                FROM recent_events
                GROUP BY service_name
            )
            SELECT 
                (SELECT json_agg(row_to_json(recent_events)) FROM recent_events) as events_list,
                (SELECT json_agg(row_to_json(event_summary)) FROM event_summary) as summary,
                (SELECT json_agg(row_to_json(service_health)) FROM service_health) as service_health
        """)
        
        result = await warehouse_db.execute(events_query, params)
        row = result.fetchone()
        
        # Parse JSON results
        events_list = json.loads(row.events_list) if row.events_list else []
        summary = json.loads(row.summary) if row.summary else []
        service_health = json.loads(row.service_health) if row.service_health else []
        
        # Calculate overall system health score
        total_critical = sum(s.get('critical_events', 0) for s in service_health)
        total_services = len(service_health)
        healthy_services = sum(1 for s in service_health if s.get('health_status') == 'healthy')
        
        overall_health = "healthy"
        if total_critical > 0:
            overall_health = "critical"
        elif healthy_services < total_services * 0.8:  # Less than 80% healthy
            overall_health = "degraded"
        elif healthy_services < total_services:
            overall_health = "warning"
        
        health_score = round((healthy_services / total_services * 100), 2) if total_services > 0 else 100
        
        response_data = {
            "success": True,
            "data": {
                "system_overview": {
                    "overall_health": overall_health,
                    "health_score": health_score,
                    "total_services": total_services,
                    "healthy_services": healthy_services,
                    "total_events": len(events_list),
                    "critical_events": total_critical
                },
                "recent_events": events_list,
                "event_summary": summary,
                "service_health": service_health,
                "real_time_stats": {
                    "monitoring_window_minutes": 5,
                    "last_updated": datetime.utcnow().isoformat(),
                    "alert_conditions": {
                        "critical_threshold": "Any critical event",
                        "degraded_threshold": "Multiple high severity events",
                        "warning_threshold": "Medium severity events present"
                    }
                }
            },
            "filters_applied": {
                "event_types": event_types,
                "severity": severity
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast critical events to WebSocket connections
        critical_events = [e for e in events_list if e.get('severity') in ['critical', 'high']]
        if critical_events:
            await manager.broadcast({
                "type": "critical_system_events",
                "data": {
                    "events": critical_events,
                    "overall_health": overall_health
                }
            }, lambda info: "errors" in info.get("subscriptions", []) or "all" in info.get("subscriptions", []))
        
        return response_data
    
    except Exception as e:
        logger.error(f"Error in system events endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system events: {str(e)}"
        )


@router.post("/realtime/broadcast")
async def broadcast_message(
    message_type: str = Query(..., description="Type of message to broadcast"),
    message_data: str = Query(..., description="JSON string of message data"),
    target_subscriptions: Optional[str] = Query(None, description="Target subscription types")
) -> Dict[str, Any]:
    """
    Broadcast a custom message to connected WebSocket clients
    """
    try:
        # Parse message data
        try:
            data = json.loads(message_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid message_data JSON format")
        
        # Create broadcast message
        broadcast_msg = {
            "type": message_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine filter function
        filter_func = None
        if target_subscriptions:
            target_list = target_subscriptions.split(',')
            filter_func = lambda info: any(
                sub in info.get("subscriptions", []) for sub in target_list
            ) or "all" in info.get("subscriptions", [])
        
        # Broadcast message
        await manager.broadcast(broadcast_msg, filter_func)
        
        return {
            "success": True,
            "data": {
                "message_type": message_type,
                "target_connections": manager.get_connection_count(),
                "target_subscriptions": target_subscriptions,
                "broadcast_timestamp": datetime.utcnow().isoformat()
            },
            "message": "Message broadcasted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast message: {str(e)}"
        )


@router.get("/realtime/connections")
async def get_connection_info() -> Dict[str, Any]:
    """
    Get information about active WebSocket connections
    """
    try:
        connections_info = []
        
        for connection, info in manager.connection_info.items():
            connections_info.append({
                "client_id": info.get("client_id"),
                "connection_type": info.get("type"),
                "subscriptions": info.get("subscriptions", []),
                "connected_at": info.get("connected_at"),
                "connection_active": connection in manager.active_connections
            })
        
        # Group by subscription types
        subscription_stats = {}
        for info in connections_info:
            for sub in info["subscriptions"]:
                if sub not in subscription_stats:
                    subscription_stats[sub] = 0
                subscription_stats[sub] += 1
        
        return {
            "success": True,
            "data": {
                "total_connections": manager.get_connection_count(),
                "active_connections": connections_info,
                "subscription_statistics": subscription_stats,
                "connection_types": {
                    "realtime_analytics": len([
                        c for c in connections_info 
                        if c["connection_type"] == "realtime_analytics"
                    ])
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting connection info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve connection info: {str(e)}"
        )
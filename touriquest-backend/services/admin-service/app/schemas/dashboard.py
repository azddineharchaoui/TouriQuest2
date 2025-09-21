"""Dashboard-related Pydantic schemas."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal


class SystemMetrics(BaseModel):
    """System performance metrics."""
    cpu_usage_percent: float = Field(..., description="Current CPU usage percentage")
    memory_usage_percent: float = Field(..., description="Current memory usage percentage")
    disk_usage_percent: float = Field(..., description="Current disk usage percentage")
    active_connections: int = Field(..., description="Number of active database connections")
    api_response_time_avg: float = Field(..., description="Average API response time in seconds")
    api_success_rate: float = Field(..., description="API success rate percentage")
    database_query_time_avg: float = Field(..., description="Average database query time in ms")
    websocket_connections: int = Field(..., description="Active WebSocket connections")
    uptime_seconds: int = Field(..., description="Service uptime in seconds")
    health_status: str = Field(..., description="Overall system health status")


class UserMetrics(BaseModel):
    """User-related metrics."""
    total_users: int = Field(..., description="Total number of registered users")
    new_users_today: int = Field(..., description="New users registered today")
    new_users_this_week: int = Field(..., description="New users registered this week")
    new_users_this_month: int = Field(..., description="New users registered this month")
    active_users_today: int = Field(..., description="Users active today")
    verified_users: int = Field(..., description="Number of verified users")
    banned_users: int = Field(..., description="Number of banned users")
    user_growth_rate: float = Field(..., description="User growth rate percentage")
    geographic_distribution: Dict[str, int] = Field(..., description="Users by country")
    registration_trend: List[Dict[str, Any]] = Field(..., description="Daily registration trend")


class PropertyMetrics(BaseModel):
    """Property-related metrics."""
    total_properties: int = Field(..., description="Total number of properties")
    new_properties_today: int = Field(..., description="New properties listed today")
    new_properties_this_week: int = Field(..., description="New properties listed this week")
    new_properties_this_month: int = Field(..., description="New properties listed this month")
    pending_approval: int = Field(..., description="Properties pending approval")
    approved_properties: int = Field(..., description="Approved properties")
    rejected_properties: int = Field(..., description="Rejected properties")
    average_approval_time_hours: float = Field(..., description="Average approval time in hours")
    property_types: Dict[str, int] = Field(..., description="Properties by type")
    geographic_distribution: Dict[str, int] = Field(..., description="Properties by location")
    listing_trend: List[Dict[str, Any]] = Field(..., description="Daily listing trend")


class BookingMetrics(BaseModel):
    """Booking-related metrics."""
    total_bookings: int = Field(..., description="Total number of bookings")
    bookings_today: int = Field(..., description="Bookings made today")
    bookings_this_week: int = Field(..., description="Bookings made this week")
    bookings_this_month: int = Field(..., description="Bookings made this month")
    confirmed_bookings: int = Field(..., description="Confirmed bookings")
    cancelled_bookings: int = Field(..., description="Cancelled bookings")
    pending_bookings: int = Field(..., description="Pending bookings")
    average_booking_value: Decimal = Field(..., description="Average booking value")
    cancellation_rate: float = Field(..., description="Booking cancellation rate percentage")
    conversion_rate: float = Field(..., description="Booking conversion rate percentage")
    booking_trend: List[Dict[str, Any]] = Field(..., description="Daily booking trend")


class RevenueMetrics(BaseModel):
    """Revenue and financial metrics."""
    total_revenue: Decimal = Field(..., description="Total platform revenue")
    revenue_today: Decimal = Field(..., description="Revenue generated today")
    revenue_this_week: Decimal = Field(..., description="Revenue generated this week")
    revenue_this_month: Decimal = Field(..., description="Revenue generated this month")
    commission_earned: Decimal = Field(..., description="Total commission earned")
    host_payouts: Decimal = Field(..., description="Total host payouts")
    pending_payouts: Decimal = Field(..., description="Pending payout amount")
    refunds_issued: Decimal = Field(..., description="Total refunds issued")
    average_commission_rate: float = Field(..., description="Average commission rate")
    revenue_growth_rate: float = Field(..., description="Revenue growth rate percentage")
    revenue_trend: List[Dict[str, Any]] = Field(..., description="Daily revenue trend")


class ContentModerationMetrics(BaseModel):
    """Content moderation metrics."""
    total_content_items: int = Field(..., description="Total content items moderated")
    pending_review: int = Field(..., description="Content items pending review")
    approved_content: int = Field(..., description="Approved content items")
    rejected_content: int = Field(..., description="Rejected content items")
    auto_approved: int = Field(..., description="Auto-approved content items")
    manual_review_required: int = Field(..., description="Items requiring manual review")
    appeals_submitted: int = Field(..., description="Appeals submitted")
    appeals_resolved: int = Field(..., description="Appeals resolved")
    average_review_time_hours: float = Field(..., description="Average review time in hours")
    approval_rate: float = Field(..., description="Content approval rate percentage")
    content_types: Dict[str, int] = Field(..., description="Content items by type")
    moderation_trend: List[Dict[str, Any]] = Field(..., description="Daily moderation trend")


class AlertSummary(BaseModel):
    """Alert summary for dashboard."""
    id: str = Field(..., description="Alert ID")
    title: str = Field(..., description="Alert title")
    severity: str = Field(..., description="Alert severity level")
    status: str = Field(..., description="Alert status")
    created_at: datetime = Field(..., description="Alert creation time")
    is_acknowledged: bool = Field(..., description="Whether alert is acknowledged")


class DashboardOverview(BaseModel):
    """Complete dashboard overview."""
    system_metrics: SystemMetrics = Field(..., description="System performance metrics")
    user_metrics: UserMetrics = Field(..., description="User-related metrics")
    property_metrics: PropertyMetrics = Field(..., description="Property-related metrics")  
    booking_metrics: BookingMetrics = Field(..., description="Booking-related metrics")
    revenue_metrics: RevenueMetrics = Field(..., description="Revenue and financial metrics")
    moderation_metrics: ContentModerationMetrics = Field(..., description="Content moderation metrics")
    recent_alerts: List[AlertSummary] = Field(..., description="Recent system alerts")
    last_updated: datetime = Field(..., description="Last update timestamp")


class RealTimeStats(BaseModel):
    """Real-time statistics for live updates."""
    active_users_online: int = Field(..., description="Users currently online")
    active_bookings_processing: int = Field(..., description="Bookings being processed")
    pending_moderations: int = Field(..., description="Content items pending moderation")
    system_load: float = Field(..., description="Current system load")
    api_requests_per_minute: int = Field(..., description="API requests in last minute")
    websocket_connections: int = Field(..., description="Active WebSocket connections")
    alerts_count: int = Field(..., description="Active alerts count")
    timestamp: datetime = Field(..., description="Update timestamp")
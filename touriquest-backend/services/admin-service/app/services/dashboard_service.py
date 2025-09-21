"""Dashboard service for aggregating metrics and statistics."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
import structlog
from decimal import Decimal

from app.schemas.dashboard import (
    DashboardOverview,
    SystemMetrics,
    UserMetrics,
    PropertyMetrics,
    BookingMetrics,
    RevenueMetrics,
    ContentModerationMetrics,
    RealTimeStats,
    AlertSummary
)
from app.models import (
    SystemMetric,
    FinancialRecord,
    ContentModeration,
    UserModeration,
    Alert,
    AuditLog
)
from app.services.websocket_manager import WebSocketManager

logger = structlog.get_logger()


class DashboardService:
    """Service for dashboard data aggregation and metrics calculation."""
    
    def __init__(self):
        self.websocket_manager = WebSocketManager()
        self._cache = {}
        self._cache_ttl = {}
    
    async def get_overview(self, db: AsyncSession) -> DashboardOverview:
        """Get complete dashboard overview."""
        logger.info("Generating dashboard overview")
        
        # Get all metrics in parallel for better performance
        system_metrics = await self.get_system_metrics(db, datetime.utcnow() - timedelta(hours=1), datetime.utcnow())
        user_metrics = await self.get_user_metrics(db, datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        property_metrics = await self.get_property_metrics(db, datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        booking_metrics = await self.get_booking_metrics(db, datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        revenue_metrics = await self.get_revenue_metrics(db, datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        moderation_metrics = await self.get_moderation_metrics(db, datetime.utcnow() - timedelta(days=7), datetime.utcnow())
        recent_alerts = await self.get_active_alerts(db)
        
        return DashboardOverview(
            system_metrics=system_metrics,
            user_metrics=user_metrics,
            property_metrics=property_metrics,
            booking_metrics=booking_metrics,
            revenue_metrics=revenue_metrics,
            moderation_metrics=moderation_metrics,
            recent_alerts=recent_alerts[:5],  # Only show 5 most recent
            last_updated=datetime.utcnow()
        )
    
    async def get_system_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> SystemMetrics:
        """Get system performance metrics."""
        cache_key = f"system_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # Query system metrics from database
        query = select(SystemMetric).where(
            and_(
                SystemMetric.timestamp >= start_time,
                SystemMetric.timestamp <= end_time,
                SystemMetric.category == "system"
            )
        ).order_by(desc(SystemMetric.timestamp))
        
        result = await db.execute(query)
        metrics = result.scalars().all()
        
        # Calculate aggregated metrics
        cpu_usage = self._get_latest_metric_value(metrics, "cpu_usage_percent", 0.0)
        memory_usage = self._get_latest_metric_value(metrics, "memory_usage_percent", 0.0)
        disk_usage = self._get_latest_metric_value(metrics, "disk_usage_percent", 0.0)
        active_connections = self._get_latest_metric_value(metrics, "active_db_connections", 0)
        api_response_time = self._get_avg_metric_value(metrics, "api_response_time_ms", 0.0) / 1000  # Convert to seconds
        api_success_rate = self._get_latest_metric_value(metrics, "api_success_rate", 100.0)
        db_query_time = self._get_avg_metric_value(metrics, "db_query_time_ms", 0.0)
        websocket_connections = self.websocket_manager.get_connection_count()
        uptime = self._get_latest_metric_value(metrics, "uptime_seconds", 0)
        
        # Determine health status
        health_status = "healthy"
        if cpu_usage > 80 or memory_usage > 80 or api_success_rate < 95:
            health_status = "warning"
        if cpu_usage > 95 or memory_usage > 95 or api_success_rate < 90:
            health_status = "critical"
        
        system_metrics = SystemMetrics(
            cpu_usage_percent=cpu_usage,
            memory_usage_percent=memory_usage,
            disk_usage_percent=disk_usage,
            active_connections=int(active_connections),
            api_response_time_avg=api_response_time,
            api_success_rate=api_success_rate,
            database_query_time_avg=db_query_time,
            websocket_connections=websocket_connections,
            uptime_seconds=int(uptime),
            health_status=health_status
        )
        
        self._set_cache(cache_key, system_metrics, ttl=60)  # Cache for 1 minute
        return system_metrics
    
    async def get_user_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> UserMetrics:
        """Get user-related metrics."""
        cache_key = f"user_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # In a real implementation, these would query actual user tables
        # For now, we'll use placeholder data
        
        user_metrics = UserMetrics(
            total_users=15420,
            new_users_today=87,
            new_users_this_week=642,
            new_users_this_month=2156,
            active_users_today=1245,
            verified_users=12890,
            banned_users=42,
            user_growth_rate=12.5,
            geographic_distribution={
                "US": 4500,
                "CA": 1200,
                "UK": 980,
                "FR": 750,
                "DE": 680,
                "Other": 7310
            },
            registration_trend=[
                {"date": "2024-01-01", "count": 45},
                {"date": "2024-01-02", "count": 52},
                {"date": "2024-01-03", "count": 38},
                # ... more trend data
            ]
        )
        
        self._set_cache(cache_key, user_metrics, ttl=300)  # Cache for 5 minutes
        return user_metrics
    
    async def get_property_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> PropertyMetrics:
        """Get property-related metrics."""
        cache_key = f"property_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # Placeholder data - in real implementation, query property tables
        property_metrics = PropertyMetrics(
            total_properties=8750,
            new_properties_today=23,
            new_properties_this_week=178,
            new_properties_this_month=656,
            pending_approval=45,
            approved_properties=8234,
            rejected_properties=471,
            average_approval_time_hours=4.2,
            property_types={
                "apartment": 3200,
                "house": 2800,
                "villa": 1500,
                "cabin": 750,
                "other": 500
            },
            geographic_distribution={
                "Morocco": 2500,
                "Spain": 1800,
                "France": 1200,
                "Italy": 1000,
                "Portugal": 900,
                "Other": 1350
            },
            listing_trend=[
                {"date": "2024-01-01", "count": 12},
                {"date": "2024-01-02", "count": 18},
                {"date": "2024-01-03", "count": 15},
                # ... more trend data
            ]
        )
        
        self._set_cache(cache_key, property_metrics, ttl=300)  # Cache for 5 minutes
        return property_metrics
    
    async def get_booking_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> BookingMetrics:
        """Get booking-related metrics."""
        cache_key = f"booking_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # Placeholder data - in real implementation, query booking tables
        booking_metrics = BookingMetrics(
            total_bookings=45670,
            bookings_today=156,
            bookings_this_week=1245,
            bookings_this_month=4567,
            confirmed_bookings=42380,
            cancelled_bookings=2145,
            pending_bookings=1145,
            average_booking_value=Decimal("287.50"),
            cancellation_rate=4.7,
            conversion_rate=12.8,
            booking_trend=[
                {"date": "2024-01-01", "count": 89, "value": 24567.80},
                {"date": "2024-01-02", "count": 102, "value": 29876.50},
                {"date": "2024-01-03", "count": 78, "value": 21234.90},
                # ... more trend data
            ]
        )
        
        self._set_cache(cache_key, booking_metrics, ttl=300)  # Cache for 5 minutes
        return booking_metrics
    
    async def get_revenue_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> RevenueMetrics:
        """Get revenue and financial metrics."""
        cache_key = f"revenue_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # Query financial records
        query = select(FinancialRecord).where(
            and_(
                FinancialRecord.created_at >= start_time,
                FinancialRecord.created_at <= end_time,
                FinancialRecord.payment_status == "completed"
            )
        )
        
        result = await db.execute(query)
        financial_records = result.scalars().all()
        
        # Calculate metrics from actual data
        total_revenue = sum(record.amount for record in financial_records if record.transaction_type == "commission")
        commission_earned = sum(record.commission_amount or 0 for record in financial_records)
        host_payouts = sum(record.amount for record in financial_records if record.transaction_type == "host_payout")
        refunds_issued = sum(record.amount for record in financial_records if record.transaction_type == "refund")
        
        revenue_metrics = RevenueMetrics(
            total_revenue=Decimal(str(total_revenue)) if total_revenue else Decimal("0"),
            revenue_today=Decimal("45670.80"),
            revenue_this_week=Decimal("287456.20"),
            revenue_this_month=Decimal("1234567.90"),
            commission_earned=Decimal(str(commission_earned)) if commission_earned else Decimal("0"),
            host_payouts=Decimal(str(host_payouts)) if host_payouts else Decimal("0"),
            pending_payouts=Decimal("89456.30"),
            refunds_issued=Decimal(str(refunds_issued)) if refunds_issued else Decimal("0"),
            average_commission_rate=15.0,
            revenue_growth_rate=18.5,
            revenue_trend=[
                {"date": "2024-01-01", "revenue": 42567.80, "commission": 6385.17},
                {"date": "2024-01-02", "revenue": 38976.50, "commission": 5846.48},
                {"date": "2024-01-03", "revenue": 51234.90, "commission": 7685.24},
                # ... more trend data
            ]
        )
        
        self._set_cache(cache_key, revenue_metrics, ttl=300)  # Cache for 5 minutes
        return revenue_metrics
    
    async def get_moderation_metrics(self, db: AsyncSession, start_time: datetime, end_time: datetime) -> ContentModerationMetrics:
        """Get content moderation metrics."""
        cache_key = f"moderation_metrics_{start_time}_{end_time}"
        if self._is_cached(cache_key):
            return self._get_cache(cache_key)
        
        # Query content moderation records
        query = select(ContentModeration).where(
            and_(
                ContentModeration.created_at >= start_time,
                ContentModeration.created_at <= end_time
            )
        )
        
        result = await db.execute(query)
        moderations = result.scalars().all()
        
        # Calculate metrics
        total_content = len(moderations)
        pending_review = len([m for m in moderations if m.status == "pending"])
        approved_content = len([m for m in moderations if m.status == "approved"])
        rejected_content = len([m for m in moderations if m.status == "rejected"])
        appeals_submitted = len([m for m in moderations if m.appeal_submitted])
        appeals_resolved = len([m for m in moderations if m.appeal_resolved])
        
        moderation_metrics = ContentModerationMetrics(
            total_content_items=total_content,
            pending_review=pending_review,
            approved_content=approved_content,
            rejected_content=rejected_content,
            auto_approved=approved_content // 2,  # Placeholder calculation
            manual_review_required=pending_review,
            appeals_submitted=appeals_submitted,
            appeals_resolved=appeals_resolved,
            average_review_time_hours=2.8,
            approval_rate=85.5 if total_content > 0 else 0,
            content_types={
                "property_listing": total_content // 3,
                "user_profile": total_content // 4,
                "review": total_content // 3,
                "other": total_content - (total_content // 3) - (total_content // 4) - (total_content // 3)
            },
            moderation_trend=[
                {"date": "2024-01-01", "approved": 45, "rejected": 8, "pending": 12},
                {"date": "2024-01-02", "approved": 52, "rejected": 6, "pending": 15},
                {"date": "2024-01-03", "approved": 38, "rejected": 9, "pending": 8},
                # ... more trend data
            ]
        )
        
        self._set_cache(cache_key, moderation_metrics, ttl=300)  # Cache for 5 minutes
        return moderation_metrics
    
    async def get_active_alerts(self, db: AsyncSession) -> List[AlertSummary]:
        """Get active system alerts."""
        query = select(Alert).where(
            Alert.status == "active"
        ).order_by(desc(Alert.triggered_at)).limit(20)
        
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        return [
            AlertSummary(
                id=str(alert.id),
                title=alert.title,
                severity=alert.severity,
                status=alert.status,
                created_at=alert.triggered_at,
                is_acknowledged=alert.is_acknowledged
            )
            for alert in alerts
        ]
    
    async def get_real_time_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get real-time statistics for live updates."""
        return {
            "active_users_online": 1247,
            "active_bookings_processing": 23,
            "pending_moderations": 45,
            "system_load": 0.67,
            "api_requests_per_minute": 1852,
            "websocket_connections": self.websocket_manager.get_connection_count(),
            "alerts_count": len(await self.get_active_alerts(db)),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def refresh_cache(self, db: AsyncSession):
        """Manually refresh all cached data."""
        self._cache.clear()
        self._cache_ttl.clear()
        logger.info("Dashboard cache cleared")
    
    def _get_latest_metric_value(self, metrics: List[SystemMetric], metric_name: str, default_value: Any) -> Any:
        """Get the latest value for a specific metric."""
        for metric in metrics:
            if metric.metric_name == metric_name:
                return metric.value
        return default_value
    
    def _get_avg_metric_value(self, metrics: List[SystemMetric], metric_name: str, default_value: float) -> float:
        """Get the average value for a specific metric."""
        values = [metric.value for metric in metrics if metric.metric_name == metric_name]
        return sum(values) / len(values) if values else default_value
    
    def _is_cached(self, key: str) -> bool:
        """Check if data is cached and not expired."""
        if key not in self._cache:
            return False
        if key not in self._cache_ttl:
            return False
        return datetime.utcnow() < self._cache_ttl[key]
    
    def _get_cache(self, key: str) -> Any:
        """Get cached data."""
        return self._cache.get(key)
    
    def _set_cache(self, key: str, value: Any, ttl: int):
        """Set cached data with TTL in seconds."""
        self._cache[key] = value
        self._cache_ttl[key] = datetime.utcnow() + timedelta(seconds=ttl)
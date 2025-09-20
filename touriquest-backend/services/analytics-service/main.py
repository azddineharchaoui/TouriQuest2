"""
TouriQuest Analytics Service
FastAPI microservice for user behavior tracking, metrics, and reporting
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Analytics Service",
    description="User behavior tracking, metrics, and reporting microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("analytics-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Enums
class EventTypeEnum(str, Enum):
    PAGE_VIEW = "page_view"
    SEARCH = "search"
    PROPERTY_VIEW = "property_view"
    BOOKING_START = "booking_start"
    BOOKING_COMPLETE = "booking_complete"
    USER_REGISTER = "user_register"
    USER_LOGIN = "user_login"
    CHAT_MESSAGE = "chat_message"
    RECOMMENDATION_VIEW = "recommendation_view"
    SHARE = "share"
    REVIEW_SUBMIT = "review_submit"


class ReportTypeEnum(str, Enum):
    USER_ENGAGEMENT = "user_engagement"
    BOOKING_ANALYTICS = "booking_analytics"
    REVENUE_ANALYTICS = "revenue_analytics"
    CONTENT_PERFORMANCE = "content_performance"
    FUNNEL_ANALYSIS = "funnel_analysis"
    GEOGRAPHIC_ANALYTICS = "geographic_analytics"


# Pydantic models
class AnalyticsEvent(BaseModel):
    event_type: EventTypeEnum
    user_id: Optional[str] = None
    session_id: str
    properties: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}
    timestamp: Optional[datetime] = None


class EventResponse(BaseModel):
    event_id: str
    status: str
    message: str


class MetricsQuery(BaseModel):
    start_date: date
    end_date: date
    metrics: List[str]
    filters: Optional[Dict[str, Any]] = {}
    group_by: Optional[List[str]] = []


class MetricsResponse(BaseModel):
    metrics: Dict[str, Any]
    time_series: List[Dict[str, Any]]
    summary: Dict[str, Any]


class ReportRequest(BaseModel):
    report_type: ReportTypeEnum
    start_date: date
    end_date: date
    filters: Optional[Dict[str, Any]] = {}
    format: str = "json"  # json, csv, pdf


class UserAnalytics(BaseModel):
    user_id: str
    total_sessions: int
    total_page_views: int
    total_searches: int
    total_bookings: int
    total_revenue: float
    avg_session_duration: float
    last_activity: datetime
    favorite_destinations: List[str]
    device_types: Dict[str, int]


# Repository
class AnalyticsRepository(BaseRepository):
    """Analytics repository for database operations."""
    
    async def save_event(self, event: AnalyticsEvent) -> str:
        """Save analytics event."""
        event_id = str(uuid.uuid4())
        
        # In production, save to time-series database (InfluxDB, ClickHouse, etc.)
        logger.info(f"Saved analytics event: {event.event_type} for user {event.user_id}")
        return event_id
    
    async def get_metrics(self, query: MetricsQuery) -> Dict[str, Any]:
        """Get metrics for specified time range."""
        # Mock data - in production, query from analytics database
        return {
            "page_views": 1500,
            "unique_users": 300,
            "bookings": 45,
            "revenue": 12500.00,
            "conversion_rate": 3.0
        }
    
    async def get_user_analytics(self, user_id: str, days: int = 30) -> UserAnalytics:
        """Get analytics for specific user."""
        # Mock data
        return UserAnalytics(
            user_id=user_id,
            total_sessions=15,
            total_page_views=85,
            total_searches=23,
            total_bookings=2,
            total_revenue=850.00,
            avg_session_duration=180.5,
            last_activity=datetime.utcnow(),
            favorite_destinations=["Marrakech", "Fez", "Casablanca"],
            device_types={"desktop": 10, "mobile": 5}
        )
    
    async def get_funnel_analytics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get conversion funnel analytics."""
        return {
            "steps": [
                {"step": "page_view", "users": 1000, "conversion_rate": 100.0},
                {"step": "search", "users": 600, "conversion_rate": 60.0},
                {"step": "property_view", "users": 300, "conversion_rate": 30.0},
                {"step": "booking_start", "users": 100, "conversion_rate": 10.0},
                {"step": "booking_complete", "users": 45, "conversion_rate": 4.5}
            ],
            "overall_conversion_rate": 4.5
        }
    
    async def get_geographic_analytics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get geographic analytics."""
        return {
            "countries": [
                {"country": "Morocco", "users": 400, "bookings": 20, "revenue": 5000.00},
                {"country": "France", "users": 300, "bookings": 15, "revenue": 4500.00},
                {"country": "Spain", "users": 200, "bookings": 8, "revenue": 2000.00},
                {"country": "Germany", "users": 150, "bookings": 5, "revenue": 1500.00}
            ],
            "cities": [
                {"city": "Casablanca", "users": 200, "bookings": 12},
                {"city": "Paris", "users": 180, "bookings": 10},
                {"city": "Madrid", "users": 120, "bookings": 6}
            ]
        }
    
    async def get_content_performance(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get content performance analytics."""
        return {
            "top_properties": [
                {"property_id": "prop_1", "name": "La Mamounia", "views": 500, "bookings": 15},
                {"property_id": "prop_2", "name": "Riad Yasmine", "views": 300, "bookings": 10},
                {"property_id": "prop_3", "name": "Hotel Atlas", "views": 250, "bookings": 8}
            ],
            "top_searches": [
                {"query": "marrakech hotels", "count": 150},
                {"query": "fez riads", "count": 120},
                {"query": "casablanca business", "count": 100}
            ],
            "top_destinations": [
                {"destination": "Marrakech", "interest_score": 0.85},
                {"destination": "Fez", "interest_score": 0.75},
                {"destination": "Chefchaouen", "interest_score": 0.65}
            ]
        }


# Analytics processing service
class AnalyticsProcessor:
    """Service for processing and aggregating analytics data."""
    
    def __init__(self):
        self.session_cache = {}  # In production, use Redis
    
    async def process_event(self, event: AnalyticsEvent) -> Dict[str, Any]:
        """Process analytics event and update aggregations."""
        
        # Update session data
        session_data = self.session_cache.get(event.session_id, {
            "start_time": datetime.utcnow(),
            "events": [],
            "user_id": event.user_id
        })
        
        session_data["events"].append({
            "event_type": event.event_type,
            "timestamp": event.timestamp or datetime.utcnow(),
            "properties": event.properties
        })
        
        self.session_cache[event.session_id] = session_data
        
        # Process specific event types
        if event.event_type == EventTypeEnum.BOOKING_COMPLETE:
            await self._process_booking_event(event)
        elif event.event_type == EventTypeEnum.SEARCH:
            await self._process_search_event(event)
        elif event.event_type == EventTypeEnum.PROPERTY_VIEW:
            await self._process_property_view_event(event)
        
        return {"status": "processed", "session_events": len(session_data["events"])}
    
    async def _process_booking_event(self, event: AnalyticsEvent):
        """Process booking completion event."""
        booking_value = event.properties.get("booking_value", 0)
        property_id = event.properties.get("property_id")
        
        # Update revenue metrics, property performance, etc.
        logger.info(f"Processed booking event: ${booking_value} for property {property_id}")
    
    async def _process_search_event(self, event: AnalyticsEvent):
        """Process search event."""
        search_query = event.properties.get("query", "")
        filters = event.properties.get("filters", {})
        
        # Update search analytics, popular destinations, etc.
        logger.info(f"Processed search event: {search_query}")
    
    async def _process_property_view_event(self, event: AnalyticsEvent):
        """Process property view event."""
        property_id = event.properties.get("property_id")
        
        # Update property view counts, recommendation scores, etc.
        logger.info(f"Processed property view: {property_id}")


# Dependencies
def get_analytics_repository() -> AnalyticsRepository:
    """Get analytics repository dependency."""
    return AnalyticsRepository()


analytics_processor = AnalyticsProcessor()


# API Routes
@app.post("/api/v1/analytics/events", response_model=EventResponse)
async def track_event(
    event: AnalyticsEvent,
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Track analytics event."""
    
    # Set timestamp if not provided
    if not event.timestamp:
        event.timestamp = datetime.utcnow()
    
    # Save event
    event_id = await analytics_repo.save_event(event)
    
    # Process event
    await analytics_processor.process_event(event)
    
    return EventResponse(
        event_id=event_id,
        status="success",
        message="Event tracked successfully"
    )


@app.post("/api/v1/analytics/events/batch")
async def track_events_batch(
    events: List[AnalyticsEvent],
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Track multiple analytics events."""
    
    event_ids = []
    for event in events:
        if not event.timestamp:
            event.timestamp = datetime.utcnow()
        
        event_id = await analytics_repo.save_event(event)
        await analytics_processor.process_event(event)
        event_ids.append(event_id)
    
    return {
        "status": "success",
        "events_tracked": len(event_ids),
        "event_ids": event_ids
    }


@app.post("/api/v1/analytics/metrics", response_model=MetricsResponse)
async def get_metrics(
    query: MetricsQuery,
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get analytics metrics."""
    
    # Check admin permissions in production
    
    metrics_data = await analytics_repo.get_metrics(query)
    
    # Generate time series data
    time_series = []
    current_date = query.start_date
    while current_date <= query.end_date:
        time_series.append({
            "date": current_date.isoformat(),
            "metrics": {
                "page_views": 50,  # Mock data
                "users": 10,
                "bookings": 2
            }
        })
        current_date += timedelta(days=1)
    
    return MetricsResponse(
        metrics=metrics_data,
        time_series=time_series,
        summary={
            "total_users": 1500,
            "total_revenue": 25000.00,
            "avg_conversion_rate": 3.2
        }
    )


@app.get("/api/v1/analytics/users/{user_id}", response_model=UserAnalytics)
async def get_user_analytics(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get analytics for specific user."""
    
    # Users can only view their own analytics, admins can view any
    if user_id != current_user["id"]:
        # Check admin role in production
        pass
    
    user_analytics = await analytics_repo.get_user_analytics(user_id, days)
    return user_analytics


@app.get("/api/v1/analytics/funnel")
async def get_funnel_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get conversion funnel analytics."""
    
    funnel_data = await analytics_repo.get_funnel_analytics(start_date, end_date)
    return funnel_data


@app.get("/api/v1/analytics/geographic")
async def get_geographic_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get geographic analytics."""
    
    geo_data = await analytics_repo.get_geographic_analytics(start_date, end_date)
    return geo_data


@app.get("/api/v1/analytics/content")
async def get_content_performance(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get content performance analytics."""
    
    content_data = await analytics_repo.get_content_performance(start_date, end_date)
    return content_data


@app.get("/api/v1/analytics/dashboard")
async def get_dashboard_data(
    period: str = Query("30d", regex="^(1d|7d|30d|90d|1y)$"),
    current_user: dict = Depends(get_current_user),
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository)
):
    """Get dashboard analytics data."""
    
    # Calculate date range based on period
    end_date = date.today()
    if period == "1d":
        start_date = end_date - timedelta(days=1)
    elif period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    else:  # 1y
        start_date = end_date - timedelta(days=365)
    
    # Get all dashboard data
    metrics = await analytics_repo.get_metrics(MetricsQuery(
        start_date=start_date,
        end_date=end_date,
        metrics=["users", "bookings", "revenue", "conversion_rate"]
    ))
    
    funnel = await analytics_repo.get_funnel_analytics(start_date, end_date)
    geographic = await analytics_repo.get_geographic_analytics(start_date, end_date)
    content = await analytics_repo.get_content_performance(start_date, end_date)
    
    return {
        "period": period,
        "date_range": {"start": start_date, "end": end_date},
        "metrics": metrics,
        "funnel": funnel,
        "geographic": geographic,
        "content": content
    }


@app.post("/api/v1/analytics/reports")
async def generate_report(
    report_request: ReportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate analytics report."""
    
    # Check admin permissions
    
    report_id = str(uuid.uuid4())
    
    # Queue report generation
    logger.info(f"Generating {report_request.report_type} report for {report_request.start_date} to {report_request.end_date}")
    
    return {
        "report_id": report_id,
        "status": "queued",
        "message": "Report generation started",
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "analytics-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
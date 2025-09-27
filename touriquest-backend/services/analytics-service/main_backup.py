"""""""""

Analytics Service Main Application

"""Analytics Service Main ApplicationAnalytics Service Main Application



from fastapi import FastAPI, Request""""""

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse

from contextlib import asynccontextmanager

import loggingfrom fastapi import FastAPI, Requestfrom fastapi import FastAPI, Request

from datetime import datetime

from fastapi.middleware.cors import CORSMiddlewarefrom fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.core.database import init_db, close_dbfrom fastapi.responses import JSONResponsefrom fastapi.responses import JSONResponse



# Import routersfrom contextlib import asynccontextmanagerfrom contextlib import asynccontextmanager

from app.api.endpoints import dashboard, revenue, users, properties, trends

import loggingimport logging



# Configure loggingfrom datetime import datetimefrom datetime import datetime

logging.basicConfig(

    level=logging.INFO,

    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

)from app.core.config import settingsfrom app.core.config import settings

logger = logging.getLogger(__name__)

from app.core.database import init_db, close_dbfrom app.core.database import init_db, close_db



@asynccontextmanager

async def lifespan(app: FastAPI):

    """Application lifespan manager"""# Import routers# Import routers

    logger.info("Starting Analytics Service...")

    from app.api.endpoints import dashboard, revenue, users, properties, trendsfrom app.api.endpoints import dashboard, revenue, users, properties, trends

    # Initialize database connections

    await init_db()

    logger.info("Database connections initialized")

    

    yield

    # Configure logging# Configure logging

    # Cleanup

    logger.info("Shutting down Analytics Service...")logging.basicConfig(logging.basicConfig(

    await close_db()

    logger.info("Database connections closed")    level=logging.INFO,    level=logging.INFO,



    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Create FastAPI application

app = FastAPI())

    title="TouriQuest Analytics Service",

    description="Comprehensive analytics and business intelligence service for TouriQuest platform",logger = logging.getLogger(__name__)logger = logging.getLogger(__name__)

    version="1.0.0",

    docs_url="/docs",

    redoc_url="/redoc",

    openapi_url="/openapi.json",

    lifespan=lifespan

)@asynccontextmanager@asynccontextmanager



# Add CORS middlewareasync def lifespan(app: FastAPI):async def lifespan(app: FastAPI):

app.add_middleware(

    CORSMiddleware,    """Application lifespan manager"""    """Application lifespan manager"""

    allow_origins=settings.ALLOWED_ORIGINS,

    allow_credentials=True,    logger.info("Starting Analytics Service...")    logger.info("Starting Analytics Service...")

    allow_methods=["*"],

    allow_headers=["*"],        

)

    # Initialize database connections    # Initialize database connections



# Global exception handler    await init_db()    await init_db()

@app.exception_handler(Exception)

async def global_exception_handler(request: Request, exc: Exception):    logger.info("Database connections initialized")    logger.info("Database connections initialized")

    """Global exception handler for unhandled errors"""

    logger.error(f"Unhandled exception: {exc}", exc_info=True)        

    return JSONResponse(

        status_code=500,    yield    yield

        content={

            "success": False,        

            "error": "Internal server error",

            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",    # Cleanup    # Cleanup

            "timestamp": datetime.utcnow().isoformat()

        }    logger.info("Shutting down Analytics Service...")    logger.info("Shutting down Analytics Service...")

    )

    await close_db()    await close_db()



# Health check endpoint    logger.info("Database connections closed")    logger.info("Database connections closed")

@app.get("/health")

async def health_check():

    """Health check endpoint"""

    return {

        "status": "healthy",

        "service": "TouriQuest Analytics Service",# Create FastAPI application# Create FastAPI application

        "version": "1.0.0",

        "timestamp": datetime.utcnow().isoformat()app = FastAPI(app = FastAPI(

    }

    title="TouriQuest Analytics Service",    title="TouriQuest Analytics Service",



# Root endpoint    description="Comprehensive analytics and business intelligence service for TouriQuest platform",    description="Comprehensive analytics and business intelligence service for TouriQuest platform",

@app.get("/")

async def root():    version="1.0.0",    version="1.0.0",

    """Root endpoint with service information"""

    return {    docs_url="/docs",    docs_url="/docs",

        "service": "TouriQuest Analytics Service",

        "version": "1.0.0",    redoc_url="/redoc",    redoc_url="/redoc",

        "description": "Comprehensive analytics and business intelligence service",

        "docs_url": "/docs",    openapi_url="/openapi.json",    openapi_url="/openapi.json",

        "health_url": "/health",

        "endpoints": {    lifespan=lifespan    lifespan=lifespan

            "dashboard": "/analytics/dashboard",

            "revenue": "/analytics/revenue",))

            "users": "/analytics/users",

            "properties": "/analytics/properties",

            "trends": "/analytics/trends"

        },# Add CORS middleware# Add CORS middleware

        "timestamp": datetime.utcnow().isoformat()

    }app.add_middleware(app.add_middleware(



    CORSMiddleware,    CORSMiddleware,

# Include API routers

app.include_router(dashboard.router)    allow_origins=settings.ALLOWED_ORIGINS,    allow_origins=settings.ALLOWED_ORIGINS,

app.include_router(revenue.router)

app.include_router(users.router)    allow_credentials=True,    allow_credentials=True,

app.include_router(properties.router)

app.include_router(trends.router)
app.include_router(pois.router)
app.include_router(experiences.router)
app.include_router(traffic.router)
app.include_router(conversion.router)
app.include_router(retention.router)    allow_methods=["*"],



    allow_headers=["*"],    allow_headers=["*"],

# Additional middleware for request logging

@app.middleware("http")))

async def log_requests(request: Request, call_next):

    """Log all incoming requests"""

    start_time = datetime.utcnow()

    

    # Log request

    logger.info(f"Request: {request.method} {request.url}")# Global exception handler# Global exception handler

    

    # Process request@app.exception_handler(Exception)@app.exception_handler(Exception)

    response = await call_next(request)

    async def global_exception_handler(request: Request, exc: Exception):async def global_exception_handler(request: Request, exc: Exception):

    # Calculate processing time

    process_time = (datetime.utcnow() - start_time).total_seconds()    """Global exception handler for unhandled errors"""    """Global exception handler for unhandled errors"""

    

    # Log response    logger.error(f"Unhandled exception: {exc}", exc_info=True)    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    logger.info(f"Response: {response.status_code} | Processing time: {process_time:.3f}s")

        return JSONResponse(    return JSONResponse(

    # Add processing time to response headers

    response.headers["X-Process-Time"] = str(process_time)        status_code=500,        status_code=500,

    

    return response        content={        content={



            "success": False,            "success": False,

if __name__ == "__main__":

    import uvicorn            "error": "Internal server error",            "error": "Internal server error",

    

    uvicorn.run(            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",

        "main:app",

        host="0.0.0.0",            "timestamp": datetime.utcnow().isoformat()            "timestamp": datetime.utcnow().isoformat()

        port=8000,

        reload=settings.DEBUG,        }        }

        log_level="info"

    )    )    )





# Health check endpoint# Health check endpoint

@app.get("/health")@app.get("/health")

async def health_check():async def health_check():

    """Health check endpoint"""    """Health check endpoint"""

    return {    return {

        "status": "healthy",        "status": "healthy",

        "service": "TouriQuest Analytics Service",        "service": "TouriQuest Analytics Service",

        "version": "1.0.0",        "version": "1.0.0",

        "timestamp": datetime.utcnow().isoformat()        "timestamp": datetime.utcnow().isoformat()

    }    }





# Root endpoint# Root endpoint

@app.get("/")@app.get("/")

async def root():async def root():

    """Root endpoint with service information"""    """Root endpoint with service information"""

    return {    return {

        "service": "TouriQuest Analytics Service",        "service": "TouriQuest Analytics Service",

        "version": "1.0.0",        "version": "1.0.0",

        "description": "Comprehensive analytics and business intelligence service",        "description": "Comprehensive analytics and business intelligence service",

        "docs_url": "/docs",        "docs_url": "/docs",

        "health_url": "/health",        "health_url": "/health",

        "endpoints": {        "endpoints": {

            "dashboard": "/analytics/dashboard",            "dashboard": "/analytics/dashboard",

            "revenue": "/analytics/revenue",            "revenue": "/analytics/revenue",

            "users": "/analytics/users",            "users": "/analytics/users",

            "properties": "/analytics/properties",            "properties": "/analytics/properties",

            "trends": "/analytics/trends"            "trends": "/analytics/trends"

        },        },

        "timestamp": datetime.utcnow().isoformat()        "timestamp": datetime.utcnow().isoformat()

    }    }





# Include API routers# Include API routers

app.include_router(dashboard.router)app.include_router(dashboard.router)

app.include_router(revenue.router)app.include_router(revenue.router)

app.include_router(users.router)app.include_router(users.router)

app.include_router(properties.router)app.include_router(properties.router)

app.include_router(trends.router)app.include_router(trends.router)

    USER_LOGIN = "user_login"

    CHAT_MESSAGE = "chat_message"

# Additional middleware for request logging    RECOMMENDATION_VIEW = "recommendation_view"

@app.middleware("http")    SHARE = "share"

async def log_requests(request: Request, call_next):    REVIEW_SUBMIT = "review_submit"

    """Log all incoming requests"""

    start_time = datetime.utcnow()

    class ReportTypeEnum(str, Enum):

    # Log request    USER_ENGAGEMENT = "user_engagement"

    logger.info(f"Request: {request.method} {request.url}")    BOOKING_ANALYTICS = "booking_analytics"

        REVENUE_ANALYTICS = "revenue_analytics"

    # Process request    CONTENT_PERFORMANCE = "content_performance"

    response = await call_next(request)    FUNNEL_ANALYSIS = "funnel_analysis"

        GEOGRAPHIC_ANALYTICS = "geographic_analytics"

    # Calculate processing time

    process_time = (datetime.utcnow() - start_time).total_seconds()

    # Pydantic models

    # Log responseclass AnalyticsEvent(BaseModel):

    logger.info(f"Response: {response.status_code} | Processing time: {process_time:.3f}s")    event_type: EventTypeEnum

        user_id: Optional[str] = None

    # Add processing time to response headers    session_id: str

    response.headers["X-Process-Time"] = str(process_time)    properties: Dict[str, Any] = {}

        metadata: Dict[str, Any] = {}

    return response    timestamp: Optional[datetime] = None





if __name__ == "__main__":class EventResponse(BaseModel):

    import uvicorn    event_id: str

        status: str

    uvicorn.run(    message: str

        "main:app",

        host="0.0.0.0",

        port=8000,class MetricsQuery(BaseModel):

        reload=settings.DEBUG,    start_date: date

        log_level="info"    end_date: date

    )    metrics: List[str]
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
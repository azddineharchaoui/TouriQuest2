"""
TouriQuest API Gateway - Kong/Nginx reverse proxy
"""
from typing import List, Dict, Any
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter
import time

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest API Gateway",
    description="Centralized API Gateway for TouriQuest microservices",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("api-gateway")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "https://touriquest.com",
        "https://app.touriquest.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "*.touriquest.com"]
)

# Service registry
SERVICES = {
    "auth": {
        "url": "http://auth-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "user": {
        "url": "http://user-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "property": {
        "url": "http://property-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "booking": {
        "url": "http://booking-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "poi": {
        "url": "http://poi-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "experience": {
        "url": "http://experience-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "ai": {
        "url": "http://ai-service:8000",
        "health_endpoint": "/health",
        "timeout": 60.0,  # AI operations may take longer
    },
    "media": {
        "url": "http://media-service:8000",
        "health_endpoint": "/health",
        "timeout": 45.0,  # File operations may take longer
    },
    "notification": {
        "url": "http://notification-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "analytics": {
        "url": "http://analytics-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
    "admin": {
        "url": "http://admin-service:8000",
        "health_endpoint": "/health",
        "timeout": 30.0,
    },
}

# Route mappings
ROUTE_MAPPINGS = {
    "/api/v1/auth": "auth",
    "/api/v1/users": "user",
    "/api/v1/properties": "property",
    "/api/v1/bookings": "booking",
    "/api/v1/pois": "poi",
    "/api/v1/experiences": "experience",
    "/api/v1/ai": "ai",
    "/api/v1/media": "media",
    "/api/v1/notifications": "notification",
    "/api/v1/analytics": "analytics",
    "/api/v1/admin": "admin",
}


class LoadBalancer:
    """Simple round-robin load balancer."""
    
    def __init__(self):
        self.current_index = {}
    
    def get_service_url(self, service_name: str) -> str:
        """Get service URL with load balancing."""
        service_config = SERVICES.get(service_name)
        if not service_config:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # For now, return single URL
        # In production, this would balance between multiple instances
        return service_config["url"]


load_balancer = LoadBalancer()
rate_limiter = RateLimiter()


@app.middleware("http")
async def gateway_middleware(request: Request, call_next):
    """Gateway middleware for routing and monitoring."""
    start_time = time.time()
    
    # Add request ID
    request_id = request.headers.get("X-Request-ID", str(int(time.time() * 1000)))
    
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"gateway_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 1000, 60):  # 1000 req/min
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"}
        )
    
    # Process request
    response = await call_next(request)
    
    # Add security headers
    response = SecurityHeaders.add_security_headers(response)
    
    # Add request ID to response
    response.headers["X-Request-ID"] = request_id
    
    # Log request
    duration = time.time() - start_time
    logger.info(
        "Gateway request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration=duration,
        request_id=request_id,
        client_ip=client_ip,
    )
    
    return response


async def proxy_request(request: Request, service_name: str, path: str) -> Response:
    """Proxy request to microservice."""
    service_url = load_balancer.get_service_url(service_name)
    target_url = f"{service_url}{path}"
    
    # Prepare headers
    headers = dict(request.headers)
    headers["X-Forwarded-For"] = request.client.host
    headers["X-Forwarded-Proto"] = request.url.scheme
    headers["X-Forwarded-Host"] = request.headers.get("host", "")
    
    # Remove hop-by-hop headers
    hop_by_hop_headers = [
        "connection", "keep-alive", "proxy-authenticate",
        "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade"
    ]
    for header in hop_by_hop_headers:
        headers.pop(header, None)
    
    try:
        async with httpx.AsyncClient() as client:
            # Get request body
            body = await request.body()
            
            # Make request to service
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params,
                timeout=SERVICES[service_name]["timeout"],
            )
            
            # Prepare response headers
            response_headers = dict(response.headers)
            
            # Remove hop-by-hop headers from response
            for header in hop_by_hop_headers:
                response_headers.pop(header, None)
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get("content-type")
            )
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Service timeout")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service unavailable")
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(status_code=502, detail="Bad gateway")


# Route handlers
@app.api_route(
    "/api/v1/auth/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def auth_proxy(request: Request, path: str):
    """Proxy to auth service."""
    return await proxy_request(request, "auth", f"/api/v1/auth/{path}")


@app.api_route(
    "/api/v1/users/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def user_proxy(request: Request, path: str):
    """Proxy to user service."""
    return await proxy_request(request, "user", f"/api/v1/users/{path}")


@app.api_route(
    "/api/v1/properties/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def property_proxy(request: Request, path: str):
    """Proxy to property service."""
    return await proxy_request(request, "property", f"/api/v1/properties/{path}")


@app.api_route(
    "/api/v1/bookings/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def booking_proxy(request: Request, path: str):
    """Proxy to booking service."""
    return await proxy_request(request, "booking", f"/api/v1/bookings/{path}")


@app.api_route(
    "/api/v1/pois/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def poi_proxy(request: Request, path: str):
    """Proxy to POI service."""
    return await proxy_request(request, "poi", f"/api/v1/pois/{path}")


@app.api_route(
    "/api/v1/experiences/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def experience_proxy(request: Request, path: str):
    """Proxy to experience service."""
    return await proxy_request(request, "experience", f"/api/v1/experiences/{path}")


@app.api_route(
    "/api/v1/ai/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def ai_proxy(request: Request, path: str):
    """Proxy to AI service."""
    return await proxy_request(request, "ai", f"/api/v1/ai/{path}")


@app.api_route(
    "/api/v1/media/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def media_proxy(request: Request, path: str):
    """Proxy to media service."""
    return await proxy_request(request, "media", f"/api/v1/media/{path}")


@app.api_route(
    "/api/v1/notifications/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def notification_proxy(request: Request, path: str):
    """Proxy to notification service."""
    return await proxy_request(request, "notification", f"/api/v1/notifications/{path}")


@app.api_route(
    "/api/v1/analytics/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def analytics_proxy(request: Request, path: str):
    """Proxy to analytics service."""
    return await proxy_request(request, "analytics", f"/api/v1/analytics/{path}")


@app.api_route(
    "/api/v1/admin/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def admin_proxy(request: Request, path: str):
    """Proxy to admin service."""
    return await proxy_request(request, "admin", f"/api/v1/admin/{path}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "TouriQuest API Gateway",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": int(time.time()),
    }


@app.get("/services")
async def list_services():
    """List all available services."""
    return {
        "services": list(SERVICES.keys()),
        "routes": ROUTE_MAPPINGS,
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check for all services."""
    health_status = {"gateway": "healthy", "services": {}}
    
    async with httpx.AsyncClient() as client:
        for service_name, config in SERVICES.items():
            try:
                health_url = f"{config['url']}{config['health_endpoint']}"
                response = await client.get(health_url, timeout=5.0)
                
                if response.status_code == 200:
                    health_status["services"][service_name] = "healthy"
                else:
                    health_status["services"][service_name] = "unhealthy"
            except Exception:
                health_status["services"][service_name] = "unreachable"
    
    # Determine overall health
    unhealthy_services = [
        name for name, status in health_status["services"].items()
        if status != "healthy"
    ]
    
    if unhealthy_services:
        health_status["overall"] = "degraded"
        health_status["unhealthy_services"] = unhealthy_services
    else:
        health_status["overall"] = "healthy"
    
    return health_status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
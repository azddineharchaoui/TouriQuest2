"""
Main FastAPI application for the communication service
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.core.config import settings
from app.core.database import init_database
from app.api.chat import router as chat_router
from app.services.websocket_manager import connection_manager
from app.services.chat_service import chat_service
from app.core.auth import auth_service

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting communication service...")
    
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized")
        
        # Initialize services
        await connection_manager.initialize()
        logger.info("WebSocket connection manager initialized")
        
        await chat_service.initialize()
        logger.info("Chat service initialized")
        
        await auth_service.initialize()
        logger.info("Auth service initialized")
        
        logger.info("Communication service startup complete")
        
    except Exception as e:
        logger.error(f"Failed to start communication service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down communication service...")
    
    try:
        await connection_manager.shutdown()
        logger.info("WebSocket connections closed")
        
        logger.info("Communication service shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title="TouriQuest Communication Service",
    description="Real-time communication service for guest-host messaging, group chat, and collaboration",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": f"{asyncio.get_event_loop().time()}"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
            "timestamp": f"{asyncio.get_event_loop().time()}"
        }
    )


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    start_time = asyncio.get_event_loop().time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Log response
    process_time = asyncio.get_event_loop().time() - start_time
    logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
    
    # Add process time header
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# Health check endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "TouriQuest Communication Service",
        "version": "1.0.0",
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    try:
        # Check database connection
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")
        
        # Check Redis connection
        if connection_manager.redis_client:
            await connection_manager.redis_client.ping()
        
        # Get service statistics
        stats = {
            "status": "healthy",
            "timestamp": f"{asyncio.get_event_loop().time()}",
            "environment": settings.ENVIRONMENT,
            "database": "connected",
            "redis": "connected",
            "websocket": {
                "total_connections": connection_manager.get_connection_count(),
                "online_users": len(connection_manager.get_online_users())
            },
            "features": {
                "encryption": settings.CHAT_ENCRYPTION_ENABLED,
                "translation": settings.CHAT_TRANSLATION_ENABLED,
                "file_upload": True,
                "push_notifications": settings.PUSH_NOTIFICATIONS_ENABLED
            }
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": f"{asyncio.get_event_loop().time()}"
            }
        )


@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    try:
        metrics = {
            "connections": {
                "total": connection_manager.get_connection_count(),
                "online_users": len(connection_manager.get_online_users()),
            },
            "memory": {
                "connections": len(connection_manager.connections),
            },
            "features": {
                "encryption_enabled": settings.CHAT_ENCRYPTION_ENABLED,
                "translation_enabled": settings.CHAT_TRANSLATION_ENABLED,
                "file_upload_enabled": True,
                "push_notifications_enabled": settings.PUSH_NOTIFICATIONS_ENABLED,
            }
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get metrics"}
        )


# Include API routers
from app.api.messages import router as messages_router
from app.api.conversations import router as conversations_router
from app.api.support_tickets import router as support_router
from app.api.notifications import router as notifications_router
from app.api.websocket import router as websocket_router

app.include_router(chat_router, prefix="/api")
app.include_router(messages_router, prefix="/api/v1/communication")
app.include_router(conversations_router, prefix="/api/v1/communication")
app.include_router(support_router, prefix="/api/v1/communication")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api/v1")

# Static files for uploaded content
if settings.CHAT_FILE_UPLOAD_PATH:
    app.mount(
        "/api/files",
        StaticFiles(directory=settings.CHAT_FILE_UPLOAD_PATH),
        name="files"
    )


# WebSocket test endpoint (for development)
if settings.DEBUG:
    @app.get("/ws-test")
    async def websocket_test():
        """WebSocket test page"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebSocket Test</title>
        </head>
        <body>
            <h1>WebSocket Test</h1>
            <div id="messages"></div>
            <input type="text" id="messageInput" placeholder="Type a message...">
            <button onclick="sendMessage()">Send</button>
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
            
            <script>
                let ws = null;
                
                function connect() {
                    const userId = 'test-user';
                    const token = 'test-token';
                    ws = new WebSocket(`ws://localhost:8004/api/chat/ws/${userId}?token=${token}`);
                    
                    ws.onopen = function(event) {
                        addMessage('Connected to WebSocket');
                    };
                    
                    ws.onmessage = function(event) {
                        const data = JSON.parse(event.data);
                        addMessage('Received: ' + JSON.stringify(data));
                    };
                    
                    ws.onclose = function(event) {
                        addMessage('WebSocket closed');
                    };
                    
                    ws.onerror = function(error) {
                        addMessage('WebSocket error: ' + error);
                    };
                }
                
                function disconnect() {
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                }
                
                function sendMessage() {
                    const input = document.getElementById('messageInput');
                    if (ws && input.value) {
                        const message = {
                            type: 'test_message',
                            data: { content: input.value }
                        };
                        ws.send(JSON.stringify(message));
                        addMessage('Sent: ' + input.value);
                        input.value = '';
                    }
                }
                
                function addMessage(message) {
                    const messages = document.getElementById('messages');
                    const div = document.createElement('div');
                    div.textContent = new Date().toLocaleTimeString() + ': ' + message;
                    messages.appendChild(div);
                    messages.scrollTop = messages.scrollHeight;
                }
                
                document.getElementById('messageInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
            </script>
        </body>
        </html>
        """


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
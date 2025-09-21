"""
FastAPI routes for integrations service
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.services.payment_service import PaymentService
from app.services.mapping_service import MappingService
from app.services.communication_service import CommunicationService
from app.services.external_api_service import ExternalAPIService
from app.services.webhook_service import webhook_processor

logger = logging.getLogger(__name__)

# Pydantic models for API requests
class PaymentIntentRequest(BaseModel):
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(default="USD", description="Currency code")
    customer_email: Optional[str] = Field(None, description="Customer email")
    description: Optional[str] = Field(None, description="Payment description")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class GeocodeRequest(BaseModel):
    address: str = Field(..., description="Address to geocode")
    provider: Optional[str] = Field(None, description="Mapping provider (google_maps, mapbox)")

class DirectionsRequest(BaseModel):
    origin: str = Field(..., description="Origin location")
    destination: str = Field(..., description="Destination location")
    mode: str = Field(default="driving", description="Travel mode")
    provider: Optional[str] = Field(None, description="Mapping provider")

class EmailRequest(BaseModel):
    to_emails: List[str] = Field(..., description="Recipient email addresses")
    subject: str = Field(..., description="Email subject")
    content: str = Field(..., description="Email content")
    html_content: Optional[str] = Field(None, description="HTML email content")
    provider: Optional[str] = Field(None, description="Email provider")

class SMSRequest(BaseModel):
    to_number: str = Field(..., description="Recipient phone number")
    message: str = Field(..., description="SMS message")
    provider: Optional[str] = Field(None, description="SMS provider")

class WeatherRequest(BaseModel):
    city: Optional[str] = Field(None, description="City name")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    units: str = Field(default="metric", description="Units (metric, imperial)")

class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language code")
    source_language: Optional[str] = Field(None, description="Source language code")

class CurrencyConversionRequest(BaseModel):
    amount: float = Field(..., description="Amount to convert")
    from_currency: str = Field(..., description="Source currency")
    to_currency: str = Field(..., description="Target currency")

class AICompletionRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt")
    model: str = Field(default="gpt-3.5-turbo", description="AI model")
    max_tokens: int = Field(default=150, description="Maximum tokens")
    temperature: float = Field(default=0.7, description="Response temperature")

# Initialize FastAPI app
app = FastAPI(
    title="TouriQuest Integrations Service",
    description="Comprehensive third-party service integrations for TouriQuest platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
payment_service: Optional[PaymentService] = None
mapping_service: Optional[MappingService] = None
communication_service: Optional[CommunicationService] = None
external_api_service: Optional[ExternalAPIService] = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global payment_service, mapping_service, communication_service, external_api_service
    
    try:
        # Initialize database
        await init_db()
        
        # Initialize services
        payment_service = PaymentService()
        await payment_service.initialize()
        
        mapping_service = MappingService()
        await mapping_service.initialize()
        
        communication_service = CommunicationService()
        await communication_service.initialize()
        
        external_api_service = ExternalAPIService()
        await external_api_service.initialize()
        
        logger.info("Integrations service started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start integrations service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("Integrations service shutting down")

# Health check endpoints
@app.get("/health")
async def health_check():
    """Overall health check"""
    try:
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {}
        }
        
        # Check individual services
        if payment_service:
            health_data["services"]["payments"] = await payment_service.health_check()
        
        if mapping_service:
            health_data["services"]["mapping"] = await mapping_service.health_check()
        
        if communication_service:
            health_data["services"]["communication"] = await communication_service.health_check()
        
        if external_api_service:
            health_data["services"]["external_apis"] = await external_api_service.health_check()
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.get("/health/{service}")
async def service_health_check(service: str):
    """Individual service health check"""
    try:
        if service == "payments" and payment_service:
            return await payment_service.health_check()
        elif service == "mapping" and mapping_service:
            return await mapping_service.health_check()
        elif service == "communication" and communication_service:
            return await communication_service.health_check()
        elif service == "external-apis" and external_api_service:
            return await external_api_service.health_check()
        else:
            raise HTTPException(status_code=404, detail=f"Service '{service}' not found")
            
    except Exception as e:
        logger.error(f"Service health check error for {service}: {e}")
        raise HTTPException(status_code=503, detail=str(e))

# Payment endpoints
@app.post("/payments/create-intent")
async def create_payment_intent(request: PaymentIntentRequest):
    """Create payment intent"""
    try:
        if not payment_service:
            raise HTTPException(status_code=503, detail="Payment service not available")
        
        result = await payment_service.create_payment_intent(
            amount=request.amount,
            currency=request.currency,
            customer_email=request.customer_email,
            description=request.description,
            metadata=request.metadata
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Create payment intent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/payments/confirm/{payment_intent_id}")
async def confirm_payment_intent(payment_intent_id: str):
    """Confirm payment intent"""
    try:
        if not payment_service:
            raise HTTPException(status_code=503, detail="Payment service not available")
        
        result = await payment_service.confirm_payment_intent(payment_intent_id)
        return result
        
    except Exception as e:
        logger.error(f"Confirm payment intent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/payments/refund/{payment_intent_id}")
async def refund_payment(payment_intent_id: str, amount: Optional[int] = None):
    """Refund payment"""
    try:
        if not payment_service:
            raise HTTPException(status_code=503, detail="Payment service not available")
        
        result = await payment_service.refund_payment(payment_intent_id, amount)
        return result
        
    except Exception as e:
        logger.error(f"Refund payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mapping endpoints
@app.post("/mapping/geocode")
async def geocode_address(request: GeocodeRequest):
    """Geocode an address"""
    try:
        if not mapping_service:
            raise HTTPException(status_code=503, detail="Mapping service not available")
        
        result = await mapping_service.geocode(
            address=request.address,
            provider=request.provider
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Geocode error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mapping/directions")
async def get_directions(request: DirectionsRequest):
    """Get directions between locations"""
    try:
        if not mapping_service:
            raise HTTPException(status_code=503, detail="Mapping service not available")
        
        result = await mapping_service.get_directions(
            origin=request.origin,
            destination=request.destination,
            provider=request.provider,
            mode=request.mode
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Directions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Communication endpoints
@app.post("/communication/send-email")
async def send_email(request: EmailRequest):
    """Send email"""
    try:
        if not communication_service:
            raise HTTPException(status_code=503, detail="Communication service not available")
        
        result = await communication_service.send_email(
            to_emails=request.to_emails,
            subject=request.subject,
            content=request.content,
            html_content=request.html_content,
            provider=request.provider
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Send email error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/communication/send-sms")
async def send_sms(request: SMSRequest):
    """Send SMS"""
    try:
        if not communication_service:
            raise HTTPException(status_code=503, detail="Communication service not available")
        
        result = await communication_service.send_sms(
            to_number=request.to_number,
            message=request.message,
            provider=request.provider
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Send SMS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# External API endpoints
@app.post("/external/weather")
async def get_weather(request: WeatherRequest):
    """Get weather data"""
    try:
        if not external_api_service:
            raise HTTPException(status_code=503, detail="External API service not available")
        
        result = await external_api_service.weather.get_current_weather(
            city=request.city,
            lat=request.latitude,
            lon=request.longitude,
            units=request.units
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Weather error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/external/translate")
async def translate_text(request: TranslationRequest):
    """Translate text"""
    try:
        if not external_api_service:
            raise HTTPException(status_code=503, detail="External API service not available")
        
        result = await external_api_service.translate.translate_text(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/external/currency/convert")
async def convert_currency(request: CurrencyConversionRequest):
    """Convert currency"""
    try:
        if not external_api_service:
            raise HTTPException(status_code=503, detail="External API service not available")
        
        result = await external_api_service.currency.convert_currency(
            amount=request.amount,
            from_currency=request.from_currency,
            to_currency=request.to_currency
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Currency conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/external/ai/completion")
async def generate_ai_completion(request: AICompletionRequest):
    """Generate AI completion"""
    try:
        if not external_api_service:
            raise HTTPException(status_code=503, detail="External API service not available")
        
        result = await external_api_service.ai.generate_completion(
            prompt=request.prompt,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return result
        
    except Exception as e:
        logger.error(f"AI completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Webhook endpoints
@app.post("/webhooks/{service}")
async def handle_webhook(service: str, request: Request):
    """Handle incoming webhooks"""
    try:
        # Get raw body and headers
        raw_body = await request.body()
        headers = dict(request.headers)
        
        # Process webhook
        result = await webhook_processor.process_webhook(
            service=service,
            request=request,
            raw_body=raw_body,
            headers=headers
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook handling error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/webhooks/events")
async def get_webhook_events(
    service: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    """Get webhook events"""
    try:
        from app.models.integration_models import WebhookEventStatus
        
        status_enum = None
        if status:
            try:
                status_enum = WebhookEventStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        events = await webhook_processor.get_webhook_events(
            service=service,
            event_type=event_type,
            status=status_enum,
            limit=limit
        )
        
        return {"events": events, "count": len(events)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get webhook events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhooks/retry/{webhook_id}")
async def retry_webhook(webhook_id: str):
    """Retry failed webhook"""
    try:
        result = await webhook_processor.retry_failed_webhook(webhook_id)
        return result
        
    except Exception as e:
        logger.error(f"Retry webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Monitoring and metrics endpoints
@app.get("/metrics")
async def get_metrics():
    """Get integration metrics"""
    try:
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {}
        }
        
        # Collect metrics from each service
        if payment_service and hasattr(payment_service, 'get_metrics'):
            metrics["services"]["payments"] = await payment_service.get_metrics()
        
        if mapping_service and hasattr(mapping_service.google_maps, 'get_metrics'):
            metrics["services"]["google_maps"] = await mapping_service.google_maps.get_metrics()
            metrics["services"]["mapbox"] = await mapping_service.mapbox.get_metrics()
        
        if communication_service:
            if hasattr(communication_service.sendgrid, 'get_metrics'):
                metrics["services"]["sendgrid"] = await communication_service.sendgrid.get_metrics()
            if hasattr(communication_service.twilio, 'get_metrics'):
                metrics["services"]["twilio"] = await communication_service.twilio.get_metrics()
        
        if external_api_service:
            if hasattr(external_api_service.weather, 'get_metrics'):
                metrics["services"]["weather"] = await external_api_service.weather.get_metrics()
            if hasattr(external_api_service.currency, 'get_metrics'):
                metrics["services"]["currency"] = await external_api_service.currency.get_metrics()
        
        return metrics
        
    except Exception as e:
        logger.error(f"Get metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
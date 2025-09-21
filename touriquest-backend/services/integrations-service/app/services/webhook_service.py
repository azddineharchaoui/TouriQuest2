"""
Webhook handling service for processing third-party webhooks
"""

import asyncio
import logging
import hmac
import hashlib
import json
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
import base64

from fastapi import Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.integration_models import WebhookEvent, WebhookEventStatus
from app.services.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class WebhookProcessor:
    """Process webhooks from various services"""
    
    def __init__(self):
        self.handlers: Dict[str, Callable] = {}
        self.signature_validators: Dict[str, Callable] = {}
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default webhook handlers"""
        # Payment webhooks
        self.register_handler("stripe", self._handle_stripe_webhook)
        self.register_handler("paypal", self._handle_paypal_webhook)
        self.register_handler("braintree", self._handle_braintree_webhook)
        
        # Communication webhooks
        self.register_handler("sendgrid", self._handle_sendgrid_webhook)
        self.register_handler("twilio", self._handle_twilio_webhook)
        
        # Register signature validators
        self.register_signature_validator("stripe", self._validate_stripe_signature)
        self.register_signature_validator("paypal", self._validate_paypal_signature)
        self.register_signature_validator("sendgrid", self._validate_sendgrid_signature)
        self.register_signature_validator("twilio", self._validate_twilio_signature)
    
    def register_handler(self, service: str, handler: Callable):
        """Register a webhook handler for a service"""
        self.handlers[service] = handler
    
    def register_signature_validator(self, service: str, validator: Callable):
        """Register a signature validator for a service"""
        self.signature_validators[service] = validator
    
    async def process_webhook(
        self,
        service: str,
        request: Request,
        raw_body: bytes,
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process incoming webhook"""
        try:
            # Validate webhook signature
            if service in self.signature_validators:
                is_valid = await self.signature_validators[service](
                    raw_body, headers
                )
                if not is_valid:
                    raise HTTPException(status_code=401, detail="Invalid webhook signature")
            
            # Parse webhook payload
            try:
                payload = json.loads(raw_body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
            
            # Record webhook event
            webhook_event = await self._record_webhook_event(
                service=service,
                event_type=payload.get("type") or payload.get("event_type") or "unknown",
                payload=payload,
                headers=dict(headers)
            )
            
            # Process webhook with appropriate handler
            if service in self.handlers:
                result = await self.handlers[service](payload, webhook_event.id)
                
                # Update webhook event status
                await self._update_webhook_status(
                    webhook_event.id,
                    WebhookEventStatus.PROCESSED,
                    result
                )
                
                return result
            else:
                # No handler registered for this service
                await self._update_webhook_status(
                    webhook_event.id,
                    WebhookEventStatus.IGNORED,
                    {"message": f"No handler registered for service: {service}"}
                )
                
                return {"status": "ignored", "message": f"No handler for {service}"}
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Webhook processing error for {service}: {e}")
            
            # Update webhook status if we have an event ID
            if 'webhook_event' in locals():
                await self._update_webhook_status(
                    webhook_event.id,
                    WebhookEventStatus.FAILED,
                    {"error": str(e)}
                )
            
            raise HTTPException(status_code=500, detail=f"Webhook processing failed: {e}")
    
    async def _handle_stripe_webhook(self, payload: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            event_type = payload.get("type")
            event_data = payload.get("data", {}).get("object", {})
            
            logger.info(f"Processing Stripe webhook: {event_type}")
            
            result = {"service": "stripe", "event_type": event_type}
            
            if event_type == "payment_intent.succeeded":
                # Handle successful payment
                payment_intent_id = event_data.get("id")
                amount = event_data.get("amount")
                currency = event_data.get("currency")
                
                result.update({
                    "action": "payment_completed",
                    "payment_intent_id": payment_intent_id,
                    "amount": amount,
                    "currency": currency
                })
                
                # Here you would update your payment records
                # await self._update_payment_status(payment_intent_id, "completed")
                
            elif event_type == "payment_intent.payment_failed":
                # Handle failed payment
                payment_intent_id = event_data.get("id")
                failure_reason = event_data.get("last_payment_error", {}).get("message")
                
                result.update({
                    "action": "payment_failed",
                    "payment_intent_id": payment_intent_id,
                    "failure_reason": failure_reason
                })
                
                # Here you would update your payment records
                # await self._update_payment_status(payment_intent_id, "failed")
                
            elif event_type == "account.updated":
                # Handle Stripe Connect account updates
                account_id = event_data.get("id")
                charges_enabled = event_data.get("charges_enabled")
                payouts_enabled = event_data.get("payouts_enabled")
                
                result.update({
                    "action": "account_updated",
                    "account_id": account_id,
                    "charges_enabled": charges_enabled,
                    "payouts_enabled": payouts_enabled
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Stripe webhook handling error: {e}")
            raise
    
    async def _handle_paypal_webhook(self, payload: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """Handle PayPal webhook events"""
        try:
            event_type = payload.get("event_type")
            resource = payload.get("resource", {})
            
            logger.info(f"Processing PayPal webhook: {event_type}")
            
            result = {"service": "paypal", "event_type": event_type}
            
            if event_type == "PAYMENT.CAPTURE.COMPLETED":
                # Handle completed payment
                capture_id = resource.get("id")
                amount = resource.get("amount", {})
                
                result.update({
                    "action": "payment_completed",
                    "capture_id": capture_id,
                    "amount": amount.get("value"),
                    "currency": amount.get("currency_code")
                })
                
            elif event_type == "PAYMENT.CAPTURE.DENIED":
                # Handle denied payment
                capture_id = resource.get("id")
                
                result.update({
                    "action": "payment_denied",
                    "capture_id": capture_id
                })
            
            return result
            
        except Exception as e:
            logger.error(f"PayPal webhook handling error: {e}")
            raise
    
    async def _handle_braintree_webhook(self, payload: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """Handle Braintree webhook events"""
        try:
            # Braintree webhooks need special parsing
            # This is a simplified version
            kind = payload.get("kind")
            
            logger.info(f"Processing Braintree webhook: {kind}")
            
            result = {"service": "braintree", "event_type": kind}
            
            if kind == "transaction_settled":
                transaction = payload.get("transaction", {})
                
                result.update({
                    "action": "transaction_settled",
                    "transaction_id": transaction.get("id"),
                    "amount": transaction.get("amount"),
                    "currency": transaction.get("currency_iso_code")
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Braintree webhook handling error: {e}")
            raise
    
    async def _handle_sendgrid_webhook(self, payload: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """Handle SendGrid webhook events"""
        try:
            # SendGrid sends array of events
            events = payload if isinstance(payload, list) else [payload]
            
            logger.info(f"Processing SendGrid webhook with {len(events)} events")
            
            processed_events = []
            
            for event in events:
                event_type = event.get("event")
                email = event.get("email")
                timestamp = event.get("timestamp")
                
                processed_events.append({
                    "event_type": event_type,
                    "email": email,
                    "timestamp": timestamp,
                    "message_id": event.get("sg_message_id")
                })
                
                # Handle specific events
                if event_type in ["delivered", "open", "click", "bounce", "dropped"]:
                    # Update email tracking records
                    pass
            
            return {
                "service": "sendgrid",
                "events_processed": len(processed_events),
                "events": processed_events
            }
            
        except Exception as e:
            logger.error(f"SendGrid webhook handling error: {e}")
            raise
    
    async def _handle_twilio_webhook(self, payload: Dict[str, Any], webhook_id: str) -> Dict[str, Any]:
        """Handle Twilio webhook events"""
        try:
            message_status = payload.get("MessageStatus")
            message_sid = payload.get("MessageSid")
            
            logger.info(f"Processing Twilio webhook: {message_status}")
            
            result = {
                "service": "twilio",
                "message_sid": message_sid,
                "status": message_status
            }
            
            if message_status in ["delivered", "failed", "undelivered"]:
                # Update SMS tracking records
                result["action"] = "status_update"
            
            return result
            
        except Exception as e:
            logger.error(f"Twilio webhook handling error: {e}")
            raise
    
    async def _validate_stripe_signature(self, payload: bytes, headers: Dict[str, str]) -> bool:
        """Validate Stripe webhook signature"""
        try:
            signature = headers.get("stripe-signature", "")
            if not signature:
                return False
            
            # Parse signature
            sig_parts = {}
            for part in signature.split(","):
                key, value = part.split("=", 1)
                sig_parts[key] = value
            
            # Calculate expected signature
            timestamp = sig_parts.get("t")
            if not timestamp:
                return False
            
            payload_to_sign = f"{timestamp}.{payload.decode('utf-8')}"
            expected_signature = hmac.new(
                settings.STRIPE_WEBHOOK_SECRET.encode(),
                payload_to_sign.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            return hmac.compare_digest(expected_signature, sig_parts.get("v1", ""))
            
        except Exception as e:
            logger.error(f"Stripe signature validation error: {e}")
            return False
    
    async def _validate_paypal_signature(self, payload: bytes, headers: Dict[str, str]) -> bool:
        """Validate PayPal webhook signature"""
        try:
            # PayPal signature validation would be implemented here
            # This is a simplified version
            auth_algo = headers.get("paypal-auth-algo")
            transmission_id = headers.get("paypal-transmission-id")
            cert_id = headers.get("paypal-cert-id")
            transmission_sig = headers.get("paypal-transmission-sig")
            transmission_time = headers.get("paypal-transmission-time")
            
            # In a real implementation, you would:
            # 1. Get PayPal's public certificate
            # 2. Verify the signature using the certificate
            # For now, just check if required headers are present
            
            required_headers = [auth_algo, transmission_id, cert_id, transmission_sig, transmission_time]
            return all(header for header in required_headers)
            
        except Exception as e:
            logger.error(f"PayPal signature validation error: {e}")
            return False
    
    async def _validate_sendgrid_signature(self, payload: bytes, headers: Dict[str, str]) -> bool:
        """Validate SendGrid webhook signature"""
        try:
            signature = headers.get("x-twilio-email-event-webhook-signature", "")
            timestamp = headers.get("x-twilio-email-event-webhook-timestamp", "")
            
            if not signature or not timestamp:
                return False
            
            # Calculate expected signature
            payload_to_sign = timestamp + payload.decode('utf-8')
            expected_signature = base64.b64encode(
                hmac.new(
                    settings.SENDGRID_WEBHOOK_SECRET.encode(),
                    payload_to_sign.encode(),
                    hashlib.sha256
                ).digest()
            ).decode()
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            logger.error(f"SendGrid signature validation error: {e}")
            return False
    
    async def _validate_twilio_signature(self, payload: bytes, headers: Dict[str, str]) -> bool:
        """Validate Twilio webhook signature"""
        try:
            signature = headers.get("x-twilio-signature", "")
            if not signature:
                return False
            
            # Get the request URL (this would need to be passed in)
            url = headers.get("x-original-url", "")
            
            # Calculate expected signature
            payload_to_sign = url + payload.decode('utf-8')
            expected_signature = base64.b64encode(
                hmac.new(
                    settings.TWILIO_AUTH_TOKEN.encode(),
                    payload_to_sign.encode(),
                    hashlib.sha1
                ).digest()
            ).decode()
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            logger.error(f"Twilio signature validation error: {e}")
            return False
    
    async def _record_webhook_event(
        self,
        service: str,
        event_type: str,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> WebhookEvent:
        """Record webhook event in database"""
        try:
            async with AsyncSessionLocal() as session:
                webhook_event = WebhookEvent(
                    service=service,
                    event_type=event_type,
                    payload=payload,
                    headers=headers,
                    status=WebhookEventStatus.RECEIVED
                )
                
                session.add(webhook_event)
                await session.commit()
                await session.refresh(webhook_event)
                
                return webhook_event
                
        except Exception as e:
            logger.error(f"Error recording webhook event: {e}")
            raise
    
    async def _update_webhook_status(
        self,
        webhook_id: str,
        status: WebhookEventStatus,
        response_data: Optional[Dict[str, Any]] = None
    ):
        """Update webhook event status"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import update
                
                stmt = update(WebhookEvent).where(
                    WebhookEvent.id == webhook_id
                ).values(
                    status=status,
                    response_data=response_data,
                    processed_at=datetime.utcnow()
                )
                
                await session.execute(stmt)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error updating webhook status: {e}")
    
    async def get_webhook_events(
        self,
        service: Optional[str] = None,
        event_type: Optional[str] = None,
        status: Optional[WebhookEventStatus] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get webhook events with filtering"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                
                stmt = select(WebhookEvent)
                
                if service:
                    stmt = stmt.where(WebhookEvent.service == service)
                if event_type:
                    stmt = stmt.where(WebhookEvent.event_type == event_type)
                if status:
                    stmt = stmt.where(WebhookEvent.status == status)
                
                stmt = stmt.order_by(WebhookEvent.created_at.desc()).limit(limit)
                
                result = await session.execute(stmt)
                events = result.scalars().all()
                
                return [
                    {
                        "id": event.id,
                        "service": event.service,
                        "event_type": event.event_type,
                        "status": event.status,
                        "created_at": event.created_at.isoformat(),
                        "processed_at": event.processed_at.isoformat() if event.processed_at else None,
                        "payload": event.payload,
                        "response_data": event.response_data
                    }
                    for event in events
                ]
                
        except Exception as e:
            logger.error(f"Error getting webhook events: {e}")
            return []
    
    async def retry_failed_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """Retry processing a failed webhook"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                
                stmt = select(WebhookEvent).where(WebhookEvent.id == webhook_id)
                result = await session.execute(stmt)
                webhook_event = result.scalar_one_or_none()
                
                if not webhook_event:
                    raise Exception("Webhook event not found")
                
                if webhook_event.status != WebhookEventStatus.FAILED:
                    raise Exception("Only failed webhooks can be retried")
                
                # Reprocess the webhook
                if webhook_event.service in self.handlers:
                    result = await self.handlers[webhook_event.service](
                        webhook_event.payload,
                        webhook_event.id
                    )
                    
                    await self._update_webhook_status(
                        webhook_event.id,
                        WebhookEventStatus.PROCESSED,
                        result
                    )
                    
                    return result
                else:
                    raise Exception(f"No handler for service: {webhook_event.service}")
                
        except Exception as e:
            logger.error(f"Error retrying webhook: {e}")
            raise


# Global webhook processor instance
webhook_processor = WebhookProcessor()
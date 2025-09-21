"""
Payment integration service for Stripe, PayPal, and other payment providers
"""

import asyncio
import logging
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal
import json

import stripe
import paypalrestsdk
import braintree
from fastapi import HTTPException
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.integration_models import PaymentTransaction, PaymentStatus, WebhookEvent
from app.services.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class StripeService(BaseIntegrationService):
    """Stripe payment processing service"""
    
    def __init__(self):
        super().__init__("stripe")
        self.stripe = stripe
        if settings.STRIPE_SECRET_KEY:
            self.stripe.api_key = settings.STRIPE_SECRET_KEY
    
    async def create_payment_intent(
        self,
        amount: float,
        currency: str = "usd",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe payment intent"""
        try:
            # Convert amount to cents
            amount_cents = int(amount * 100)
            
            intent_data = {
                "amount": amount_cents,
                "currency": currency.lower(),
                "automatic_payment_methods": {"enabled": True},
                "metadata": metadata or {}
            }
            
            if customer_id:
                intent_data["customer"] = customer_id
            
            # Add platform fee if marketplace
            if settings.STRIPE_PLATFORM_FEE_PERCENT > 0:
                platform_fee = int(amount_cents * settings.STRIPE_PLATFORM_FEE_PERCENT / 100)
                intent_data["application_fee_amount"] = platform_fee
            
            intent = await asyncio.to_thread(
                self.stripe.PaymentIntent.create,
                **intent_data
            )
            
            # Store transaction record
            await self._store_payment_transaction(
                external_id=intent.id,
                provider="stripe",
                payment_method="card",
                amount=amount,
                currency=currency,
                metadata=metadata
            )
            
            return {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "amount": amount,
                "currency": currency,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent creation failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Unexpected error creating payment intent: {e}")
            raise HTTPException(status_code=500, detail="Payment processing failed")
    
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm a payment intent"""
        try:
            intent = await asyncio.to_thread(
                self.stripe.PaymentIntent.retrieve,
                payment_intent_id
            )
            
            if intent.status == "requires_confirmation":
                intent = await asyncio.to_thread(
                    self.stripe.PaymentIntent.confirm,
                    payment_intent_id
                )
            
            # Update transaction status
            await self._update_payment_status(
                external_id=payment_intent_id,
                status=self._map_stripe_status(intent.status)
            )
            
            return {
                "id": intent.id,
                "status": intent.status,
                "amount": intent.amount / 100,
                "currency": intent.currency
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment confirmation failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe customer"""
        try:
            customer_data = {
                "email": email,
                "metadata": metadata or {}
            }
            
            if name:
                customer_data["name"] = name
            
            customer = await asyncio.to_thread(
                self.stripe.Customer.create,
                **customer_data
            )
            
            return {
                "id": customer.id,
                "email": customer.email,
                "name": customer.name
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def create_connect_account(
        self,
        account_type: str = "express",
        country: str = "US",
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a Stripe Connect account for hosts"""
        try:
            account_data = {
                "type": account_type,
                "country": country,
                "capabilities": {
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True}
                }
            }
            
            if email:
                account_data["email"] = email
            
            account = await asyncio.to_thread(
                self.stripe.Account.create,
                **account_data
            )
            
            return {
                "id": account.id,
                "type": account.type,
                "country": account.country,
                "details_submitted": account.details_submitted,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Connect account creation failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def create_account_link(
        self,
        account_id: str,
        refresh_url: str,
        return_url: str
    ) -> Dict[str, Any]:
        """Create account link for Stripe Connect onboarding"""
        try:
            account_link = await asyncio.to_thread(
                self.stripe.AccountLink.create,
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding"
            )
            
            return {
                "url": account_link.url,
                "expires_at": account_link.expires_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe account link creation failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def process_refund(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Process a refund"""
        try:
            refund_data = {
                "payment_intent": payment_intent_id,
                "reason": reason
            }
            
            if amount:
                refund_data["amount"] = int(amount * 100)
            
            refund = await asyncio.to_thread(
                self.stripe.Refund.create,
                **refund_data
            )
            
            # Update transaction status
            await self._update_payment_status(
                external_id=payment_intent_id,
                status=PaymentStatus.REFUNDED
            )
            
            return {
                "id": refund.id,
                "amount": refund.amount / 100,
                "currency": refund.currency,
                "status": refund.status,
                "reason": refund.reason
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    def _map_stripe_status(self, stripe_status: str) -> PaymentStatus:
        """Map Stripe status to internal status"""
        status_mapping = {
            "requires_payment_method": PaymentStatus.PENDING,
            "requires_confirmation": PaymentStatus.PENDING,
            "requires_action": PaymentStatus.PENDING,
            "processing": PaymentStatus.PROCESSING,
            "succeeded": PaymentStatus.COMPLETED,
            "canceled": PaymentStatus.CANCELLED,
            "requires_capture": PaymentStatus.PENDING
        }
        return status_mapping.get(stripe_status, PaymentStatus.FAILED)


class PayPalService(BaseIntegrationService):
    """PayPal payment processing service"""
    
    def __init__(self):
        super().__init__("paypal")
        if settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET:
            paypalrestsdk.configure({
                "mode": settings.PAYPAL_MODE,
                "client_id": settings.PAYPAL_CLIENT_ID,
                "client_secret": settings.PAYPAL_CLIENT_SECRET
            })
    
    async def create_payment(
        self,
        amount: float,
        currency: str = "USD",
        description: str = "TouriQuest Payment",
        return_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """Create a PayPal payment"""
        try:
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {"payment_method": "paypal"},
                "redirect_urls": {
                    "return_url": return_url or f"{settings.BASE_URL}/payment/paypal/return",
                    "cancel_url": cancel_url or f"{settings.BASE_URL}/payment/paypal/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": description,
                            "sku": "touriquest_payment",
                            "price": str(amount),
                            "currency": currency,
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "total": str(amount),
                        "currency": currency
                    },
                    "description": description
                }]
            })
            
            if await asyncio.to_thread(payment.create):
                # Store transaction record
                await self._store_payment_transaction(
                    external_id=payment.id,
                    provider="paypal",
                    payment_method="paypal",
                    amount=amount,
                    currency=currency
                )
                
                # Get approval URL
                approval_url = None
                for link in payment.links:
                    if link.rel == "approval_url":
                        approval_url = link.href
                        break
                
                return {
                    "id": payment.id,
                    "approval_url": approval_url,
                    "amount": amount,
                    "currency": currency,
                    "status": payment.state
                }
            else:
                logger.error(f"PayPal payment creation failed: {payment.error}")
                raise HTTPException(status_code=400, detail=payment.error)
                
        except Exception as e:
            logger.error(f"PayPal payment creation error: {e}")
            raise HTTPException(status_code=500, detail="PayPal payment failed")
    
    async def execute_payment(self, payment_id: str, payer_id: str) -> Dict[str, Any]:
        """Execute an approved PayPal payment"""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            
            if await asyncio.to_thread(
                payment.execute,
                {"payer_id": payer_id}
            ):
                # Update transaction status
                await self._update_payment_status(
                    external_id=payment_id,
                    status=PaymentStatus.COMPLETED
                )
                
                return {
                    "id": payment.id,
                    "status": payment.state,
                    "payer_id": payer_id
                }
            else:
                logger.error(f"PayPal payment execution failed: {payment.error}")
                raise HTTPException(status_code=400, detail=payment.error)
                
        except Exception as e:
            logger.error(f"PayPal payment execution error: {e}")
            raise HTTPException(status_code=500, detail="PayPal execution failed")


class BraintreeService(BaseIntegrationService):
    """Braintree service for Apple Pay, Google Pay, and additional PayPal features"""
    
    def __init__(self):
        super().__init__("braintree")
        if settings.BRAINTREE_MERCHANT_ID:
            braintree.Configuration.configure(
                environment=getattr(braintree.Environment, settings.BRAINTREE_ENVIRONMENT),
                merchant_id=settings.BRAINTREE_MERCHANT_ID,
                public_key=settings.BRAINTREE_PUBLIC_KEY,
                private_key=settings.BRAINTREE_PRIVATE_KEY
            )
    
    async def generate_client_token(self, customer_id: Optional[str] = None) -> str:
        """Generate client token for Braintree Drop-in UI"""
        try:
            client_token_params = {}
            if customer_id:
                client_token_params["customer_id"] = customer_id
            
            client_token = await asyncio.to_thread(
                braintree.ClientToken.generate,
                client_token_params
            )
            
            return client_token
            
        except Exception as e:
            logger.error(f"Braintree client token generation failed: {e}")
            raise HTTPException(status_code=500, detail="Token generation failed")
    
    async def process_payment(
        self,
        amount: float,
        payment_method_nonce: str,
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process payment with Braintree"""
        try:
            transaction_params = {
                "amount": str(amount),
                "payment_method_nonce": payment_method_nonce,
                "options": {
                    "submit_for_settlement": True
                }
            }
            
            if customer_id:
                transaction_params["customer_id"] = customer_id
            
            if metadata:
                transaction_params["custom_fields"] = metadata
            
            result = await asyncio.to_thread(
                braintree.Transaction.sale,
                transaction_params
            )
            
            if result.is_success:
                transaction = result.transaction
                
                # Store transaction record
                await self._store_payment_transaction(
                    external_id=transaction.id,
                    provider="braintree",
                    payment_method=transaction.payment_instrument_type,
                    amount=amount,
                    currency=transaction.currency_iso_code,
                    metadata=metadata
                )
                
                return {
                    "id": transaction.id,
                    "status": transaction.status,
                    "amount": float(transaction.amount),
                    "currency": transaction.currency_iso_code,
                    "payment_method": transaction.payment_instrument_type
                }
            else:
                logger.error(f"Braintree transaction failed: {result.message}")
                raise HTTPException(status_code=400, detail=result.message)
                
        except Exception as e:
            logger.error(f"Braintree payment processing error: {e}")
            raise HTTPException(status_code=500, detail="Payment processing failed")


class PaymentService:
    """Main payment service that coordinates all payment providers"""
    
    def __init__(self):
        self.stripe = StripeService()
        self.paypal = PayPalService()
        self.braintree = BraintreeService()
        self.redis_client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize payment service"""
        self.redis_client = redis.from_url(settings.redis_url_complete)
        await self.stripe.initialize()
        await self.paypal.initialize()
        await self.braintree.initialize()
    
    async def process_payment(
        self,
        provider: str,
        amount: float,
        currency: str = "USD",
        payment_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process payment with specified provider"""
        try:
            if provider == "stripe":
                return await self.stripe.create_payment_intent(
                    amount=amount,
                    currency=currency,
                    **payment_data
                )
            elif provider == "paypal":
                return await self.paypal.create_payment(
                    amount=amount,
                    currency=currency,
                    **payment_data
                )
            elif provider == "braintree":
                return await self.braintree.process_payment(
                    amount=amount,
                    **payment_data
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Payment processing failed for {provider}: {e}")
            raise
    
    async def process_webhook(
        self,
        provider: str,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process webhook from payment provider"""
        try:
            # Verify webhook signature
            if not await self._verify_webhook_signature(provider, payload, headers):
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
            
            # Parse webhook data
            webhook_data = json.loads(payload.decode())
            
            # Store webhook event
            await self._store_webhook_event(provider, webhook_data, headers)
            
            # Process webhook based on provider
            if provider == "stripe":
                return await self._process_stripe_webhook(webhook_data)
            elif provider == "paypal":
                return await self._process_paypal_webhook(webhook_data)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Webhook processing failed for {provider}: {e}")
            raise
    
    async def _verify_webhook_signature(
        self,
        provider: str,
        payload: bytes,
        headers: Dict[str, str]
    ) -> bool:
        """Verify webhook signature"""
        try:
            if provider == "stripe":
                signature = headers.get("stripe-signature")
                if not signature or not settings.STRIPE_WEBHOOK_SECRET:
                    return False
                
                stripe.Webhook.construct_event(
                    payload,
                    signature,
                    settings.STRIPE_WEBHOOK_SECRET
                )
                return True
                
            elif provider == "paypal":
                # PayPal webhook verification would be implemented here
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return False
    
    async def _process_stripe_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process Stripe webhook events"""
        event_type = webhook_data.get("type")
        event_data = webhook_data.get("data", {}).get("object", {})
        
        if event_type == "payment_intent.succeeded":
            await self._update_payment_status(
                external_id=event_data.get("id"),
                status=PaymentStatus.COMPLETED
            )
        elif event_type == "payment_intent.payment_failed":
            await self._update_payment_status(
                external_id=event_data.get("id"),
                status=PaymentStatus.FAILED
            )
        
        return {"processed": True, "event_type": event_type}
    
    async def _process_paypal_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process PayPal webhook events"""
        event_type = webhook_data.get("event_type")
        
        # PayPal webhook processing would be implemented here
        
        return {"processed": True, "event_type": event_type}
    
    async def _store_webhook_event(
        self,
        provider: str,
        webhook_data: Dict[str, Any],
        headers: Dict[str, str]
    ):
        """Store webhook event in database"""
        async with AsyncSessionLocal() as session:
            webhook_event = WebhookEvent(
                provider=provider,
                event_type=webhook_data.get("type") or webhook_data.get("event_type", "unknown"),
                event_id=webhook_data.get("id", "unknown"),
                payload=webhook_data,
                headers=headers
            )
            
            session.add(webhook_event)
            await session.commit()
    
    async def _store_payment_transaction(
        self,
        external_id: str,
        provider: str,
        payment_method: str,
        amount: float,
        currency: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Store payment transaction in database"""
        async with AsyncSessionLocal() as session:
            transaction = PaymentTransaction(
                external_id=external_id,
                provider=provider,
                payment_method=payment_method,
                amount=amount,
                currency=currency,
                metadata=metadata or {}
            )
            
            session.add(transaction)
            await session.commit()
    
    async def _update_payment_status(
        self,
        external_id: str,
        status: PaymentStatus
    ):
        """Update payment transaction status"""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import update
            
            stmt = update(PaymentTransaction).where(
                PaymentTransaction.external_id == external_id
            ).values(
                status=status,
                processed_at=datetime.utcnow() if status in [PaymentStatus.COMPLETED, PaymentStatus.FAILED] else None
            )
            
            await session.execute(stmt)
            await session.commit()


# Global payment service instance
payment_service = PaymentService()
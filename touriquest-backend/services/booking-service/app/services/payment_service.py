"""Payment processing service with Stripe Connect integration"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from uuid import UUID, uuid4
from enum import Enum

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.models.booking_models import (
    Booking, BookingPayment, PaymentRefund, PaymentStatus,
    RefundType, BookingStatus
)
from app.schemas.booking_schemas import (
    PaymentMethodRequest, PaymentProcessRequest, PaymentResponse,
    RefundCalculation, BookingCancellationResponse
)

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Base exception for payment processing errors"""
    def __init__(self, message: str, code: str = None, stripe_error: str = None):
        super().__init__(message)
        self.code = code
        self.stripe_error = stripe_error


class InsufficientFundsError(PaymentError):
    """Raised when payment fails due to insufficient funds"""
    pass


class PaymentDeclinedError(PaymentError):
    """Raised when payment is declined by card issuer"""
    pass


class PaymentProcessingService:
    """Service for handling payments with Stripe Connect integration"""
    
    def __init__(self, db_session: AsyncSession, stripe_api_key: str):
        self.db = db_session
        stripe.api_key = stripe_api_key
        self._webhook_endpoint_secret = None  # Set from config
    
    async def process_booking_payment(
        self,
        request: PaymentProcessRequest,
        user_id: UUID
    ) -> PaymentResponse:
        """
        Process payment for a booking with marketplace splits
        
        Handles:
        - Payment method validation
        - Amount calculation and splitting
        - Stripe payment processing
        - Database transaction recording
        - Failure handling and cleanup
        """
        try:
            logger.info(f"Processing payment for booking {request.booking_id}")
            
            # Get booking details
            booking = await self._get_booking_with_property(request.booking_id)
            if not booking:
                raise PaymentError("Booking not found", code="booking_not_found")
            
            if booking.guest_id != user_id:
                raise PaymentError("Unauthorized payment attempt", code="unauthorized")
            
            # Validate booking status
            if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
                raise PaymentError(
                    f"Cannot process payment for booking with status {booking.status}",
                    code="invalid_booking_status"
                )
            
            # Check if payment already exists
            existing_payment = await self._get_existing_payment(request.booking_id)
            if existing_payment and existing_payment.status == PaymentStatus.SUCCEEDED:
                raise PaymentError(
                    "Payment already processed for this booking",
                    code="payment_already_exists"
                )
            
            # Calculate payment amounts
            payment_amounts = await self._calculate_payment_amounts(booking)
            
            # Get host's Stripe Connect account
            host_stripe_account = await self._get_host_stripe_account(booking.host_id)
            if not host_stripe_account:
                raise PaymentError(
                    "Host payment account not configured",
                    code="host_account_missing"
                )
            
            # Create or update payment record
            payment = await self._create_payment_record(
                booking, payment_amounts, user_id
            )
            
            try:
                # Process Stripe payment
                stripe_payment_intent = await self._create_stripe_payment_intent(
                    payment_amounts,
                    booking,
                    host_stripe_account,
                    request.payment_method
                )
                
                # Update payment with Stripe details
                payment.stripe_payment_intent_id = stripe_payment_intent.id
                payment.client_secret = stripe_payment_intent.client_secret
                
                # Confirm payment if requested
                if request.confirm_payment:
                    confirmed_intent = await self._confirm_payment_intent(
                        stripe_payment_intent.id,
                        request.payment_method.stripe_payment_method_id
                    )
                    
                    # Update payment status based on result
                    if confirmed_intent.status == 'succeeded':
                        payment.status = PaymentStatus.SUCCEEDED
                        payment.processed_at = datetime.utcnow()
                        
                        # Update booking status
                        booking.status = BookingStatus.CONFIRMED
                        booking.confirmed_at = datetime.utcnow()
                        
                    elif confirmed_intent.status == 'requires_action':
                        payment.status = PaymentStatus.REQUIRES_ACTION
                    else:
                        payment.status = PaymentStatus.FAILED
                        payment.failure_reason = confirmed_intent.last_payment_error.message if confirmed_intent.last_payment_error else "Payment failed"
                
                await self.db.commit()
                
                # Prepare response
                return PaymentResponse(
                    payment_id=payment.id,
                    booking_id=booking.id,
                    amount=payment.amount,
                    currency=payment.currency,
                    status=payment.status,
                    stripe_payment_intent_id=payment.stripe_payment_intent_id,
                    client_secret=payment.client_secret,
                    host_payout=payment.host_payout,
                    platform_fee=payment.platform_fee,
                    requires_action=payment.status == PaymentStatus.REQUIRES_ACTION,
                    next_action=self._get_next_action(stripe_payment_intent) if payment.status == PaymentStatus.REQUIRES_ACTION else None,
                    created_at=payment.created_at
                )
                
            except stripe.error.CardError as e:
                # Card was declined
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = e.user_message
                await self.db.commit()
                
                raise PaymentDeclinedError(
                    e.user_message,
                    code="card_declined",
                    stripe_error=str(e)
                )
            
            except stripe.error.InsufficientFundsError as e:
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = "Insufficient funds"
                await self.db.commit()
                
                raise InsufficientFundsError(
                    "Insufficient funds",
                    code="insufficient_funds",
                    stripe_error=str(e)
                )
            
            except Exception as stripe_error:
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = str(stripe_error)
                await self.db.commit()
                
                logger.error(f"Stripe payment error: {stripe_error}")
                raise PaymentError(
                    "Payment processing failed",
                    code="payment_processing_error",
                    stripe_error=str(stripe_error)
                )
                
        except Exception as e:
            logger.error(f"Error processing payment: {str(e)}")
            await self.db.rollback()
            raise
    
    async def process_security_deposit(
        self,
        booking_id: UUID,
        payment_method: PaymentMethodRequest,
        user_id: UUID
    ) -> PaymentResponse:
        """Process security deposit payment (authorization hold)"""
        try:
            booking = await self._get_booking_with_property(booking_id)
            if not booking or booking.guest_id != user_id:
                raise PaymentError("Booking not found or unauthorized", code="unauthorized")
            
            if not booking.security_deposit or booking.security_deposit <= 0:
                raise PaymentError("No security deposit required", code="no_deposit_required")
            
            # Check if deposit already processed
            existing_deposit = await self._get_existing_deposit_payment(booking_id)
            if existing_deposit and existing_deposit.status == PaymentStatus.SUCCEEDED:
                raise PaymentError("Security deposit already processed", code="deposit_exists")
            
            # Create payment record for security deposit
            deposit_payment = BookingPayment(
                id=uuid4(),
                booking_id=booking_id,
                amount=booking.security_deposit,
                currency=booking.currency,
                payment_type='security_deposit',
                status=PaymentStatus.PENDING,
                platform_fee=Decimal('0.00'),  # No fee on security deposits
                host_payout=Decimal('0.00'),  # No payout for authorization
                created_by=user_id
            )
            
            self.db.add(deposit_payment)
            
            # Create Stripe payment intent for authorization only
            intent = stripe.PaymentIntent.create(
                amount=int(booking.security_deposit * 100),  # Convert to cents
                currency=booking.currency.lower(),
                payment_method=payment_method.stripe_payment_method_id,
                capture_method='manual',  # Authorization only
                confirmation_method='manual',
                confirm=True,
                metadata={
                    'booking_id': str(booking_id),
                    'payment_type': 'security_deposit',
                    'guest_id': str(user_id)
                }
            )
            
            deposit_payment.stripe_payment_intent_id = intent.id
            
            if intent.status == 'requires_capture':
                deposit_payment.status = PaymentStatus.AUTHORIZED
                deposit_payment.processed_at = datetime.utcnow()
            else:
                deposit_payment.status = PaymentStatus.FAILED
                deposit_payment.failure_reason = "Authorization failed"
            
            await self.db.commit()
            
            return PaymentResponse(
                payment_id=deposit_payment.id,
                booking_id=booking_id,
                amount=deposit_payment.amount,
                currency=deposit_payment.currency,
                status=deposit_payment.status,
                stripe_payment_intent_id=deposit_payment.stripe_payment_intent_id,
                client_secret=None,  # Not needed for completed authorization
                host_payout=Decimal('0.00'),
                platform_fee=Decimal('0.00'),
                requires_action=False,
                created_at=deposit_payment.created_at
            )
            
        except Exception as e:
            logger.error(f"Error processing security deposit: {str(e)}")
            await self.db.rollback()
            raise
    
    async def capture_security_deposit(
        self,
        booking_id: UUID,
        capture_amount: Optional[Decimal] = None,
        reason: str = "Property damage"
    ) -> PaymentResponse:
        """Capture security deposit (charge the authorized amount)"""
        try:
            # Get security deposit payment
            deposit_payment = await self._get_existing_deposit_payment(booking_id)
            if not deposit_payment:
                raise PaymentError("Security deposit not found", code="deposit_not_found")
            
            if deposit_payment.status != PaymentStatus.AUTHORIZED:
                raise PaymentError(
                    f"Cannot capture deposit with status {deposit_payment.status}",
                    code="invalid_deposit_status"
                )
            
            # Determine capture amount
            if capture_amount is None:
                capture_amount = deposit_payment.amount
            elif capture_amount > deposit_payment.amount:
                raise PaymentError(
                    "Capture amount cannot exceed authorized amount",
                    code="invalid_capture_amount"
                )
            
            # Capture the payment in Stripe
            intent = stripe.PaymentIntent.capture(
                deposit_payment.stripe_payment_intent_id,
                amount_to_capture=int(capture_amount * 100)
            )
            
            if intent.status == 'succeeded':
                deposit_payment.status = PaymentStatus.SUCCEEDED
                deposit_payment.amount = capture_amount  # Update to captured amount
                deposit_payment.processed_at = datetime.utcnow()
                deposit_payment.notes = reason
                
                # Calculate platform fee for captured amount (if applicable)
                deposit_payment.platform_fee = capture_amount * Decimal('0.03')  # 3% fee
                deposit_payment.host_payout = capture_amount - deposit_payment.platform_fee
                
            else:
                deposit_payment.status = PaymentStatus.FAILED
                deposit_payment.failure_reason = "Capture failed"
            
            await self.db.commit()
            
            return PaymentResponse(
                payment_id=deposit_payment.id,
                booking_id=booking_id,
                amount=deposit_payment.amount,
                currency=deposit_payment.currency,
                status=deposit_payment.status,
                stripe_payment_intent_id=deposit_payment.stripe_payment_intent_id,
                client_secret=None,
                host_payout=deposit_payment.host_payout,
                platform_fee=deposit_payment.platform_fee,
                requires_action=False,
                created_at=deposit_payment.created_at
            )
            
        except Exception as e:
            logger.error(f"Error capturing security deposit: {str(e)}")
            await self.db.rollback()
            raise
    
    async def release_security_deposit(self, booking_id: UUID) -> bool:
        """Release security deposit (cancel authorization)"""
        try:
            deposit_payment = await self._get_existing_deposit_payment(booking_id)
            if not deposit_payment:
                return False
            
            if deposit_payment.status != PaymentStatus.AUTHORIZED:
                return False
            
            # Cancel the payment intent in Stripe
            stripe.PaymentIntent.cancel(deposit_payment.stripe_payment_intent_id)
            
            deposit_payment.status = PaymentStatus.CANCELLED
            deposit_payment.processed_at = datetime.utcnow()
            
            await self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error releasing security deposit: {str(e)}")
            await self.db.rollback()
            return False
    
    async def process_refund(
        self,
        booking_id: UUID,
        refund_amount: Decimal,
        refund_type: RefundType,
        reason: str,
        initiated_by: UUID
    ) -> PaymentRefund:
        """Process refund for a booking"""
        try:
            # Get the original payment
            payment = await self._get_existing_payment(booking_id)
            if not payment:
                raise PaymentError("Original payment not found", code="payment_not_found")
            
            if payment.status != PaymentStatus.SUCCEEDED:
                raise PaymentError(
                    "Cannot refund payment that was not successful",
                    code="invalid_payment_status"
                )
            
            # Validate refund amount
            total_refunded = await self._get_total_refunded(booking_id)
            available_for_refund = payment.amount - total_refunded
            
            if refund_amount > available_for_refund:
                raise PaymentError(
                    f"Refund amount ${refund_amount} exceeds available amount ${available_for_refund}",
                    code="invalid_refund_amount"
                )
            
            # Create refund record
            refund = PaymentRefund(
                id=uuid4(),
                payment_id=payment.id,
                amount=refund_amount,
                currency=payment.currency,
                refund_type=refund_type,
                reason=reason,
                status=PaymentStatus.PENDING,
                initiated_by=initiated_by
            )
            
            self.db.add(refund)
            
            # Process refund in Stripe
            stripe_refund = stripe.Refund.create(
                payment_intent=payment.stripe_payment_intent_id,
                amount=int(refund_amount * 100),
                reason='requested_by_customer' if refund_type == RefundType.GUEST_CANCELLATION else 'duplicate',
                metadata={
                    'booking_id': str(booking_id),
                    'refund_type': refund_type.value,
                    'reason': reason
                }
            )
            
            refund.stripe_refund_id = stripe_refund.id
            
            if stripe_refund.status == 'succeeded':
                refund.status = PaymentStatus.SUCCEEDED
                refund.processed_at = datetime.utcnow()
            elif stripe_refund.status == 'pending':
                refund.status = PaymentStatus.PENDING
            else:
                refund.status = PaymentStatus.FAILED
                refund.failure_reason = "Refund processing failed"
            
            await self.db.commit()
            
            logger.info(f"Processed refund {refund.id} for booking {booking_id}: ${refund_amount}")
            return refund
            
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            await self.db.rollback()
            raise
    
    async def calculate_cancellation_refund(
        self,
        booking_id: UUID,
        cancellation_date: datetime = None
    ) -> RefundCalculation:
        """Calculate refund amount based on cancellation policy"""
        try:
            booking = await self._get_booking_with_property(booking_id)
            if not booking:
                raise PaymentError("Booking not found", code="booking_not_found")
            
            if cancellation_date is None:
                cancellation_date = datetime.utcnow()
            
            # Get cancellation policy details
            policy = await self._get_cancellation_policy(booking.property_id)
            
            # Calculate refund based on policy
            refund_calculation = await self._calculate_policy_refund(
                booking, policy, cancellation_date
            )
            
            return refund_calculation
            
        except Exception as e:
            logger.error(f"Error calculating cancellation refund: {str(e)}")
            raise
    
    async def handle_stripe_webhook(self, payload: str, sig_header: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, self._webhook_endpoint_secret
            )
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            # Handle different event types
            if event['type'] == 'payment_intent.succeeded':
                await self._handle_payment_succeeded(event['data']['object'])
            
            elif event['type'] == 'payment_intent.payment_failed':
                await self._handle_payment_failed(event['data']['object'])
            
            elif event['type'] == 'payment_intent.requires_action':
                await self._handle_payment_requires_action(event['data']['object'])
            
            elif event['type'] == 'transfer.created':
                await self._handle_transfer_created(event['data']['object'])
            
            elif event['type'] == 'account.updated':
                await self._handle_account_updated(event['data']['object'])
            
            else:
                logger.info(f"Unhandled webhook event type: {event['type']}")
            
            return {'status': 'success'}
            
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid webhook signature")
            raise PaymentError("Invalid webhook signature", code="invalid_signature")
        
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            raise
    
    # Private helper methods
    
    async def _get_booking_with_property(self, booking_id: UUID) -> Optional[Booking]:
        """Get booking with property details"""
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _get_existing_payment(self, booking_id: UUID) -> Optional[BookingPayment]:
        """Get existing payment for booking"""
        stmt = select(BookingPayment).where(
            and_(
                BookingPayment.booking_id == booking_id,
                BookingPayment.payment_type == 'booking'
            )
        ).order_by(BookingPayment.created_at.desc())
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _get_existing_deposit_payment(self, booking_id: UUID) -> Optional[BookingPayment]:
        """Get existing security deposit payment"""
        stmt = select(BookingPayment).where(
            and_(
                BookingPayment.booking_id == booking_id,
                BookingPayment.payment_type == 'security_deposit'
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _calculate_payment_amounts(self, booking: Booking) -> Dict[str, Decimal]:
        """Calculate payment splitting amounts"""
        total_amount = booking.total_amount
        
        # Platform fee calculation (3% of booking)
        platform_fee_rate = Decimal('0.03')
        platform_fee = total_amount * platform_fee_rate
        
        # Host payout (total minus platform fee)
        host_payout = total_amount - platform_fee
        
        # Payment processing fee (2.9% + $0.30 - absorbed by platform)
        stripe_fee = total_amount * Decimal('0.029') + Decimal('0.30')
        
        return {
            'total_amount': total_amount,
            'platform_fee': platform_fee,
            'host_payout': host_payout,
            'stripe_fee': stripe_fee,
            'currency': booking.currency
        }
    
    async def _get_host_stripe_account(self, host_id: UUID) -> Optional[str]:
        """Get host's Stripe Connect account ID"""
        # In real implementation, this would query the host service
        # For now, return a mock account ID
        return f"acct_host_{host_id}"
    
    async def _create_payment_record(
        self,
        booking: Booking,
        payment_amounts: Dict[str, Decimal],
        user_id: UUID
    ) -> BookingPayment:
        """Create payment record in database"""
        payment = BookingPayment(
            id=uuid4(),
            booking_id=booking.id,
            amount=payment_amounts['total_amount'],
            currency=payment_amounts['currency'],
            payment_type='booking',
            status=PaymentStatus.PENDING,
            platform_fee=payment_amounts['platform_fee'],
            host_payout=payment_amounts['host_payout'],
            stripe_fee=payment_amounts['stripe_fee'],
            created_by=user_id
        )
        
        self.db.add(payment)
        await self.db.flush()  # Get the ID without committing
        return payment
    
    async def _create_stripe_payment_intent(
        self,
        payment_amounts: Dict[str, Decimal],
        booking: Booking,
        host_stripe_account: str,
        payment_method: PaymentMethodRequest
    ) -> stripe.PaymentIntent:
        """Create Stripe payment intent with marketplace splits"""
        
        # Calculate transfer amount to host (after platform fee)
        transfer_amount = int(payment_amounts['host_payout'] * 100)
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(payment_amounts['total_amount'] * 100),
            currency=payment_amounts['currency'].lower(),
            payment_method_types=['card'],
            transfer_data={
                'destination': host_stripe_account,
                'amount': transfer_amount
            },
            metadata={
                'booking_id': str(booking.id),
                'host_id': str(booking.host_id),
                'guest_id': str(booking.guest_id),
                'property_id': str(booking.property_id),
                'check_in': booking.check_in_date.isoformat(),
                'check_out': booking.check_out_date.isoformat()
            },
            description=f"TouriQuest Booking {booking.booking_number}"
        )
        
        return intent
    
    async def _confirm_payment_intent(
        self,
        payment_intent_id: str,
        payment_method_id: str
    ) -> stripe.PaymentIntent:
        """Confirm payment intent with payment method"""
        return stripe.PaymentIntent.confirm(
            payment_intent_id,
            payment_method=payment_method_id
        )
    
    def _get_next_action(self, payment_intent: stripe.PaymentIntent) -> Optional[Dict[str, Any]]:
        """Extract next action details for 3D Secure or other required actions"""
        if payment_intent.next_action:
            return {
                'type': payment_intent.next_action.type,
                'redirect_to_url': payment_intent.next_action.redirect_to_url.url if payment_intent.next_action.redirect_to_url else None,
                'use_stripe_sdk': payment_intent.next_action.use_stripe_sdk if hasattr(payment_intent.next_action, 'use_stripe_sdk') else None
            }
        return None
    
    async def _get_total_refunded(self, booking_id: UUID) -> Decimal:
        """Get total amount already refunded for booking"""
        stmt = select(func.sum(PaymentRefund.amount)).join(
            BookingPayment, PaymentRefund.payment_id == BookingPayment.id
        ).where(
            and_(
                BookingPayment.booking_id == booking_id,
                PaymentRefund.status == PaymentStatus.SUCCEEDED
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalar() or Decimal('0.00')
    
    async def _get_cancellation_policy(self, property_id: UUID) -> Dict[str, Any]:
        """Get cancellation policy for property"""
        # Mock implementation - would query property service
        return {
            'type': 'moderate',
            'free_cancellation_days': 5,
            'partial_refund_days': 14,
            'partial_refund_percentage': 50,
            'service_fee_refundable': True
        }
    
    async def _calculate_policy_refund(
        self,
        booking: Booking,
        policy: Dict[str, Any],
        cancellation_date: datetime
    ) -> RefundCalculation:
        """Calculate refund based on cancellation policy"""
        
        # Days until check-in
        days_until_checkin = (booking.check_in_date - cancellation_date.date()).days
        
        # Get policy parameters
        free_cancellation_days = policy.get('free_cancellation_days', 0)
        partial_refund_days = policy.get('partial_refund_days', 0)
        partial_refund_percentage = policy.get('partial_refund_percentage', 0)
        
        # Calculate base refund
        if days_until_checkin >= free_cancellation_days:
            # Full refund
            refund_type = RefundType.FULL_REFUND
            refund_percentage = 100
            refund_amount = booking.base_price
            reason = f"Free cancellation (cancelled {days_until_checkin} days before check-in)"
            
        elif days_until_checkin >= partial_refund_days:
            # Partial refund
            refund_type = RefundType.PARTIAL_REFUND
            refund_percentage = partial_refund_percentage
            refund_amount = booking.base_price * Decimal(partial_refund_percentage / 100)
            reason = f"Partial refund per policy ({partial_refund_percentage}% refund)"
            
        else:
            # No refund
            refund_type = RefundType.NO_REFUND
            refund_percentage = 0
            refund_amount = Decimal('0.00')
            reason = f"No refund (cancelled {days_until_checkin} days before check-in)"
        
        # Service fee refund
        service_fee_refund = Decimal('0.00')
        if policy.get('service_fee_refundable', False) and refund_percentage > 0:
            service_fee_refund = booking.service_fee
        
        # Cleaning fee refund (usually refundable)
        cleaning_fee_refund = booking.cleaning_fee if refund_percentage > 0 else Decimal('0.00')
        
        # Total refund
        total_refund = refund_amount + service_fee_refund + cleaning_fee_refund
        
        return RefundCalculation(
            refund_type=refund_type,
            refund_amount=refund_amount,
            refund_percentage=refund_percentage,
            service_fee_refund=service_fee_refund,
            cleaning_fee_refund=cleaning_fee_refund,
            total_refund=total_refund,
            reason=reason,
            policy_details=f"{policy['type']} cancellation policy",
            processing_time_days=5  # Standard processing time
        )
    
    # Webhook handlers
    
    async def _handle_payment_succeeded(self, payment_intent: Dict[str, Any]):
        """Handle successful payment webhook"""
        try:
            booking_id = payment_intent['metadata'].get('booking_id')
            if not booking_id:
                return
            
            # Update payment status
            stmt = select(BookingPayment).where(
                BookingPayment.stripe_payment_intent_id == payment_intent['id']
            )
            result = await self.db.execute(stmt)
            payment = result.scalar_one_or_none()
            
            if payment and payment.status != PaymentStatus.SUCCEEDED:
                payment.status = PaymentStatus.SUCCEEDED
                payment.processed_at = datetime.utcnow()
                
                # Update booking status
                booking = await self._get_booking_with_property(UUID(booking_id))
                if booking:
                    booking.status = BookingStatus.CONFIRMED
                    booking.confirmed_at = datetime.utcnow()
                
                await self.db.commit()
                logger.info(f"Payment succeeded for booking {booking_id}")
                
        except Exception as e:
            logger.error(f"Error handling payment succeeded webhook: {str(e)}")
            await self.db.rollback()
    
    async def _handle_payment_failed(self, payment_intent: Dict[str, Any]):
        """Handle failed payment webhook"""
        try:
            stmt = select(BookingPayment).where(
                BookingPayment.stripe_payment_intent_id == payment_intent['id']
            )
            result = await self.db.execute(stmt)
            payment = result.scalar_one_or_none()
            
            if payment:
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = payment_intent.get('last_payment_error', {}).get('message', 'Payment failed')
                await self.db.commit()
                
        except Exception as e:
            logger.error(f"Error handling payment failed webhook: {str(e)}")
            await self.db.rollback()
    
    async def _handle_payment_requires_action(self, payment_intent: Dict[str, Any]):
        """Handle payment that requires additional action"""
        try:
            stmt = select(BookingPayment).where(
                BookingPayment.stripe_payment_intent_id == payment_intent['id']
            )
            result = await self.db.execute(stmt)
            payment = result.scalar_one_or_none()
            
            if payment:
                payment.status = PaymentStatus.REQUIRES_ACTION
                await self.db.commit()
                
        except Exception as e:
            logger.error(f"Error handling payment requires action webhook: {str(e)}")
            await self.db.rollback()
    
    async def _handle_transfer_created(self, transfer: Dict[str, Any]):
        """Handle transfer to host account"""
        logger.info(f"Transfer created: {transfer['id']} amount: {transfer['amount']}")
    
    async def _handle_account_updated(self, account: Dict[str, Any]):
        """Handle host account updates"""
        logger.info(f"Stripe account updated: {account['id']}")


# Utility functions

async def process_scheduled_payouts(db_session: AsyncSession) -> int:
    """Process scheduled payouts to hosts"""
    try:
        # Get payments that need payouts
        stmt = select(BookingPayment).join(Booking).where(
            and_(
                BookingPayment.status == PaymentStatus.SUCCEEDED,
                BookingPayment.payout_processed == False,
                Booking.check_out_date <= datetime.utcnow().date()  # After checkout
            )
        )
        
        result = await db_session.execute(stmt)
        payments_to_payout = result.scalars().all()
        
        processed_count = 0
        for payment in payments_to_payout:
            try:
                # Mark as processed (actual payout would be handled by Stripe automatically)
                payment.payout_processed = True
                payment.payout_date = datetime.utcnow()
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing payout for payment {payment.id}: {str(e)}")
        
        await db_session.commit()
        logger.info(f"Processed {processed_count} scheduled payouts")
        return processed_count
        
    except Exception as e:
        logger.error(f"Error processing scheduled payouts: {str(e)}")
        await db_session.rollback()
        return 0


async def retry_failed_payments(db_session: AsyncSession) -> int:
    """Retry failed payments that are eligible for retry"""
    try:
        # Get failed payments that can be retried
        retry_cutoff = datetime.utcnow() - timedelta(hours=24)
        
        stmt = select(BookingPayment).where(
            and_(
                BookingPayment.status == PaymentStatus.FAILED,
                BookingPayment.retry_count < 3,
                BookingPayment.created_at >= retry_cutoff
            )
        )
        
        result = await db_session.execute(stmt)
        failed_payments = result.scalars().all()
        
        retried_count = 0
        for payment in failed_payments:
            try:
                # Increment retry count
                payment.retry_count = (payment.retry_count or 0) + 1
                
                # In real implementation, would retry the Stripe payment
                # For now, just mark for retry
                logger.info(f"Marked payment {payment.id} for retry (attempt {payment.retry_count})")
                retried_count += 1
                
            except Exception as e:
                logger.error(f"Error retrying payment {payment.id}: {str(e)}")
        
        await db_session.commit()
        return retried_count
        
    except Exception as e:
        logger.error(f"Error retrying failed payments: {str(e)}")
        await db_session.rollback()
        return 0
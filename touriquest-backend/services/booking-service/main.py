"""
TouriQuest Booking Service
FastAPI microservice for reservation management and payment processing
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum
from decimal import Decimal

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Booking Service",
    description="Reservation management and payment processing microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("booking-service")
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
class BookingStatusEnum(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIAL_REFUND = "partial_refund"


class PaymentMethodEnum(str, Enum):
    CREDIT_CARD = "credit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    STRIPE = "stripe"


# Pydantic models
class GuestInfoModel(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    special_requests: Optional[str] = None


class PaymentInfoModel(BaseModel):
    method: PaymentMethodEnum
    amount: Decimal
    currency: str = "USD"
    stripe_payment_intent_id: Optional[str] = None
    transaction_id: Optional[str] = None


class BookingCreateModel(BaseModel):
    property_id: str
    room_id: str
    check_in: date
    check_out: date
    guests: int
    guest_info: GuestInfoModel
    payment_info: PaymentInfoModel
    special_requests: Optional[str] = None
    promotional_code: Optional[str] = None


class BookingUpdateModel(BaseModel):
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: Optional[int] = None
    guest_info: Optional[GuestInfoModel] = None
    special_requests: Optional[str] = None


class BookingResponseModel(BaseModel):
    id: str
    user_id: str
    property_id: str
    room_id: str
    booking_reference: str
    check_in: date
    check_out: date
    guests: int
    nights: int
    guest_info: GuestInfoModel
    payment_info: PaymentInfoModel
    special_requests: Optional[str]
    promotional_code: Optional[str]
    status: BookingStatusEnum
    payment_status: PaymentStatusEnum
    total_amount: Decimal
    currency: str
    created_at: datetime
    updated_at: datetime
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None


class BookingSearchFilters(BaseModel):
    status: Optional[List[BookingStatusEnum]] = None
    check_in_from: Optional[date] = None
    check_in_to: Optional[date] = None
    property_id: Optional[str] = None


class CancellationModel(BaseModel):
    booking_id: str
    reason: str
    refund_requested: bool = True


class RefundModel(BaseModel):
    booking_id: str
    amount: Decimal
    reason: str


# Repository
class BookingRepository(BaseRepository):
    """Booking repository for database operations."""
    
    async def create_booking(self, booking_data: BookingCreateModel, user_id: str) -> Dict[str, Any]:
        """Create a new booking."""
        booking_id = str(uuid.uuid4())
        booking_reference = f"TQ{booking_id[:8].upper()}"
        now = datetime.utcnow()
        
        nights = (booking_data.check_out - booking_data.check_in).days
        
        booking = {
            "id": booking_id,
            "user_id": user_id,
            "booking_reference": booking_reference,
            "nights": nights,
            "status": BookingStatusEnum.PENDING,
            "payment_status": PaymentStatusEnum.PENDING,
            "total_amount": booking_data.payment_info.amount,
            "currency": booking_data.payment_info.currency,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "cancelled_at": None,
            "cancellation_reason": None,
            **booking_data.dict()
        }
        
        logger.info(f"Created booking {booking_id} for user {user_id}")
        return booking
    
    async def get_booking_by_id(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Get booking by ID."""
        return None
    
    async def get_user_bookings(self, user_id: str, filters: BookingSearchFilters) -> List[Dict[str, Any]]:
        """Get user's bookings with filters."""
        return []
    
    async def update_booking(self, booking_id: str, update_data: BookingUpdateModel) -> bool:
        """Update booking."""
        logger.info(f"Updated booking {booking_id}")
        return True
    
    async def cancel_booking(self, booking_id: str, cancellation: CancellationModel) -> bool:
        """Cancel booking."""
        logger.info(f"Cancelled booking {booking_id}: {cancellation.reason}")
        return True
    
    async def process_refund(self, refund: RefundModel) -> bool:
        """Process refund."""
        logger.info(f"Processed refund for booking {refund.booking_id}: {refund.amount}")
        return True


# Payment service integration
class PaymentService:
    """Payment service for processing payments."""
    
    async def process_payment(self, payment_info: PaymentInfoModel) -> Dict[str, Any]:
        """Process payment through payment gateway."""
        # Mock payment processing
        return {
            "success": True,
            "transaction_id": str(uuid.uuid4()),
            "payment_status": PaymentStatusEnum.PAID
        }
    
    async def process_refund(self, payment_info: PaymentInfoModel, amount: Decimal) -> Dict[str, Any]:
        """Process refund through payment gateway."""
        # Mock refund processing
        return {
            "success": True,
            "refund_id": str(uuid.uuid4()),
            "amount": amount,
            "status": "completed"
        }


# Dependencies
def get_booking_repository() -> BookingRepository:
    """Get booking repository dependency."""
    return BookingRepository()


def get_payment_service() -> PaymentService:
    """Get payment service dependency."""
    return PaymentService()


# API Routes
@app.post("/api/v1/bookings", response_model=BookingResponseModel)
async def create_booking(
    booking_data: BookingCreateModel,
    request: Request,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Create a new booking."""
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"create_booking_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 10, 3600):  # 10 per hour
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Booking creation rate limit exceeded"
        )
    
    # Validate dates
    if booking_data.check_in >= booking_data.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be after check-in date"
        )
    
    if booking_data.check_in < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in date cannot be in the past"
        )
    
    # Process payment
    payment_result = await payment_service.process_payment(booking_data.payment_info)
    if not payment_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment processing failed"
        )
    
    # Update payment info with transaction ID
    booking_data.payment_info.transaction_id = payment_result["transaction_id"]
    
    # Create booking
    booking = await booking_repo.create_booking(booking_data, current_user["id"])
    
    # Update booking status based on payment
    booking["status"] = BookingStatusEnum.CONFIRMED
    booking["payment_status"] = payment_result["payment_status"]
    
    return BookingResponseModel(**booking)


@app.get("/api/v1/bookings/{booking_id}", response_model=BookingResponseModel)
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository)
):
    """Get booking by ID."""
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking"
        )
    
    return BookingResponseModel(**booking)


@app.get("/api/v1/bookings", response_model=List[BookingResponseModel])
async def get_user_bookings(
    status: Optional[List[BookingStatusEnum]] = None,
    check_in_from: Optional[date] = None,
    check_in_to: Optional[date] = None,
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository)
):
    """Get user's bookings with filters."""
    filters = BookingSearchFilters(
        status=status,
        check_in_from=check_in_from,
        check_in_to=check_in_to,
        property_id=property_id
    )
    
    bookings = await booking_repo.get_user_bookings(current_user["id"], filters)
    
    return [BookingResponseModel(**booking) for booking in bookings]


@app.put("/api/v1/bookings/{booking_id}", response_model=BookingResponseModel)
async def update_booking(
    booking_id: str,
    update_data: BookingUpdateModel,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository)
):
    """Update booking details."""
    # Check if booking exists and user owns it
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this booking"
        )
    
    # Check if booking can be modified
    if booking["status"] not in [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot be modified in current status"
        )
    
    # Update booking
    success = await booking_repo.update_booking(booking_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update booking"
        )
    
    # Get updated booking
    updated_booking = await booking_repo.get_booking_by_id(booking_id)
    return BookingResponseModel(**updated_booking)


@app.post("/api/v1/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    cancellation: CancellationModel,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Cancel a booking."""
    # Check if booking exists and user owns it
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking"
        )
    
    # Check if booking can be cancelled
    if booking["status"] in [BookingStatusEnum.CANCELLED, BookingStatusEnum.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot be cancelled in current status"
        )
    
    # Process refund if requested
    refund_result = None
    if cancellation.refund_requested and booking["payment_status"] == PaymentStatusEnum.PAID:
        refund_result = await payment_service.process_refund(
            booking["payment_info"],
            booking["total_amount"]
        )
    
    # Cancel booking
    success = await booking_repo.cancel_booking(booking_id, cancellation)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel booking"
        )
    
    return {
        "message": "Booking cancelled successfully",
        "booking_id": booking_id,
        "refund_processed": refund_result is not None,
        "refund_amount": refund_result["amount"] if refund_result else None
    }


@app.post("/api/v1/bookings/{booking_id}/refund")
async def process_booking_refund(
    booking_id: str,
    refund: RefundModel,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Process a refund for a booking."""
    # Check if booking exists and user owns it
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to refund this booking"
        )
    
    # Check if refund is possible
    if booking["payment_status"] != PaymentStatusEnum.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking payment not eligible for refund"
        )
    
    if refund.amount > booking["total_amount"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount cannot exceed booking total"
        )
    
    # Process refund
    refund_result = await payment_service.process_refund(
        booking["payment_info"],
        refund.amount
    )
    
    if not refund_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Refund processing failed"
        )
    
    # Update booking
    success = await booking_repo.process_refund(refund)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update booking refund status"
        )
    
    return {
        "message": "Refund processed successfully",
        "refund_id": refund_result["refund_id"],
        "amount": refund.amount,
        "booking_id": booking_id
    }


@app.get("/api/v1/bookings/{booking_id}/receipt")
async def get_booking_receipt(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    booking_repo: BookingRepository = Depends(get_booking_repository)
):
    """Get booking receipt/invoice."""
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this receipt"
        )
    
    # Generate receipt data
    receipt = {
        "booking_reference": booking["booking_reference"],
        "guest_name": f"{booking['guest_info']['first_name']} {booking['guest_info']['last_name']}",
        "property_name": "Mock Property Name",  # Would fetch from property service
        "check_in": booking["check_in"],
        "check_out": booking["check_out"],
        "nights": booking["nights"],
        "guests": booking["guests"],
        "total_amount": booking["total_amount"],
        "currency": booking["currency"],
        "payment_status": booking["payment_status"],
        "transaction_id": booking["payment_info"]["transaction_id"],
        "booking_date": booking["created_at"]
    }
    
    return receipt


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "booking-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
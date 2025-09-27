"""
Support Ticket API endpoints for customer support system
Handles support ticket creation, management, and resolution
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import logging
from uuid import UUID
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status, UploadFile, File, Form
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.support_models import SupportTicket, TicketStatus, TicketPriority, TicketCategory, TicketType
from app.services.support_service import support_service
from app.services.notification_service import notification_service
from app.core.auth import get_current_user
from app.core.permissions import require_permissions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/support/tickets", tags=["support"])
security = HTTPBearer()


# Pydantic models
class SupportTicketCreateRequest(BaseModel):
    """Request model for creating a support ticket"""
    subject: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    ticket_type: TicketType = TicketType.GENERAL
    booking_id: Optional[str] = None
    property_id: Optional[str] = None
    experience_id: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    contact_method: str = "email"  # email, phone, chat
    contact_details: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class SupportTicketUpdateRequest(BaseModel):
    """Request model for updating a support ticket"""
    subject: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class TicketReplyRequest(BaseModel):
    """Request model for ticket replies"""
    content: str = Field(..., min_length=1, max_length=5000)
    is_internal: bool = False  # Internal notes vs customer-visible replies
    attachments: List[str] = Field(default_factory=list)
    send_notification: bool = True


class TicketTransferRequest(BaseModel):
    """Request model for transferring tickets"""
    assigned_to: str
    department: Optional[str] = None
    reason: Optional[str] = None
    send_notification: bool = True


class SupportAgentResponse(BaseModel):
    """Response model for support agent info"""
    id: str
    name: str
    email: str
    avatar_url: Optional[str]
    department: str
    role: str
    is_online: bool
    current_ticket_count: int

    class Config:
        from_attributes = True


class TicketReplyResponse(BaseModel):
    """Response model for ticket replies"""
    id: str
    ticket_id: str
    author_id: str
    author_name: str
    author_type: str  # customer, agent, system
    content: str
    is_internal: bool
    attachments: List[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SupportTicketResponse(BaseModel):
    """Response model for support ticket data"""
    id: str
    ticket_number: str  # Human-readable ticket number
    subject: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    category: TicketCategory
    ticket_type: TicketType
    
    # Customer information
    customer_id: str
    customer_name: str
    customer_email: str
    customer_avatar: Optional[str]
    
    # Assignment information
    assigned_to: Optional[str]
    assigned_agent_name: Optional[str]
    assigned_department: Optional[str]
    
    # Related entities
    booking_id: Optional[str]
    property_id: Optional[str]
    experience_id: Optional[str]
    
    # Timestamps and tracking
    created_at: datetime
    updated_at: datetime
    first_response_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    
    # Metrics
    response_time_hours: Optional[float]
    resolution_time_hours: Optional[float]
    satisfaction_rating: Optional[int]
    satisfaction_feedback: Optional[str]
    
    # Communication
    contact_method: str
    contact_details: Dict[str, Any]
    last_reply_at: Optional[datetime]
    last_reply_by: Optional[str]
    reply_count: int
    internal_note_count: int
    
    # Organization
    tags: List[str]
    attachments: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    
    # Recent replies (limited for list views)
    recent_replies: Optional[List[TicketReplyResponse]] = None

    class Config:
        from_attributes = True


class SupportTicketListResponse(BaseModel):
    """Response model for support tickets list"""
    tickets: List[SupportTicketResponse]
    total_count: int
    open_count: int
    pending_count: int
    resolved_count: int
    has_more: bool
    next_cursor: Optional[str]


class TicketStatisticsResponse(BaseModel):
    """Response model for ticket statistics"""
    total_tickets: int
    open_tickets: int
    pending_tickets: int
    resolved_tickets: int
    closed_tickets: int
    
    avg_response_time_hours: float
    avg_resolution_time_hours: float
    
    tickets_by_priority: Dict[str, int]
    tickets_by_category: Dict[str, int]
    tickets_by_status: Dict[str, int]
    
    satisfaction_avg: Optional[float]
    satisfaction_distribution: Dict[int, int]
    
    agent_workload: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


@router.get("/", response_model=SupportTicketListResponse)
async def get_support_tickets(
    status: Optional[TicketStatus] = Query(None, description="Filter by ticket status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by priority"),
    category: Optional[TicketCategory] = Query(None, description="Filter by category"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned agent"),
    customer_id: Optional[str] = Query(None, description="Filter by customer"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Number of tickets to return"),
    search_query: Optional[str] = Query(None, description="Search in subject and description"),
    include_closed: bool = Query(False, description="Include closed tickets"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get support tickets with comprehensive filtering
    
    Features:
    - Multi-criteria filtering (status, priority, category, agent, customer)
    - Full-text search across subject and description
    - Date range filtering
    - Pagination with cursor-based navigation
    - Role-based access (customers see only their tickets)
    - Real-time status updates
    - Sorting by priority, date, and status
    """
    try:
        # Build filters based on user role
        filters = {
            "status": status,
            "priority": priority,
            "category": category,
            "assigned_to": assigned_to,
            "cursor": cursor,
            "limit": limit,
            "search_query": search_query,
            "include_closed": include_closed,
            "date_from": date_from,
            "date_to": date_to
        }
        
        # If not admin/agent, only show user's tickets
        if not current_user.is_admin and not hasattr(current_user, 'is_support_agent'):
            filters["customer_id"] = current_user.id
        elif customer_id:
            filters["customer_id"] = customer_id
        
        result = await support_service.get_tickets(db, **filters)
        
        return SupportTicketListResponse(
            tickets=[SupportTicketResponse.from_orm(ticket) for ticket in result["tickets"]],
            total_count=result["total_count"],
            open_count=result["open_count"],
            pending_count=result["pending_count"],
            resolved_count=result["resolved_count"],
            has_more=result["has_more"],
            next_cursor=result["next_cursor"]
        )
        
    except Exception as e:
        logger.error(f"Error getting support tickets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve support tickets"
        )


@router.post("/", response_model=SupportTicketResponse)
async def create_support_ticket(
    ticket_data: SupportTicketCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new support ticket
    
    Features:
    - Automatic ticket number generation
    - Smart agent assignment based on category and workload
    - Attachment handling with virus scanning
    - Automatic priority escalation based on keywords
    - Integration with booking/property/experience context
    - Email notifications to customer and assigned agent
    - SLA timer initiation
    """
    try:
        # Prepare ticket data
        ticket_dict = ticket_data.dict()
        ticket_dict["customer_id"] = current_user.id
        
        # Validate related entities if provided
        if ticket_data.booking_id:
            booking_exists = await support_service.validate_booking_access(
                db, ticket_data.booking_id, current_user.id
            )
            if not booking_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid booking ID or access denied"
                )
        
        # Create ticket
        ticket = await support_service.create_ticket(db, ticket_dict)
        
        # Auto-assign to available agent
        await support_service.auto_assign_ticket(db, ticket.id)
        
        # Send notifications
        await support_service.notify_ticket_created(ticket, current_user)
        
        return SupportTicketResponse.from_orm(ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating support ticket: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create support ticket"
        )


@router.get("/{ticket_id}", response_model=SupportTicketResponse)
async def get_support_ticket(
    ticket_id: str,
    include_replies: bool = Query(True, description="Include ticket replies"),
    include_internal: bool = Query(False, description="Include internal notes (agents only)"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed support ticket information
    
    Features:
    - Complete ticket history and timeline
    - Attachment details with secure download URLs
    - Reply thread with internal/external separation
    - Agent notes and escalation history
    - SLA tracking and metrics
    - Related entity information (booking, property, etc.)
    """
    try:
        ticket = await support_service.get_ticket_by_id(
            db, ticket_id, current_user.id, include_replies, include_internal
        )
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found or access denied"
            )
        
        # Track ticket view for analytics
        await support_service.track_ticket_view(db, ticket_id, current_user.id)
        
        return SupportTicketResponse.from_orm(ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting support ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve support ticket"
        )


@router.put("/{ticket_id}", response_model=SupportTicketResponse)
@require_permissions(["support_agent", "admin"])
async def update_support_ticket(
    ticket_id: str,
    ticket_data: SupportTicketUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update support ticket (agents/admins only)
    
    Features:
    - Status changes with workflow validation
    - Priority escalation/de-escalation
    - Agent assignment and transfer
    - Tag management for organization
    - Automatic SLA recalculation
    - Change notifications to customer
    """
    try:
        # Validate ticket exists
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Update ticket
        updated_ticket = await support_service.update_ticket(
            db, ticket_id, ticket_data.dict(exclude_unset=True), current_user.id
        )
        
        # Send notifications for status changes
        await support_service.notify_ticket_updated(updated_ticket, current_user)
        
        return SupportTicketResponse.from_orm(updated_ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating support ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update support ticket"
        )


@router.post("/{ticket_id}/reply", response_model=TicketReplyResponse)
async def reply_to_ticket(
    ticket_id: str,
    reply_data: TicketReplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Add reply to support ticket
    
    Features:
    - Customer and agent replies
    - Internal notes (agents only)
    - Attachment support with validation
    - Automatic status updates (pending -> open on customer reply)
    - Rich text formatting support
    - Reply notifications via multiple channels
    - SLA timer management
    """
    try:
        # Validate ticket access
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found or access denied"
            )
        
        # Validate internal note permission
        if reply_data.is_internal and not (current_user.is_admin or hasattr(current_user, 'is_support_agent')):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only agents can create internal notes"
            )
        
        # Create reply
        reply_dict = reply_data.dict()
        reply_dict["author_id"] = current_user.id
        reply_dict["ticket_id"] = ticket_id
        
        reply = await support_service.create_reply(db, reply_dict)
        
        # Update ticket status and timestamps
        await support_service.update_ticket_on_reply(db, ticket_id, current_user.id)
        
        # Send notifications if requested and not internal
        if reply_data.send_notification and not reply_data.is_internal:
            await support_service.notify_reply_created(reply, current_user)
        
        return TicketReplyResponse.from_orm(reply)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error replying to ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create reply"
        )


@router.post("/{ticket_id}/transfer")
@require_permissions(["support_agent", "admin"])
async def transfer_ticket(
    ticket_id: str,
    transfer_data: TicketTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Transfer ticket to another agent or department
    
    Features:
    - Agent-to-agent transfer with handoff notes
    - Department escalation
    - Transfer history tracking
    - Notification to new assignee
    - Context preservation
    """
    try:
        # Validate ticket and new assignee
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Validate new assignee exists
        new_agent = await support_service.get_agent_by_id(db, transfer_data.assigned_to)
        if not new_agent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid agent ID"
            )
        
        # Transfer ticket
        await support_service.transfer_ticket(
            db, ticket_id, transfer_data.assigned_to, 
            transfer_data.department, transfer_data.reason, current_user.id
        )
        
        # Send notifications
        if transfer_data.send_notification:
            await support_service.notify_ticket_transferred(
                ticket, new_agent, current_user, transfer_data.reason
            )
        
        return {"message": "Ticket transferred successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transferring ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transfer ticket"
        )


@router.post("/{ticket_id}/escalate")
@require_permissions(["support_agent", "admin"])
async def escalate_ticket(
    ticket_id: str,
    escalation_reason: str = Body(...),
    priority: Optional[TicketPriority] = Body(TicketPriority.HIGH),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Escalate ticket to higher priority or management
    
    Features:
    - Priority escalation with reason tracking
    - Management notification
    - SLA adjustment
    - Escalation audit trail
    """
    try:
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Escalate ticket
        await support_service.escalate_ticket(
            db, ticket_id, escalation_reason, priority, current_user.id
        )
        
        # Notify management and customer
        await support_service.notify_ticket_escalated(ticket, current_user, escalation_reason)
        
        return {"message": "Ticket escalated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error escalating ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to escalate ticket"
        )


@router.post("/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    resolution_summary: str = Body(...),
    satisfaction_rating: Optional[int] = Body(None, ge=1, le=5),
    request_feedback: bool = Body(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Close support ticket with resolution
    
    Features:
    - Resolution summary requirement
    - Customer satisfaction rating
    - Automatic feedback request
    - SLA completion tracking
    - Knowledge base integration for resolution reuse
    """
    try:
        # Validate ticket access and permissions
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Only customer or assigned agent can close
        can_close = (
            current_user.id == ticket.customer_id or  # Customer
            current_user.id == ticket.assigned_to or   # Assigned agent
            current_user.is_admin                      # Admin
        )
        
        if not can_close:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to close this ticket"
            )
        
        # Close ticket
        await support_service.close_ticket(
            db, ticket_id, resolution_summary, satisfaction_rating, current_user.id
        )
        
        # Send notifications and feedback request
        await support_service.notify_ticket_closed(ticket, current_user)
        
        if request_feedback and current_user.id != ticket.customer_id:
            await support_service.send_feedback_request(ticket)
        
        return {"message": "Ticket closed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close ticket"
        )


@router.post("/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: str,
    reason: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Reopen a closed ticket
    
    Features:
    - Customer or agent can reopen
    - Reason requirement for tracking
    - SLA timer restart
    - Agent re-assignment if needed
    """
    try:
        ticket = await support_service.get_ticket_by_id(db, ticket_id, current_user.id)
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        if ticket.status != TicketStatus.CLOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only closed tickets can be reopened"
            )
        
        # Reopen ticket
        await support_service.reopen_ticket(db, ticket_id, reason, current_user.id)
        
        # Notify assigned agent and customer
        await support_service.notify_ticket_reopened(ticket, current_user, reason)
        
        return {"message": "Ticket reopened successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reopening ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reopen ticket"
        )


@router.get("/statistics/overview", response_model=TicketStatisticsResponse)
@require_permissions(["support_agent", "admin"])
async def get_ticket_statistics(
    days: int = Query(30, ge=1, le=365),
    agent_id: Optional[str] = Query(None, description="Filter by agent"),
    department: Optional[str] = Query(None, description="Filter by department"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get comprehensive support ticket statistics
    
    Features:
    - Ticket volume and distribution metrics
    - Response and resolution time analytics
    - Agent performance and workload statistics
    - Customer satisfaction trends
    - SLA compliance rates
    - Trend analysis and forecasting
    """
    try:
        stats = await support_service.get_ticket_statistics(
            db, days, agent_id, department
        )
        
        return TicketStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting ticket statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve ticket statistics"
        )


@router.get("/agents/available", response_model=List[SupportAgentResponse])
@require_permissions(["support_agent", "admin"])
async def get_available_agents(
    department: Optional[str] = Query(None, description="Filter by department"),
    online_only: bool = Query(False, description="Show only online agents"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get available support agents for ticket assignment
    
    Features:
    - Real-time availability status
    - Workload information (current ticket count)
    - Department and skill filtering
    - Response time statistics
    """
    try:
        agents = await support_service.get_available_agents(
            db, department, online_only
        )
        
        return [SupportAgentResponse.from_orm(agent) for agent in agents]
        
    except Exception as e:
        logger.error(f"Error getting available agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available agents"
        )
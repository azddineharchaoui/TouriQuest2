"""Financial management endpoints for TouriQuest admin."""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.financial import (
    FinancialSummary,
    FinancialTransaction,
    RevenueReport,
    CommissionReport,
    PayoutRequest,
    PayoutSummary,
    RefundRequest,
    RefundSummary,
    FinancialFilters,
    PaymentMethodStats,
    FinancialAlert
)
from app.services.financial_service import FinancialService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
financial_service = FinancialService()
audit_service = AuditService()


@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    period: str = Query(default="30d", description="Time period: 7d, 30d, 90d, 1y"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """
    Get financial summary including revenue, transactions, and key metrics.
    """
    try:
        summary = await financial_service.get_financial_summary(db, period)
        
        # Log financial access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.FINANCIAL_VIEWED,
            resource_type="financial_summary",
            description=f"Accessed financial summary for period: {period}",
            severity=AuditSeverity.LOW
        )
        
        return summary
        
    except Exception as e:
        logger.error("Failed to get financial summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve financial summary")


@router.get("/transactions", response_model=List[FinancialTransaction])
async def get_transactions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    transaction_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    min_amount: Optional[Decimal] = Query(default=None),
    max_amount: Optional[Decimal] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Get paginated list of financial transactions with filtering."""
    try:
        filters = FinancialFilters(
            transaction_type=transaction_type,
            status=status,
            date_from=date_from,
            date_to=date_to,
            min_amount=min_amount,
            max_amount=max_amount
        )
        
        transactions = await financial_service.get_transactions(
            db,
            page=page,
            limit=limit,
            filters=filters
        )
        
        # Log transaction access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.FINANCIAL_VIEWED,
            resource_type="financial_transactions",
            description=f"Accessed transactions list with filters: {filters.dict()}",
            severity=AuditSeverity.LOW
        )
        
        return transactions
        
    except Exception as e:
        logger.error("Failed to get transactions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve transactions")


@router.get("/revenue-report", response_model=RevenueReport)
async def get_revenue_report(
    period_start: datetime = Query(..., description="Report period start"),
    period_end: datetime = Query(..., description="Report period end"),
    breakdown_by: str = Query(default="day", description="Breakdown by: day, week, month"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Generate comprehensive revenue report for specified period."""
    try:
        # Validate period
        if period_end <= period_start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        if (period_end - period_start).days > 365:
            raise HTTPException(status_code=400, detail="Report period cannot exceed 1 year")
        
        report = await financial_service.generate_revenue_report(
            db,
            period_start=period_start,
            period_end=period_end,
            breakdown_by=breakdown_by
        )
        
        # Log report generation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_GENERATED,
            resource_type="revenue_report",
            description=f"Generated revenue report for {period_start} to {period_end}",
            severity=AuditSeverity.MEDIUM,
            new_data={
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "breakdown_by": breakdown_by
            }
        )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to generate revenue report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate revenue report")


@router.get("/commission-report", response_model=CommissionReport)
async def get_commission_report(
    period_start: datetime = Query(..., description="Report period start"),
    period_end: datetime = Query(..., description="Report period end"),
    provider_id: Optional[str] = Query(default=None, description="Filter by provider"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Generate commission report for property providers."""
    try:
        report = await financial_service.generate_commission_report(
            db,
            period_start=period_start,
            period_end=period_end,
            provider_id=provider_id
        )
        
        # Log commission report access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_GENERATED,
            resource_type="commission_report",
            description=f"Generated commission report for {period_start} to {period_end}",
            severity=AuditSeverity.MEDIUM
        )
        
        return report
        
    except Exception as e:
        logger.error("Failed to generate commission report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate commission report")


@router.get("/payouts", response_model=List[PayoutSummary])
async def get_payouts(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None),
    provider_id: Optional[str] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Get list of payouts to property providers."""
    try:
        payouts = await financial_service.get_payouts(
            db,
            page=page,
            limit=limit,
            status=status,
            provider_id=provider_id
        )
        
        return payouts
        
    except Exception as e:
        logger.error("Failed to get payouts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve payouts")


@router.post("/payouts/{payout_id}/approve")
async def approve_payout(
    payout_id: str,
    approval_notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PAYOUTS)),
    db=Depends(get_db)
):
    """Approve a payout request."""
    try:
        result = await financial_service.approve_payout(
            db,
            payout_id=payout_id,
            approved_by=current_admin["id"],
            notes=approval_notes
        )
        
        # Log payout approval
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PAYOUT_APPROVED,
            resource_type="payout",
            resource_id=payout_id,
            description=f"Approved payout: {approval_notes or 'No notes'}",
            severity=AuditSeverity.HIGH,
            new_data={"status": "approved", "notes": approval_notes}
        )
        
        logger.info(
            "Payout approved",
            payout_id=payout_id,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to approve payout", payout_id=payout_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to approve payout")


@router.post("/payouts/{payout_id}/reject")
async def reject_payout(
    payout_id: str,
    rejection_reason: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PAYOUTS)),
    db=Depends(get_db)
):
    """Reject a payout request."""
    try:
        result = await financial_service.reject_payout(
            db,
            payout_id=payout_id,
            rejected_by=current_admin["id"],
            reason=rejection_reason
        )
        
        # Log payout rejection
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PAYOUT_REJECTED,
            resource_type="payout",
            resource_id=payout_id,
            description=f"Rejected payout: {rejection_reason}",
            severity=AuditSeverity.HIGH,
            new_data={"status": "rejected", "reason": rejection_reason}
        )
        
        logger.info(
            "Payout rejected",
            payout_id=payout_id,
            reason=rejection_reason,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to reject payout", payout_id=payout_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to reject payout")


@router.get("/refunds", response_model=List[RefundSummary])
async def get_refunds(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Get list of refund requests."""
    try:
        refunds = await financial_service.get_refunds(
            db,
            page=page,
            limit=limit,
            status=status
        )
        
        return refunds
        
    except Exception as e:
        logger.error("Failed to get refunds", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve refunds")


@router.post("/refunds/{refund_id}/process")
async def process_refund(
    refund_id: str,
    refund_amount: Optional[Decimal] = None,
    refund_reason: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REFUNDS)),
    db=Depends(get_db)
):
    """Process a refund request."""
    try:
        result = await financial_service.process_refund(
            db,
            refund_id=refund_id,
            processed_by=current_admin["id"],
            refund_amount=refund_amount,
            reason=refund_reason
        )
        
        # Log refund processing
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REFUND_PROCESSED,
            resource_type="refund",
            resource_id=refund_id,
            description=f"Processed refund: {refund_reason or 'No reason provided'}",
            severity=AuditSeverity.HIGH,
            new_data={
                "amount": str(refund_amount) if refund_amount else None,
                "reason": refund_reason
            }
        )
        
        logger.info(
            "Refund processed",
            refund_id=refund_id,
            amount=refund_amount,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to process refund", refund_id=refund_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to process refund")


@router.get("/payment-methods/stats", response_model=PaymentMethodStats)
async def get_payment_method_stats(
    period: str = Query(default="30d", description="Time period: 7d, 30d, 90d, 1y"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get payment method usage statistics."""
    try:
        stats = await financial_service.get_payment_method_stats(db, period)
        return stats
        
    except Exception as e:
        logger.error("Failed to get payment method stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve payment method statistics")


@router.get("/alerts", response_model=List[FinancialAlert])
async def get_financial_alerts(
    active_only: bool = Query(default=True, description="Show only active alerts"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Get financial alerts and anomalies."""
    try:
        alerts = await financial_service.get_financial_alerts(
            db,
            active_only=active_only
        )
        
        return alerts
        
    except Exception as e:
        logger.error("Failed to get financial alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve financial alerts")


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Acknowledge a financial alert."""
    try:
        result = await financial_service.acknowledge_alert(
            db,
            alert_id=alert_id,
            acknowledged_by=current_admin["id"],
            notes=notes
        )
        
        # Log alert acknowledgment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_ACKNOWLEDGED,
            resource_type="financial_alert",
            resource_id=alert_id,
            description=f"Acknowledged financial alert: {notes or 'No notes'}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to acknowledge alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.post("/export/transactions")
async def export_transactions(
    background_tasks: BackgroundTasks,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    format: str = Query(default="csv", description="Export format: csv, xlsx"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EXPORT_DATA)),
    db=Depends(get_db)
):
    """Export transaction data to file."""
    try:
        # Validate date range
        if (date_to - date_from).days > 365:
            raise HTTPException(status_code=400, detail="Export period cannot exceed 1 year")
        
        # Queue export task
        export_id = await financial_service.queue_transaction_export(
            db,
            date_from=date_from,
            date_to=date_to,
            format=format,
            requested_by=current_admin["id"]
        )
        
        # Log export request
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.DATA_EXPORTED,
            resource_type="transaction_export",
            resource_id=export_id,
            description=f"Requested transaction export from {date_from} to {date_to}",
            severity=AuditSeverity.MEDIUM,
            new_data={
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "format": format
            }
        )
        
        return {
            "export_id": export_id,
            "message": "Export queued successfully",
            "estimated_completion": "5-10 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to export transactions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to queue export")
"""Automated reporting and notifications endpoints for admin alerts and scheduled reports."""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.automated_reporting import (
    ReportSchedule,
    ReportTemplate,
    GeneratedReport,
    NotificationRule,
    AlertConfiguration,
    ReportSubscription,
    NotificationChannel,
    AutomatedAlert,
    ReportExecution,
    NotificationLog,
    ReportMetrics
)
from app.services.automated_reporting_service import AutomatedReportingService
from app.services.notification_automation_service import NotificationAutomationService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
reporting_service = AutomatedReportingService()
notification_service = NotificationAutomationService()
audit_service = AuditService()


@router.get("/reports/schedules", response_model=List[ReportSchedule])
async def get_report_schedules(
    active_only: bool = Query(default=True, description="Show only active schedules"),
    report_type: Optional[str] = Query(default=None, description="Filter by report type"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get all scheduled report configurations."""
    try:
        schedules = await reporting_service.get_report_schedules(
            db, active_only=active_only, report_type=report_type
        )
        return schedules
        
    except Exception as e:
        logger.error("Failed to get report schedules", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report schedules")


@router.post("/reports/schedules", response_model=ReportSchedule)
async def create_report_schedule(
    schedule_data: ReportSchedule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Create a new automated report schedule."""
    try:
        schedule = await reporting_service.create_report_schedule(
            db, schedule_data, current_admin["id"]
        )
        
        # Log schedule creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_SCHEDULED,
            resource_type="report_schedule",
            resource_id=schedule.id,
            description=f"Created report schedule: {schedule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return schedule
        
    except Exception as e:
        logger.error("Failed to create report schedule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create report schedule")


@router.put("/reports/schedules/{schedule_id}", response_model=ReportSchedule)
async def update_report_schedule(
    schedule_id: str,
    schedule_data: ReportSchedule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Update an existing report schedule."""
    try:
        schedule = await reporting_service.update_report_schedule(
            db, schedule_id, schedule_data, current_admin["id"]
        )
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Report schedule not found")
        
        # Log schedule update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_SCHEDULE_UPDATED,
            resource_type="report_schedule",
            resource_id=schedule_id,
            description=f"Updated report schedule: {schedule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return schedule
        
    except Exception as e:
        logger.error("Failed to update report schedule", error=str(e), schedule_id=schedule_id)
        raise HTTPException(status_code=500, detail="Failed to update report schedule")


@router.delete("/reports/schedules/{schedule_id}")
async def delete_report_schedule(
    schedule_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Delete a report schedule."""
    try:
        result = await reporting_service.delete_report_schedule(db, schedule_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Report schedule not found")
        
        # Log schedule deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_SCHEDULE_DELETED,
            resource_type="report_schedule",
            resource_id=schedule_id,
            description=f"Deleted report schedule: {schedule_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Report schedule deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete report schedule", error=str(e), schedule_id=schedule_id)
        raise HTTPException(status_code=500, detail="Failed to delete report schedule")


@router.post("/reports/schedules/{schedule_id}/run")
async def run_scheduled_report(
    schedule_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.GENERATE_REPORTS)),
    db=Depends(get_db)
):
    """Manually trigger a scheduled report execution."""
    try:
        execution = await reporting_service.trigger_scheduled_report(
            db, schedule_id, current_admin["id"]
        )
        
        # Add background task for report generation
        background_tasks.add_task(
            reporting_service.generate_scheduled_report,
            db, execution.id
        )
        
        # Log manual report execution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_EXECUTED,
            resource_type="report_schedule",
            resource_id=schedule_id,
            description=f"Manually triggered scheduled report: {schedule_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return execution
        
    except Exception as e:
        logger.error("Failed to run scheduled report", error=str(e), schedule_id=schedule_id)
        raise HTTPException(status_code=500, detail="Failed to run scheduled report")


@router.get("/reports/templates", response_model=List[ReportTemplate])
async def get_report_templates(
    category: Optional[str] = Query(default=None, description="Filter by template category"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get available report templates for automation."""
    try:
        templates = await reporting_service.get_report_templates(db, category=category)
        return templates
        
    except Exception as e:
        logger.error("Failed to get report templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report templates")


@router.get("/reports/generated", response_model=List[GeneratedReport])
async def get_generated_reports(
    schedule_id: Optional[str] = Query(default=None, description="Filter by schedule ID"),
    status: Optional[str] = Query(default=None, description="Filter by report status"),
    days: int = Query(default=30, ge=1, le=365, description="Days of reports to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get list of generated automated reports."""
    try:
        reports = await reporting_service.get_generated_reports(
            db, 
            schedule_id=schedule_id,
            status=status,
            days=days,
            page=page,
            limit=limit
        )
        return reports
        
    except Exception as e:
        logger.error("Failed to get generated reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve generated reports")


@router.get("/reports/generated/{report_id}/download")
async def download_generated_report(
    report_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Download a generated automated report."""
    try:
        report_file = await reporting_service.get_generated_report_file(db, report_id)
        
        if not report_file:
            raise HTTPException(status_code=404, detail="Generated report not found")
        
        # Log report download
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_DOWNLOADED,
            resource_type="generated_report",
            resource_id=report_id,
            description=f"Downloaded automated report: {report_id}",
            severity=AuditSeverity.LOW
        )
        
        return StreamingResponse(
            report_file["stream"],
            media_type=report_file["media_type"],
            headers={"Content-Disposition": f"attachment; filename={report_file['filename']}"}
        )
        
    except Exception as e:
        logger.error("Failed to download generated report", error=str(e), report_id=report_id)
        raise HTTPException(status_code=500, detail="Failed to download generated report")


@router.get("/notifications/rules", response_model=List[NotificationRule])
async def get_notification_rules(
    active_only: bool = Query(default=True, description="Show only active rules"),
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Get automated notification rules and triggers."""
    try:
        rules = await notification_service.get_notification_rules(
            db, active_only=active_only, event_type=event_type
        )
        return rules
        
    except Exception as e:
        logger.error("Failed to get notification rules", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve notification rules")


@router.post("/notifications/rules", response_model=NotificationRule)
async def create_notification_rule(
    rule_data: NotificationRule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Create a new automated notification rule."""
    try:
        rule = await notification_service.create_notification_rule(
            db, rule_data, current_admin["id"]
        )
        
        # Log rule creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.NOTIFICATION_RULE_CREATED,
            resource_type="notification_rule",
            resource_id=rule.id,
            description=f"Created notification rule: {rule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return rule
        
    except Exception as e:
        logger.error("Failed to create notification rule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create notification rule")


@router.put("/notifications/rules/{rule_id}", response_model=NotificationRule)
async def update_notification_rule(
    rule_id: str,
    rule_data: NotificationRule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Update an existing notification rule."""
    try:
        rule = await notification_service.update_notification_rule(
            db, rule_id, rule_data, current_admin["id"]
        )
        
        if not rule:
            raise HTTPException(status_code=404, detail="Notification rule not found")
        
        # Log rule update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.NOTIFICATION_RULE_UPDATED,
            resource_type="notification_rule",
            resource_id=rule_id,
            description=f"Updated notification rule: {rule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return rule
        
    except Exception as e:
        logger.error("Failed to update notification rule", error=str(e), rule_id=rule_id)
        raise HTTPException(status_code=500, detail="Failed to update notification rule")


@router.delete("/notifications/rules/{rule_id}")
async def delete_notification_rule(
    rule_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Delete a notification rule."""
    try:
        result = await notification_service.delete_notification_rule(db, rule_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Notification rule not found")
        
        # Log rule deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.NOTIFICATION_RULE_DELETED,
            resource_type="notification_rule",
            resource_id=rule_id,
            description=f"Deleted notification rule: {rule_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Notification rule deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete notification rule", error=str(e), rule_id=rule_id)
        raise HTTPException(status_code=500, detail="Failed to delete notification rule")


@router.get("/alerts/configurations", response_model=List[AlertConfiguration])
async def get_alert_configurations(
    alert_type: Optional[str] = Query(default=None, description="Filter by alert type"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ALERTS)),
    db=Depends(get_db)
):
    """Get alert configurations and thresholds."""
    try:
        configurations = await notification_service.get_alert_configurations(
            db, alert_type=alert_type, severity=severity
        )
        return configurations
        
    except Exception as e:
        logger.error("Failed to get alert configurations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alert configurations")


@router.post("/alerts/configurations", response_model=AlertConfiguration)
async def create_alert_configuration(
    config_data: AlertConfiguration,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Create a new alert configuration."""
    try:
        configuration = await notification_service.create_alert_configuration(
            db, config_data, current_admin["id"]
        )
        
        # Log alert configuration creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_CONFIG_CREATED,
            resource_type="alert_config",
            resource_id=configuration.id,
            description=f"Created alert configuration: {configuration.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return configuration
        
    except Exception as e:
        logger.error("Failed to create alert configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create alert configuration")


@router.get("/subscriptions", response_model=List[ReportSubscription])
async def get_report_subscriptions(
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    report_type: Optional[str] = Query(default=None, description="Filter by report type"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SUBSCRIPTIONS)),
    db=Depends(get_db)
):
    """Get user report subscriptions."""
    try:
        subscriptions = await reporting_service.get_report_subscriptions(
            db, user_id=user_id, report_type=report_type
        )
        return subscriptions
        
    except Exception as e:
        logger.error("Failed to get report subscriptions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report subscriptions")


@router.post("/subscriptions", response_model=ReportSubscription)
async def create_report_subscription(
    subscription_data: ReportSubscription,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SUBSCRIPTIONS)),
    db=Depends(get_db)
):
    """Create a report subscription for a user."""
    try:
        subscription = await reporting_service.create_report_subscription(
            db, subscription_data, current_admin["id"]
        )
        
        # Log subscription creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SUBSCRIPTION_CREATED,
            resource_type="report_subscription",
            resource_id=subscription.id,
            description=f"Created report subscription for user: {subscription.user_id}",
            severity=AuditSeverity.LOW
        )
        
        return subscription
        
    except Exception as e:
        logger.error("Failed to create report subscription", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create report subscription")


@router.get("/notifications/channels", response_model=List[NotificationChannel])
async def get_notification_channels(
    channel_type: Optional[str] = Query(default=None, description="Filter by channel type"),
    active_only: bool = Query(default=True, description="Show only active channels"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Get configured notification channels (email, SMS, Slack, etc.)."""
    try:
        channels = await notification_service.get_notification_channels(
            db, channel_type=channel_type, active_only=active_only
        )
        return channels
        
    except Exception as e:
        logger.error("Failed to get notification channels", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve notification channels")


@router.post("/notifications/channels/test/{channel_id}")
async def test_notification_channel(
    channel_id: str,
    test_message: str = Query(..., description="Test message to send"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Test a notification channel with a test message."""
    try:
        result = await notification_service.test_notification_channel(
            db, channel_id, test_message, current_admin["id"]
        )
        
        # Log channel test
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.NOTIFICATION_CHANNEL_TESTED,
            resource_type="notification_channel",
            resource_id=channel_id,
            description=f"Tested notification channel: {channel_id}",
            severity=AuditSeverity.LOW
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to test notification channel", error=str(e), channel_id=channel_id)
        raise HTTPException(status_code=500, detail="Failed to test notification channel")


@router.get("/alerts/automated", response_model=List[AutomatedAlert])
async def get_automated_alerts(
    status: Optional[str] = Query(default="active", description="Filter by alert status"),
    priority: Optional[str] = Query(default=None, description="Filter by priority"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of alerts to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ALERTS)),
    db=Depends(get_db)
):
    """Get automated alerts generated by the system."""
    try:
        alerts = await notification_service.get_automated_alerts(
            db, status=status, priority=priority, hours=hours, page=page, limit=limit
        )
        return alerts
        
    except Exception as e:
        logger.error("Failed to get automated alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve automated alerts")


@router.get("/metrics/reports", response_model=ReportMetrics)
async def get_reporting_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Days of metrics to analyze"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get metrics about automated reporting system performance."""
    try:
        metrics = await reporting_service.get_reporting_metrics(db, days)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get reporting metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve reporting metrics")


@router.get("/notifications/log", response_model=List[NotificationLog])
async def get_notification_log(
    channel_id: Optional[str] = Query(default=None, description="Filter by channel ID"),
    status: Optional[str] = Query(default=None, description="Filter by delivery status"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of logs to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=500, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_NOTIFICATIONS)),
    db=Depends(get_db)
):
    """Get notification delivery logs and status."""
    try:
        logs = await notification_service.get_notification_log(
            db, channel_id=channel_id, status=status, hours=hours, page=page, limit=limit
        )
        return logs
        
    except Exception as e:
        logger.error("Failed to get notification log", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve notification log")


@router.post("/reports/bulk-email")
async def send_bulk_report_email(
    report_id: str = Query(..., description="Report ID to send"),
    recipient_list: List[str] = Query(..., description="List of email recipients"),
    subject: Optional[str] = Query(default=None, description="Custom email subject"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.SEND_REPORTS)),
    db=Depends(get_db)
):
    """Send a generated report to multiple recipients via email."""
    try:
        # Queue bulk email sending as background task
        background_tasks.add_task(
            reporting_service.send_bulk_report_email,
            db, report_id, recipient_list, subject, current_admin["id"]
        )
        
        # Log bulk email send
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BULK_EMAIL_SENT,
            resource_type="generated_report",
            resource_id=report_id,
            description=f"Queued bulk email for report {report_id} to {len(recipient_list)} recipients",
            severity=AuditSeverity.MEDIUM
        )
        
        return {
            "message": f"Bulk email queued for {len(recipient_list)} recipients",
            "report_id": report_id,
            "recipients_count": len(recipient_list)
        }
        
    except Exception as e:
        logger.error("Failed to send bulk report email", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to send bulk report email")
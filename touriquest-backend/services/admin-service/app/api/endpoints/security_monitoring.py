"""Security monitoring and alerts endpoints for threat detection and response."""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import structlog
import json

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.security_monitoring import (
    SecurityAlert,
    ThreatDetection,
    SecurityMetrics,
    SecurityIncident,
    SecurityRule,
    SecurityConfiguration,
    LoginAttempt,
    SuspiciousActivity,
    VulnerabilityReport,
    SecurityDashboard,
    SecurityPolicy,
    BlockedIP,
    FailedLoginSummary
)
from app.services.security_monitoring_service import SecurityMonitoringService
from app.services.threat_detection_service import ThreatDetectionService
from app.services.websocket_manager import WebSocketManager
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
security_service = SecurityMonitoringService()
threat_service = ThreatDetectionService()
websocket_manager = WebSocketManager()
audit_service = AuditService()


@router.get("/dashboard", response_model=SecurityDashboard)
async def get_security_dashboard(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """
    Get comprehensive security dashboard with real-time metrics.
    
    Includes:
    - Active security alerts and threats
    - Login attempt statistics
    - Blocked IPs and suspicious activities
    - System vulnerability status
    - Security metrics and trends
    """
    try:
        dashboard = await security_service.get_security_dashboard(db)
        
        # Log security dashboard access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_ACCESSED,
            resource_type="security_dashboard",
            description="Accessed security monitoring dashboard",
            severity=AuditSeverity.LOW
        )
        
        return dashboard
        
    except Exception as e:
        logger.error("Failed to get security dashboard", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security dashboard")


@router.get("/alerts", response_model=List[SecurityAlert])
async def get_security_alerts(
    severity: Optional[str] = Query(default=None, description="Filter by alert severity"),
    status: Optional[str] = Query(default="active", description="Filter by alert status"),
    alert_type: Optional[str] = Query(default=None, description="Filter by alert type"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of alerts to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get security alerts with filtering options."""
    try:
        alerts = await security_service.get_security_alerts(
            db, 
            severity=severity,
            status=status,
            alert_type=alert_type,
            hours=hours,
            page=page,
            limit=limit
        )
        return alerts
        
    except Exception as e:
        logger.error("Failed to get security alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security alerts")


@router.get("/alerts/{alert_id}", response_model=SecurityAlert)
async def get_security_alert_detail(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get detailed information about a specific security alert."""
    try:
        alert = await security_service.get_security_alert_detail(db, alert_id)
        
        if not alert:
            raise HTTPException(status_code=404, detail="Security alert not found")
            
        return alert
        
    except Exception as e:
        logger.error("Failed to get security alert detail", error=str(e), alert_id=alert_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve security alert details")


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_security_alert(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Acknowledge a security alert."""
    try:
        result = await security_service.acknowledge_alert(db, alert_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Security alert not found")
        
        # Log alert acknowledgment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_ALERT_ACKNOWLEDGED,
            resource_type="security_alert",
            resource_id=alert_id,
            description=f"Acknowledged security alert: {alert_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {"message": "Security alert acknowledged successfully"}
        
    except Exception as e:
        logger.error("Failed to acknowledge security alert", error=str(e), alert_id=alert_id)
        raise HTTPException(status_code=500, detail="Failed to acknowledge security alert")


@router.post("/alerts/{alert_id}/resolve")
async def resolve_security_alert(
    alert_id: str,
    resolution_note: str = Query(..., description="Resolution details"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Resolve a security alert with resolution notes."""
    try:
        result = await security_service.resolve_alert(
            db, alert_id, resolution_note, current_admin["id"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Security alert not found")
        
        # Log alert resolution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_ALERT_RESOLVED,
            resource_type="security_alert",
            resource_id=alert_id,
            description=f"Resolved security alert: {alert_id} - {resolution_note}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {"message": "Security alert resolved successfully"}
        
    except Exception as e:
        logger.error("Failed to resolve security alert", error=str(e), alert_id=alert_id)
        raise HTTPException(status_code=500, detail="Failed to resolve security alert")


@router.get("/threats", response_model=List[ThreatDetection])
async def get_threat_detections(
    threat_type: Optional[str] = Query(default=None, description="Filter by threat type"),
    risk_level: Optional[str] = Query(default=None, description="Filter by risk level"),
    status: Optional[str] = Query(default="active", description="Filter by status"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of threats to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get detected security threats and potential attacks."""
    try:
        threats = await threat_service.get_threat_detections(
            db,
            threat_type=threat_type,
            risk_level=risk_level,
            status=status,
            hours=hours,
            page=page,
            limit=limit
        )
        return threats
        
    except Exception as e:
        logger.error("Failed to get threat detections", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve threat detections")


@router.get("/login-attempts", response_model=List[LoginAttempt])
async def get_login_attempts(
    success: Optional[bool] = Query(default=None, description="Filter by success status"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of attempts to retrieve"),
    ip_address: Optional[str] = Query(default=None, description="Filter by IP address"),
    user_agent: Optional[str] = Query(default=None, description="Filter by user agent"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=500, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get login attempts with detailed filtering options."""
    try:
        login_attempts = await security_service.get_login_attempts(
            db,
            success=success,
            hours=hours,
            ip_address=ip_address,
            user_agent=user_agent,
            page=page,
            limit=limit
        )
        return login_attempts
        
    except Exception as e:
        logger.error("Failed to get login attempts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve login attempts")


@router.get("/login-attempts/summary", response_model=FailedLoginSummary)
async def get_failed_login_summary(
    hours: int = Query(default=24, ge=1, le=168, description="Hours to analyze"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get summary of failed login attempts and patterns."""
    try:
        summary = await security_service.get_failed_login_summary(db, hours)
        return summary
        
    except Exception as e:
        logger.error("Failed to get failed login summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve failed login summary")


@router.get("/suspicious-activity", response_model=List[SuspiciousActivity])
async def get_suspicious_activity(
    activity_type: Optional[str] = Query(default=None, description="Filter by activity type"),
    risk_score: Optional[int] = Query(default=None, ge=1, le=100, description="Minimum risk score"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of activity to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get suspicious user activities detected by ML algorithms."""
    try:
        activities = await security_service.get_suspicious_activity(
            db,
            activity_type=activity_type,
            risk_score=risk_score,
            hours=hours,
            page=page,
            limit=limit
        )
        return activities
        
    except Exception as e:
        logger.error("Failed to get suspicious activity", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve suspicious activity")


@router.get("/blocked-ips", response_model=List[BlockedIP])
async def get_blocked_ips(
    reason: Optional[str] = Query(default=None, description="Filter by block reason"),
    active_only: bool = Query(default=True, description="Show only active blocks"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=500, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get list of blocked IP addresses."""
    try:
        blocked_ips = await security_service.get_blocked_ips(
            db, reason=reason, active_only=active_only, page=page, limit=limit
        )
        return blocked_ips
        
    except Exception as e:
        logger.error("Failed to get blocked IPs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve blocked IPs")


@router.post("/block-ip")
async def block_ip_address(
    ip_address: str = Query(..., description="IP address to block"),
    reason: str = Query(..., description="Reason for blocking"),
    duration_hours: Optional[int] = Query(default=None, description="Block duration in hours (permanent if not specified)"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Block an IP address with specified reason and duration."""
    try:
        result = await security_service.block_ip_address(
            db, ip_address, reason, duration_hours, current_admin["id"]
        )
        
        # Log IP blocking
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.IP_BLOCKED,
            resource_type="ip_address",
            resource_id=ip_address,
            description=f"Blocked IP {ip_address}: {reason} (Duration: {duration_hours or 'permanent'} hours)",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to block IP address", error=str(e), ip_address=ip_address)
        raise HTTPException(status_code=500, detail="Failed to block IP address")


@router.delete("/blocked-ips/{ip_address}")
async def unblock_ip_address(
    ip_address: str,
    reason: str = Query(..., description="Reason for unblocking"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Unblock an IP address."""
    try:
        result = await security_service.unblock_ip_address(
            db, ip_address, reason, current_admin["id"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="IP address not found in blocked list")
        
        # Log IP unblocking
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.IP_UNBLOCKED,
            resource_type="ip_address",
            resource_id=ip_address,
            description=f"Unblocked IP {ip_address}: {reason}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {"message": f"IP address {ip_address} unblocked successfully"}
        
    except Exception as e:
        logger.error("Failed to unblock IP address", error=str(e), ip_address=ip_address)
        raise HTTPException(status_code=500, detail="Failed to unblock IP address")


@router.get("/metrics", response_model=SecurityMetrics)
async def get_security_metrics(
    period: str = Query(default="hourly", regex="^(hourly|daily|weekly)$"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of metrics to retrieve"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get security metrics and trends over time."""
    try:
        metrics = await security_service.get_security_metrics(db, period, hours)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get security metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security metrics")


@router.get("/vulnerabilities", response_model=List[VulnerabilityReport])
async def get_vulnerability_reports(
    severity: Optional[str] = Query(default=None, description="Filter by vulnerability severity"),
    status: Optional[str] = Query(default="open", description="Filter by status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get system vulnerability reports and assessments."""
    try:
        vulnerabilities = await security_service.get_vulnerability_reports(
            db, severity=severity, status=status, page=page, limit=limit
        )
        return vulnerabilities
        
    except Exception as e:
        logger.error("Failed to get vulnerability reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve vulnerability reports")


@router.post("/scan/vulnerability")
async def run_vulnerability_scan(
    scan_type: str = Query(..., regex="^(quick|full|targeted)$"),
    target: Optional[str] = Query(default=None, description="Specific target for scan"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Run vulnerability scan on system components."""
    try:
        scan_job = await security_service.run_vulnerability_scan(
            db, scan_type, target, current_admin["id"]
        )
        
        # Log vulnerability scan
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.VULNERABILITY_SCAN,
            resource_type="security_scan",
            resource_id=scan_job["scan_id"],
            description=f"Started {scan_type} vulnerability scan",
            severity=AuditSeverity.MEDIUM
        )
        
        return scan_job
        
    except Exception as e:
        logger.error("Failed to run vulnerability scan", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to run vulnerability scan")


@router.get("/rules", response_model=List[SecurityRule])
async def get_security_rules(
    rule_type: Optional[str] = Query(default=None, description="Filter by rule type"),
    enabled_only: bool = Query(default=True, description="Show only enabled rules"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get security rules and detection policies."""
    try:
        rules = await security_service.get_security_rules(
            db, rule_type=rule_type, enabled_only=enabled_only
        )
        return rules
        
    except Exception as e:
        logger.error("Failed to get security rules", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security rules")


@router.post("/rules")
async def create_security_rule(
    rule_data: SecurityRule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Create a new security rule."""
    try:
        rule = await security_service.create_security_rule(db, rule_data, current_admin["id"])
        
        # Log rule creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_RULE_CREATED,
            resource_type="security_rule",
            resource_id=rule.id,
            description=f"Created security rule: {rule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return rule
        
    except Exception as e:
        logger.error("Failed to create security rule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create security rule")


@router.put("/rules/{rule_id}")
async def update_security_rule(
    rule_id: str,
    rule_data: SecurityRule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Update an existing security rule."""
    try:
        rule = await security_service.update_security_rule(db, rule_id, rule_data, current_admin["id"])
        
        if not rule:
            raise HTTPException(status_code=404, detail="Security rule not found")
        
        # Log rule update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_RULE_UPDATED,
            resource_type="security_rule",
            resource_id=rule_id,
            description=f"Updated security rule: {rule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return rule
        
    except Exception as e:
        logger.error("Failed to update security rule", error=str(e), rule_id=rule_id)
        raise HTTPException(status_code=500, detail="Failed to update security rule")


@router.delete("/rules/{rule_id}")
async def delete_security_rule(
    rule_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SECURITY)),
    db=Depends(get_db)
):
    """Delete a security rule."""
    try:
        result = await security_service.delete_security_rule(db, rule_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Security rule not found")
        
        # Log rule deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SECURITY_RULE_DELETED,
            resource_type="security_rule",
            resource_id=rule_id,
            description=f"Deleted security rule: {rule_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Security rule deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete security rule", error=str(e), rule_id=rule_id)
        raise HTTPException(status_code=500, detail="Failed to delete security rule")


@router.get("/incidents", response_model=List[SecurityIncident])
async def get_security_incidents(
    status: Optional[str] = Query(default="open", description="Filter by incident status"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    days: int = Query(default=30, ge=1, le=365, description="Days of incidents to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY)),
    db=Depends(get_db)
):
    """Get security incidents for investigation and response."""
    try:
        incidents = await security_service.get_security_incidents(
            db, status=status, severity=severity, days=days, page=page, limit=limit
        )
        return incidents
        
    except Exception as e:
        logger.error("Failed to get security incidents", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve security incidents")


@router.websocket("/live-security")
async def live_security_websocket(
    websocket: WebSocket,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SECURITY))
):
    """WebSocket endpoint for real-time security alerts and monitoring."""
    await websocket_manager.connect(websocket, f"security_live_{current_admin['id']}")
    
    try:
        while True:
            # Get real-time security data
            security_data = await security_service.get_live_security_data()
            
            # Send security updates to connected websocket
            await websocket_manager.send_personal_message(
                json.dumps({
                    "type": "security_update",
                    "data": security_data,
                    "timestamp": datetime.utcnow().isoformat()
                }), 
                websocket
            )
            
            await asyncio.sleep(10)  # Update every 10 seconds
            
    except Exception as e:
        logger.error("Security WebSocket connection error", error=str(e))
    finally:
        await websocket_manager.disconnect(websocket)
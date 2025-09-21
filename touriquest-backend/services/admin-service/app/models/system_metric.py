"""System metrics model for monitoring application performance."""

from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from app.core.database import Base


class SystemMetric(Base):
    """System metrics model for monitoring application performance and health."""
    
    __tablename__ = "system_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Metric identification
    metric_name = Column(String(255), nullable=False, index=True)
    metric_type = Column(String(50), nullable=False)  # counter, gauge, histogram
    category = Column(String(100), nullable=False, index=True)  # performance, business, system
    
    # Metric values
    value = Column(Float, nullable=False)
    count = Column(Integer, nullable=True)  # For counters
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    avg_value = Column(Float, nullable=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Additional labels/tags
    metadata = Column(JSON, nullable=True)  # Extra context
    unit = Column(String(20), nullable=True)  # seconds, bytes, count, etc.
    
    # Time information
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Source information
    source = Column(String(100), nullable=True)  # service name, server name
    environment = Column(String(50), nullable=False, default="production")
    
    def __repr__(self):
        return f"<SystemMetric(name={self.metric_name}, value={self.value}, timestamp={self.timestamp})>"


class Report(Base):
    """Report model for storing generated reports and analytics."""
    
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Report identification
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)  # financial, user_analytics, etc.
    description = Column(Text, nullable=True)
    
    # Report parameters
    parameters = Column(JSON, nullable=True)  # Filters, date ranges, etc.
    date_from = Column(DateTime(timezone=True), nullable=True)
    date_to = Column(DateTime(timezone=True), nullable=True)
    
    # Report data
    data = Column(JSON, nullable=True)  # Report results
    summary = Column(JSON, nullable=True)  # Summary statistics
    file_url = Column(Text, nullable=True)  # URL to generated file
    file_format = Column(String(10), nullable=True)  # pdf, xlsx, csv
    
    # Status
    status = Column(String(20), nullable=False, default="pending")  # pending, generating, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Access control
    generated_by = Column(UUID(as_uuid=True), nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Report(id={self.id}, name={self.name}, type={self.type})>"
    
    def is_expired(self) -> bool:
        """Check if report has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_accessible_by(self, user_id: str) -> bool:
        """Check if report is accessible by user."""
        if self.is_public:
            return True
        return str(self.generated_by) == user_id


class Alert(Base):
    """Alert model for system alerts and notifications."""
    
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Alert identification
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)  # system, business, security
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    
    # Alert details
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String(100), nullable=True)
    
    # Alert data
    metric_name = Column(String(255), nullable=True)
    threshold_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    metadata = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, default="active")  # active, resolved, suppressed
    is_acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_by = Column(UUID(as_uuid=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    resolved_by = Column(UUID(as_uuid=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timing
    triggered_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    trigger_count = Column(Integer, default=1, nullable=False)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Alert(id={self.id}, name={self.name}, severity={self.severity})>"
    
    def is_active(self) -> bool:
        """Check if alert is active."""
        return self.status == "active"
    
    def is_critical(self) -> bool:
        """Check if alert is critical."""
        return self.severity == "critical"
    
    def acknowledge(self, admin_id: str):
        """Acknowledge the alert."""
        self.is_acknowledged = True
        self.acknowledged_by = admin_id
        self.acknowledged_at = datetime.utcnow()
    
    def resolve(self, admin_id: str, notes: str = None):
        """Resolve the alert."""
        self.status = "resolved"
        self.resolved_by = admin_id
        self.resolved_at = datetime.utcnow()
        if notes:
            self.resolution_notes = notes
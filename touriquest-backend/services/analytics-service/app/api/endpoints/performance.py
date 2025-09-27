"""
Performance Analytics API Endpoints

Provides system performance metrics including API latency, error rates,
uptime monitoring, database query performance, and Prometheus integration.
"""

from datetime import date, timedelta, datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, extract, text
import logging
import psutil
import time
from decimal import Decimal

from app.core.database import get_analytics_db, get_warehouse_db
from app.services.analytics_service import AnalyticsService
from app.models.analytics_models import DataGranularity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["performance-analytics"])


@router.get("/performance")
async def get_performance_analytics(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=90),
    service: Optional[str] = Query(None, description="Filter by specific service"),
    endpoint: Optional[str] = Query(None, description="Filter by specific API endpoint"),
    severity: Optional[str] = Query(None, description="Filter by error severity (low/medium/high/critical)"),
    include_prometheus: bool = Query(True, description="Include Prometheus metrics format"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive system performance analytics
    
    Returns JSON with:
    - api_performance: API latency, throughput, and error metrics
    - system_health: CPU, memory, disk, network utilization
    - database_performance: Query performance and connection metrics
    - error_analysis: Error rates, patterns, and trending
    - uptime_monitoring: Service availability and downtime analysis
    - prometheus_metrics: Metrics in Prometheus format (if requested)
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
        }
        
        if service:
            params['service'] = service
        if endpoint:
            params['endpoint'] = endpoint
        if severity:
            params['severity'] = severity
        
        # API Performance metrics
        api_performance_query = text("""
            WITH api_stats AS (
                SELECT 
                    a.service_name,
                    a.endpoint_path,
                    a.http_method,
                    a.status_code_category,
                    COUNT(*) as request_count,
                    AVG(a.response_time_ms) as avg_response_time,
                    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY a.response_time_ms) as p50_response_time,
                    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY a.response_time_ms) as p90_response_time,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY a.response_time_ms) as p95_response_time,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY a.response_time_ms) as p99_response_time,
                    MAX(a.response_time_ms) as max_response_time,
                    MIN(a.response_time_ms) as min_response_time,
                    COUNT(CASE WHEN a.status_code >= 400 THEN 1 END) as error_count,
                    COUNT(CASE WHEN a.status_code >= 500 THEN 1 END) as server_error_count,
                    AVG(a.request_size_bytes) as avg_request_size,
                    AVG(a.response_size_bytes) as avg_response_size,
                    SUM(a.cpu_usage_percent) / COUNT(*) as avg_cpu_usage,
                    SUM(a.memory_usage_mb) / COUNT(*) as avg_memory_usage
                FROM api_request_logs a
                WHERE a.request_timestamp::date BETWEEN :start_date AND :end_date
                """ + (f" AND a.service_name = :service" if service else "") + """
                """ + (f" AND a.endpoint_path = :endpoint" if endpoint else "") + """
                GROUP BY a.service_name, a.endpoint_path, a.http_method, a.status_code_category
            )
            SELECT 
                *,
                CASE 
                    WHEN request_count > 0 
                    THEN (error_count::FLOAT / request_count::FLOAT) * 100 
                    ELSE 0 
                END as error_rate,
                CASE 
                    WHEN request_count > 0 
                    THEN (server_error_count::FLOAT / request_count::FLOAT) * 100 
                    ELSE 0 
                END as server_error_rate,
                (request_count::FLOAT / """ + str(days) + """) as avg_requests_per_day
            FROM api_stats
            ORDER BY request_count DESC
        """)
        
        api_result = await warehouse_db.execute(api_performance_query, params)
        api_data = api_result.fetchall()
        
        # System health metrics (current + historical)
        system_health_query = text("""
            SELECT 
                s.service_name,
                s.instance_id,
                s.metric_timestamp,
                s.cpu_percent,
                s.memory_percent,
                s.memory_used_gb,
                s.memory_available_gb,
                s.disk_usage_percent,
                s.disk_free_gb,
                s.network_bytes_sent,
                s.network_bytes_received,
                s.active_connections,
                s.load_average_1m,
                s.load_average_5m,
                s.load_average_15m
            FROM system_health_metrics s
            WHERE s.metric_timestamp::date BETWEEN :start_date AND :end_date
            """ + (f" AND s.service_name = :service" if service else "") + """
            ORDER BY s.metric_timestamp DESC
            LIMIT 1000
        """)
        
        system_result = await warehouse_db.execute(system_health_query, params)
        system_data = system_result.fetchall()
        
        # Database performance metrics
        db_performance_query = text("""
            WITH db_stats AS (
                SELECT 
                    d.database_name,
                    d.query_type,
                    d.table_name,
                    COUNT(*) as query_count,
                    AVG(d.execution_time_ms) as avg_execution_time,
                    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY d.execution_time_ms) as p90_execution_time,
                    MAX(d.execution_time_ms) as max_execution_time,
                    COUNT(CASE WHEN d.execution_time_ms > 1000 THEN 1 END) as slow_queries,
                    COUNT(CASE WHEN d.query_success = FALSE THEN 1 END) as failed_queries,
                    AVG(d.rows_affected) as avg_rows_affected,
                    SUM(d.io_reads) as total_io_reads,
                    SUM(d.io_writes) as total_io_writes,
                    AVG(d.connection_pool_active) as avg_active_connections,
                    AVG(d.connection_pool_idle) as avg_idle_connections
                FROM database_query_logs d
                WHERE d.query_timestamp::date BETWEEN :start_date AND :end_date
                GROUP BY d.database_name, d.query_type, d.table_name
            )
            SELECT 
                *,
                CASE 
                    WHEN query_count > 0 
                    THEN (slow_queries::FLOAT / query_count::FLOAT) * 100 
                    ELSE 0 
                END as slow_query_rate,
                CASE 
                    WHEN query_count > 0 
                    THEN (failed_queries::FLOAT / query_count::FLOAT) * 100 
                    ELSE 0 
                END as failure_rate
            FROM db_stats
            ORDER BY query_count DESC
        """)
        
        db_result = await warehouse_db.execute(db_performance_query, params)
        db_data = db_result.fetchall()
        
        # Error analysis
        error_analysis_query = text("""
            WITH error_trends AS (
                SELECT 
                    e.service_name,
                    e.error_type,
                    e.error_severity,
                    e.error_category,
                    DATE(e.error_timestamp) as error_date,
                    COUNT(*) as error_count,
                    COUNT(DISTINCT e.user_id) as affected_users,
                    COUNT(DISTINCT e.session_id) as affected_sessions,
                    STRING_AGG(DISTINCT e.error_message, ' | ' ORDER BY e.error_message) as sample_messages
                FROM error_logs e
                WHERE e.error_timestamp::date BETWEEN :start_date AND :end_date
                """ + (f" AND e.service_name = :service" if service else "") + """
                """ + (f" AND e.error_severity = :severity" if severity else "") + """
                GROUP BY e.service_name, e.error_type, e.error_severity, e.error_category, DATE(e.error_timestamp)
            )
            SELECT 
                service_name,
                error_type,
                error_severity,
                error_category,
                SUM(error_count) as total_errors,
                AVG(error_count) as avg_daily_errors,
                SUM(affected_users) as total_affected_users,
                SUM(affected_sessions) as total_affected_sessions,
                MIN(error_date) as first_occurrence,
                MAX(error_date) as last_occurrence,
                sample_messages
            FROM error_trends
            GROUP BY service_name, error_type, error_severity, error_category, sample_messages
            ORDER BY total_errors DESC
        """)
        
        error_result = await warehouse_db.execute(error_analysis_query, params)
        error_data = error_result.fetchall()
        
        # Uptime monitoring
        uptime_monitoring_query = text("""
            WITH service_availability AS (
                SELECT 
                    u.service_name,
                    u.endpoint_url,
                    u.check_type,
                    DATE(u.check_timestamp) as check_date,
                    COUNT(*) as total_checks,
                    COUNT(CASE WHEN u.status = 'UP' THEN 1 END) as successful_checks,
                    COUNT(CASE WHEN u.status = 'DOWN' THEN 1 END) as failed_checks,
                    AVG(u.response_time_ms) as avg_response_time,
                    MAX(CASE WHEN u.status = 'DOWN' THEN u.check_timestamp END) as last_downtime
                FROM uptime_checks u
                WHERE u.check_timestamp::date BETWEEN :start_date AND :end_date
                """ + (f" AND u.service_name = :service" if service else "") + """
                GROUP BY u.service_name, u.endpoint_url, u.check_type, DATE(u.check_timestamp)
            )
            SELECT 
                service_name,
                endpoint_url,
                check_type,
                SUM(total_checks) as total_checks,
                SUM(successful_checks) as total_successful_checks,
                SUM(failed_checks) as total_failed_checks,
                CASE 
                    WHEN SUM(total_checks) > 0 
                    THEN (SUM(successful_checks)::FLOAT / SUM(total_checks)::FLOAT) * 100 
                    ELSE 0 
                END as uptime_percentage,
                AVG(avg_response_time) as avg_response_time,
                MAX(last_downtime) as last_downtime_timestamp
            FROM service_availability
            GROUP BY service_name, endpoint_url, check_type
            ORDER BY uptime_percentage ASC
        """)
        
        uptime_result = await warehouse_db.execute(uptime_monitoring_query, params)
        uptime_data = uptime_result.fetchall()
        
        # Get current system metrics using psutil
        current_system_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                "percent_used": psutil.virtual_memory().percent
            },
            "disk": {
                "total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
                "free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
                "percent_used": psutil.disk_usage('/').percent
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_received": psutil.net_io_counters().bytes_recv
            },
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        }
        
        # Format API performance data
        api_performance = []
        for row in api_data:
            api_performance.append({
                "service_info": {
                    "service_name": row.service_name,
                    "endpoint_path": row.endpoint_path,
                    "http_method": row.http_method,
                    "status_category": row.status_code_category
                },
                "throughput_metrics": {
                    "total_requests": int(row.request_count or 0),
                    "avg_requests_per_day": round(float(row.avg_requests_per_day or 0), 2),
                    "error_count": int(row.error_count or 0),
                    "error_rate": round(float(row.error_rate or 0), 2),
                    "server_error_rate": round(float(row.server_error_rate or 0), 2)
                },
                "latency_metrics": {
                    "avg_response_time_ms": round(float(row.avg_response_time or 0), 2),
                    "p50_response_time_ms": round(float(row.p50_response_time or 0), 2),
                    "p90_response_time_ms": round(float(row.p90_response_time or 0), 2),
                    "p95_response_time_ms": round(float(row.p95_response_time or 0), 2),
                    "p99_response_time_ms": round(float(row.p99_response_time or 0), 2),
                    "max_response_time_ms": round(float(row.max_response_time or 0), 2),
                    "min_response_time_ms": round(float(row.min_response_time or 0), 2)
                },
                "resource_metrics": {
                    "avg_request_size_bytes": round(float(row.avg_request_size or 0), 2),
                    "avg_response_size_bytes": round(float(row.avg_response_size or 0), 2),
                    "avg_cpu_usage_percent": round(float(row.avg_cpu_usage or 0), 2),
                    "avg_memory_usage_mb": round(float(row.avg_memory_usage or 0), 2)
                }
            })
        
        # Format system health data (aggregate historical data)
        system_health_summary = {}
        if system_data:
            # Group by service and calculate averages
            for row in system_data:
                service_key = f"{row.service_name}_{row.instance_id}"
                if service_key not in system_health_summary:
                    system_health_summary[service_key] = {
                        "service_name": row.service_name,
                        "instance_id": row.instance_id,
                        "metrics": []
                    }
                
                system_health_summary[service_key]["metrics"].append({
                    "timestamp": row.metric_timestamp.isoformat(),
                    "cpu_percent": float(row.cpu_percent or 0),
                    "memory_percent": float(row.memory_percent or 0),
                    "memory_used_gb": float(row.memory_used_gb or 0),
                    "disk_usage_percent": float(row.disk_usage_percent or 0),
                    "active_connections": int(row.active_connections or 0),
                    "load_average_1m": float(row.load_average_1m or 0)
                })
        
        system_health = list(system_health_summary.values())
        
        # Format database performance data
        database_performance = []
        for row in db_data:
            database_performance.append({
                "database_info": {
                    "database_name": row.database_name,
                    "query_type": row.query_type,
                    "table_name": row.table_name
                },
                "query_metrics": {
                    "total_queries": int(row.query_count or 0),
                    "avg_execution_time_ms": round(float(row.avg_execution_time or 0), 2),
                    "p90_execution_time_ms": round(float(row.p90_execution_time or 0), 2),
                    "max_execution_time_ms": round(float(row.max_execution_time or 0), 2),
                    "slow_query_rate": round(float(row.slow_query_rate or 0), 2),
                    "failure_rate": round(float(row.failure_rate or 0), 2)
                },
                "resource_metrics": {
                    "avg_rows_affected": float(row.avg_rows_affected or 0),
                    "total_io_reads": int(row.total_io_reads or 0),
                    "total_io_writes": int(row.total_io_writes or 0),
                    "avg_active_connections": float(row.avg_active_connections or 0),
                    "avg_idle_connections": float(row.avg_idle_connections or 0)
                }
            })
        
        # Format error analysis data
        error_analysis = []
        for row in error_data:
            days_between_occurrences = (
                (row.last_occurrence - row.first_occurrence).days + 1
                if row.first_occurrence and row.last_occurrence else 1
            )
            
            error_analysis.append({
                "error_info": {
                    "service_name": row.service_name,
                    "error_type": row.error_type,
                    "error_severity": row.error_severity,
                    "error_category": row.error_category
                },
                "occurrence_metrics": {
                    "total_errors": int(row.total_errors or 0),
                    "avg_daily_errors": round(float(row.avg_daily_errors or 0), 2),
                    "total_affected_users": int(row.total_affected_users or 0),
                    "total_affected_sessions": int(row.total_affected_sessions or 0)
                },
                "timeline": {
                    "first_occurrence": row.first_occurrence.isoformat() if row.first_occurrence else None,
                    "last_occurrence": row.last_occurrence.isoformat() if row.last_occurrence else None,
                    "days_active": days_between_occurrences
                },
                "sample_messages": row.sample_messages[:500] + "..." if len(row.sample_messages or "") > 500 else row.sample_messages
            })
        
        # Format uptime monitoring data
        uptime_monitoring = []
        for row in uptime_data:
            downtime_hours = (
                ((datetime.utcnow() - row.last_downtime_timestamp).total_seconds() / 3600)
                if row.last_downtime_timestamp else None
            )
            
            uptime_monitoring.append({
                "service_info": {
                    "service_name": row.service_name,
                    "endpoint_url": row.endpoint_url,
                    "check_type": row.check_type
                },
                "availability_metrics": {
                    "total_checks": int(row.total_checks or 0),
                    "successful_checks": int(row.total_successful_checks or 0),
                    "failed_checks": int(row.total_failed_checks or 0),
                    "uptime_percentage": round(float(row.uptime_percentage or 0), 3),
                    "avg_response_time_ms": round(float(row.avg_response_time or 0), 2)
                },
                "downtime_info": {
                    "last_downtime": row.last_downtime_timestamp.isoformat() if row.last_downtime_timestamp else None,
                    "hours_since_last_downtime": round(downtime_hours, 2) if downtime_hours is not None else None
                }
            })
        
        # Generate Prometheus metrics format (if requested)
        prometheus_metrics = []
        if include_prometheus:
            # API request metrics
            for api in api_performance:
                service_name = api['service_info']['service_name']
                endpoint = api['service_info']['endpoint_path']
                method = api['service_info']['http_method']
                
                prometheus_metrics.extend([
                    f'api_request_duration_seconds{{service="{service_name}",endpoint="{endpoint}",method="{method}",quantile="0.5"}} {api["latency_metrics"]["p50_response_time_ms"]/1000}',
                    f'api_request_duration_seconds{{service="{service_name}",endpoint="{endpoint}",method="{method}",quantile="0.9"}} {api["latency_metrics"]["p90_response_time_ms"]/1000}',
                    f'api_request_duration_seconds{{service="{service_name}",endpoint="{endpoint}",method="{method}",quantile="0.95"}} {api["latency_metrics"]["p95_response_time_ms"]/1000}',
                    f'api_request_total{{service="{service_name}",endpoint="{endpoint}",method="{method}"}} {api["throughput_metrics"]["total_requests"]}',
                    f'api_request_errors_total{{service="{service_name}",endpoint="{endpoint}",method="{method}"}} {api["throughput_metrics"]["error_count"]}',
                ])
            
            # System metrics
            prometheus_metrics.extend([
                f'system_cpu_usage_percent {current_system_metrics["cpu_percent"]}',
                f'system_memory_usage_percent {current_system_metrics["memory"]["percent_used"]}',
                f'system_disk_usage_percent {current_system_metrics["disk"]["percent_used"]}',
                f'system_load_average_1m {current_system_metrics["load_average"][0]}',
                f'system_load_average_5m {current_system_metrics["load_average"][1]}',
                f'system_load_average_15m {current_system_metrics["load_average"][2]}',
            ])
            
            # Database metrics
            for db in database_performance:
                db_name = db['database_info']['database_name']
                query_type = db['database_info']['query_type']
                
                prometheus_metrics.extend([
                    f'database_query_duration_seconds{{database="{db_name}",type="{query_type}"}} {db["query_metrics"]["avg_execution_time_ms"]/1000}',
                    f'database_queries_total{{database="{db_name}",type="{query_type}"}} {db["query_metrics"]["total_queries"]}',
                    f'database_slow_queries_total{{database="{db_name}",type="{query_type}"}} {int(db["query_metrics"]["total_queries"] * db["query_metrics"]["slow_query_rate"] / 100)}',
                ])
        
        # Calculate summary metrics
        total_api_requests = sum(api['throughput_metrics']['total_requests'] for api in api_performance)
        avg_error_rate = (
            sum(api['throughput_metrics']['error_rate'] for api in api_performance) / len(api_performance)
        ) if api_performance else 0
        
        avg_uptime = (
            sum(uptime['availability_metrics']['uptime_percentage'] for uptime in uptime_monitoring) / len(uptime_monitoring)
        ) if uptime_monitoring else 100
        
        total_errors = sum(error['occurrence_metrics']['total_errors'] for error in error_analysis)
        critical_errors = sum(
            error['occurrence_metrics']['total_errors'] 
            for error in error_analysis 
            if error['error_info']['error_severity'] == 'critical'
        )
        
        summary = {
            "total_api_requests": total_api_requests,
            "avg_error_rate": round(avg_error_rate, 2),
            "avg_system_uptime": round(avg_uptime, 3),
            "total_errors": total_errors,
            "critical_errors": critical_errors,
            "services_monitored": len(set(api['service_info']['service_name'] for api in api_performance)),
            "current_system_health": {
                "cpu_usage": current_system_metrics["cpu_percent"],
                "memory_usage": current_system_metrics["memory"]["percent_used"],
                "disk_usage": current_system_metrics["disk"]["percent_used"]
            }
        }
        
        return {
            "success": True,
            "data": {
                "api_performance": api_performance,
                "system_health": system_health,
                "database_performance": database_performance,
                "error_analysis": error_analysis,
                "uptime_monitoring": uptime_monitoring,
                "current_system_metrics": current_system_metrics,
                "prometheus_metrics": prometheus_metrics if include_prometheus else None,
                "summary": summary
            },
            "filters_applied": {
                "days": days,
                "service": service,
                "endpoint": endpoint,
                "severity": severity,
                "include_prometheus": include_prometheus
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in performance analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve performance analytics: {str(e)}"
        )
"""
Test Suite for Performance Analytics Endpoints

Tests system performance monitoring including API metrics, system health,
database performance, error analysis, and uptime monitoring.
"""

import pytest
import json
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api.endpoints.performance import router

client = TestClient(app)


class TestPerformanceAnalytics:
    """Test cases for performance analytics endpoints"""
    
    @pytest.fixture
    def mock_warehouse_db(self):
        """Mock warehouse database session"""
        db_mock = AsyncMock()
        
        # Mock API performance data
        api_result = AsyncMock()
        api_result.fetchall.return_value = [
            type('Row', (), {
                'service_name': 'booking-service',
                'endpoint_path': '/api/v1/bookings',
                'http_method': 'POST',
                'status_code_category': '2xx',
                'request_count': 15000,
                'avg_response_time': 125.5,
                'p50_response_time': 95.2,
                'p90_response_time': 180.4,
                'p95_response_time': 220.8,
                'p99_response_time': 380.2,
                'max_response_time': 850.0,
                'min_response_time': 15.2,
                'error_count': 150,
                'server_error_count': 25,
                'avg_request_size': 2048.5,
                'avg_response_size': 1536.8,
                'avg_cpu_usage': 45.2,
                'avg_memory_usage': 512.8,
                'error_rate': 1.0,
                'server_error_rate': 0.17,
                'avg_requests_per_day': 500.0
            })(),
            type('Row', (), {
                'service_name': 'search-service',
                'endpoint_path': '/api/v1/search',
                'http_method': 'GET',
                'status_code_category': '2xx',
                'request_count': 25000,
                'avg_response_time': 85.2,
                'p50_response_time': 65.8,
                'p90_response_time': 120.5,
                'p95_response_time': 145.2,
                'p99_response_time': 250.8,
                'max_response_time': 450.0,
                'min_response_time': 8.5,
                'error_count': 200,
                'server_error_count': 15,
                'avg_request_size': 512.2,
                'avg_response_size': 3024.6,
                'avg_cpu_usage': 35.8,
                'avg_memory_usage': 384.2,
                'error_rate': 0.8,
                'server_error_rate': 0.06,
                'avg_requests_per_day': 833.3
            })()
        ]
        
        # Mock system health data
        system_result = AsyncMock()
        system_result.fetchall.return_value = [
            type('Row', (), {
                'service_name': 'booking-service',
                'instance_id': 'booking-1',
                'metric_timestamp': date.today(),
                'cpu_percent': 45.2,
                'memory_percent': 68.5,
                'memory_used_gb': 2.8,
                'memory_available_gb': 1.3,
                'disk_usage_percent': 72.4,
                'disk_free_gb': 15.8,
                'network_bytes_sent': 1024000,
                'network_bytes_received': 2048000,
                'active_connections': 125,
                'load_average_1m': 1.25,
                'load_average_5m': 1.18,
                'load_average_15m': 1.05
            })(),
            type('Row', (), {
                'service_name': 'search-service',
                'instance_id': 'search-1',
                'metric_timestamp': date.today(),
                'cpu_percent': 32.8,
                'memory_percent': 54.2,
                'memory_used_gb': 1.8,
                'memory_available_gb': 1.5,
                'disk_usage_percent': 58.6,
                'disk_free_gb': 22.5,
                'network_bytes_sent': 512000,
                'network_bytes_received': 1536000,
                'active_connections': 85,
                'load_average_1m': 0.85,
                'load_average_5m': 0.92,
                'load_average_15m': 0.88
            })()
        ]
        
        # Mock database performance data
        db_result = AsyncMock()
        db_result.fetchall.return_value = [
            type('Row', (), {
                'database_name': 'touriquest_main',
                'query_type': 'SELECT',
                'table_name': 'bookings',
                'query_count': 8500,
                'avg_execution_time': 25.8,
                'p90_execution_time': 45.2,
                'max_execution_time': 180.5,
                'slow_queries': 85,
                'failed_queries': 12,
                'avg_rows_affected': 15.2,
                'total_io_reads': 125000,
                'total_io_writes': 45000,
                'avg_active_connections': 15.5,
                'avg_idle_connections': 8.2,
                'slow_query_rate': 1.0,
                'failure_rate': 0.14
            })(),
            type('Row', (), {
                'database_name': 'touriquest_analytics',
                'query_type': 'INSERT',
                'table_name': 'user_events',
                'query_count': 12000,
                'avg_execution_time': 15.2,
                'p90_execution_time': 28.5,
                'max_execution_time': 95.8,
                'slow_queries': 45,
                'failed_queries': 8,
                'avg_rows_affected': 1.0,
                'total_io_reads': 85000,
                'total_io_writes': 125000,
                'avg_active_connections': 12.8,
                'avg_idle_connections': 6.5,
                'slow_query_rate': 0.38,
                'failure_rate': 0.067
            })()
        ]
        
        # Mock error analysis data
        error_result = AsyncMock()
        error_result.fetchall.return_value = [
            type('Row', (), {
                'service_name': 'booking-service',
                'error_type': 'ValidationError',
                'error_severity': 'medium',
                'error_category': 'client_error',
                'total_errors': 250,
                'avg_daily_errors': 8.3,
                'total_affected_users': 180,
                'total_affected_sessions': 220,
                'first_occurrence': date(2024, 1, 1),
                'last_occurrence': date(2024, 1, 30),
                'sample_messages': 'Invalid booking date format | Missing required field: user_id'
            })(),
            type('Row', (), {
                'service_name': 'payment-service',
                'error_type': 'TimeoutError',
                'error_severity': 'high',
                'error_category': 'service_error',
                'total_errors': 85,
                'avg_daily_errors': 2.8,
                'total_affected_users': 75,
                'total_affected_sessions': 82,
                'first_occurrence': date(2024, 1, 15),
                'last_occurrence': date(2024, 1, 29),
                'sample_messages': 'Payment gateway timeout | Connection timeout after 30s'
            })()
        ]
        
        # Mock uptime monitoring data
        uptime_result = AsyncMock()
        uptime_result.fetchall.return_value = [
            type('Row', (), {
                'service_name': 'booking-service',
                'endpoint_url': 'http://booking-service:8000/health',
                'check_type': 'http',
                'total_checks': 4320,
                'total_successful_checks': 4285,
                'total_failed_checks': 35,
                'uptime_percentage': 99.19,
                'avg_response_time': 25.8,
                'last_downtime_timestamp': date(2024, 1, 25)
            })(),
            type('Row', (), {
                'service_name': 'search-service',
                'endpoint_url': 'http://search-service:8000/health',
                'check_type': 'http',
                'total_checks': 4320,
                'total_successful_checks': 4308,
                'total_failed_checks': 12,
                'uptime_percentage': 99.72,
                'avg_response_time': 18.5,
                'last_downtime_timestamp': date(2024, 1, 20)
            })()
        ]
        
        # Configure database execute method
        def mock_execute(query, params=None):
            query_str = str(query)
            if 'api_request_logs' in query_str:
                return api_result
            elif 'system_health_metrics' in query_str:
                return system_result
            elif 'database_query_logs' in query_str:
                return db_result
            elif 'error_logs' in query_str:
                return error_result
            elif 'uptime_checks' in query_str:
                return uptime_result
            else:
                mock_result = AsyncMock()
                mock_result.fetchall.return_value = []
                return mock_result
        
        db_mock.execute = AsyncMock(side_effect=mock_execute)
        return db_mock
    
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    @patch('psutil.net_io_counters')
    @patch('psutil.getloadavg')
    def test_get_performance_analytics_success(self, mock_loadavg, mock_net, mock_disk, 
                                             mock_memory, mock_cpu, mock_warehouse_db):
        """Test successful performance analytics retrieval"""
        # Mock psutil functions
        mock_cpu.return_value = 35.5
        mock_memory.return_value = type('Memory', (), {
            'total': 8589934592,  # 8GB
            'available': 4294967296,  # 4GB
            'percent': 50.0
        })()
        mock_disk.return_value = type('Disk', (), {
            'total': 107374182400,  # 100GB
            'free': 53687091200,  # 50GB
            'percent': 50.0
        })()
        mock_net.return_value = type('Network', (), {
            'bytes_sent': 1000000,
            'bytes_recv': 2000000
        })()
        mock_loadavg.return_value = [0.75, 0.85, 0.90]
        
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/performance?days=7")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert "data" in data
            assert "api_performance" in data["data"]
            assert "system_health" in data["data"]
            assert "database_performance" in data["data"]
            assert "error_analysis" in data["data"]
            assert "uptime_monitoring" in data["data"]
            assert "current_system_metrics" in data["data"]
            assert "summary" in data["data"]
    
    def test_get_performance_analytics_api_metrics(self, mock_warehouse_db):
        """Test API performance metrics in detail"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                api_performance = data["data"]["api_performance"]
                                assert len(api_performance) > 0
                                
                                api_metric = api_performance[0]
                                assert "service_info" in api_metric
                                assert "throughput_metrics" in api_metric
                                assert "latency_metrics" in api_metric
                                assert "resource_metrics" in api_metric
                                
                                # Validate latency percentiles
                                latency = api_metric["latency_metrics"]
                                assert latency["p50_response_time_ms"] > 0
                                assert latency["p90_response_time_ms"] >= latency["p50_response_time_ms"]
                                assert latency["p95_response_time_ms"] >= latency["p90_response_time_ms"]
                                assert latency["p99_response_time_ms"] >= latency["p95_response_time_ms"]
    
    def test_get_performance_analytics_with_filters(self, mock_warehouse_db):
        """Test performance analytics with service and endpoint filters"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get(
                                    "/analytics/performance?service=booking-service&endpoint=/api/v1/bookings&severity=high"
                                )
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                filters_applied = data["filters_applied"]
                                assert filters_applied["service"] == "booking-service"
                                assert filters_applied["endpoint"] == "/api/v1/bookings"
                                assert filters_applied["severity"] == "high"
    
    def test_get_performance_analytics_prometheus_metrics(self, mock_warehouse_db):
        """Test Prometheus metrics generation"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance?include_prometheus=true")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                assert "prometheus_metrics" in data["data"]
                                prometheus_metrics = data["data"]["prometheus_metrics"]
                                assert isinstance(prometheus_metrics, list)
                                assert len(prometheus_metrics) > 0
                                
                                # Check for expected Prometheus metric formats
                                metric_found = False
                                for metric in prometheus_metrics:
                                    if 'api_request_duration_seconds' in metric:
                                        metric_found = True
                                        break
                                assert metric_found
    
    def test_get_performance_analytics_system_health(self, mock_warehouse_db):
        """Test system health metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                # Check current system metrics
                                current_metrics = data["data"]["current_system_metrics"]
                                assert "cpu_percent" in current_metrics
                                assert "memory" in current_metrics
                                assert "disk" in current_metrics
                                assert "network" in current_metrics
                                
                                # Check historical system health
                                system_health = data["data"]["system_health"]
                                assert isinstance(system_health, list)
    
    def test_get_performance_analytics_database_metrics(self, mock_warehouse_db):
        """Test database performance metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                db_performance = data["data"]["database_performance"]
                                assert len(db_performance) > 0
                                
                                db_metric = db_performance[0]
                                assert "database_info" in db_metric
                                assert "query_metrics" in db_metric
                                assert "resource_metrics" in db_metric
                                
                                # Validate query metrics
                                query_metrics = db_metric["query_metrics"]
                                assert query_metrics["total_queries"] > 0
                                assert 0 <= query_metrics["slow_query_rate"] <= 100
                                assert 0 <= query_metrics["failure_rate"] <= 100
    
    def test_get_performance_analytics_error_analysis(self, mock_warehouse_db):
        """Test error analysis metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                error_analysis = data["data"]["error_analysis"]
                                assert len(error_analysis) > 0
                                
                                error_metric = error_analysis[0]
                                assert "error_info" in error_metric
                                assert "occurrence_metrics" in error_metric
                                assert "timeline" in error_metric
                                
                                # Check severity levels
                                assert error_metric["error_info"]["error_severity"] in ["low", "medium", "high", "critical"]
    
    def test_get_performance_analytics_uptime_monitoring(self, mock_warehouse_db):
        """Test uptime monitoring metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                uptime_monitoring = data["data"]["uptime_monitoring"]
                                assert len(uptime_monitoring) > 0
                                
                                uptime_metric = uptime_monitoring[0]
                                assert "service_info" in uptime_metric
                                assert "availability_metrics" in uptime_metric
                                assert "downtime_info" in uptime_metric
                                
                                # Check uptime percentage
                                availability = uptime_metric["availability_metrics"]
                                assert 0 <= availability["uptime_percentage"] <= 100
    
    def test_get_performance_analytics_summary(self, mock_warehouse_db):
        """Test performance summary metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            with patch('psutil.cpu_percent', return_value=35.5):
                with patch('psutil.virtual_memory') as mock_mem:
                    mock_mem.return_value = type('Memory', (), {'total': 8589934592, 'available': 4294967296, 'percent': 50.0})()
                    with patch('psutil.disk_usage') as mock_disk:
                        mock_disk.return_value = type('Disk', (), {'total': 107374182400, 'free': 53687091200, 'percent': 50.0})()
                        with patch('psutil.net_io_counters') as mock_net:
                            mock_net.return_value = type('Network', (), {'bytes_sent': 1000000, 'bytes_recv': 2000000})()
                            with patch('psutil.getloadavg', return_value=[0.75, 0.85, 0.90]):
                                response = client.get("/analytics/performance")
                                
                                assert response.status_code == 200
                                data = response.json()
                                
                                summary = data["data"]["summary"]
                                assert "total_api_requests" in summary
                                assert "avg_error_rate" in summary
                                assert "avg_system_uptime" in summary
                                assert "services_monitored" in summary
                                assert "current_system_health" in summary
                                
                                # Check current system health
                                current_health = summary["current_system_health"]
                                assert "cpu_usage" in current_health
                                assert "memory_usage" in current_health
                                assert "disk_usage" in current_health
    
    def test_get_performance_analytics_error_handling(self):
        """Test error handling for database failures"""
        with patch('app.core.database.get_warehouse_db', side_effect=Exception("Database error")):
            response = client.get("/analytics/performance")
            
            assert response.status_code == 500
            data = response.json()
            assert "Failed to retrieve performance analytics" in data["detail"]
    
    def test_get_performance_analytics_invalid_parameters(self):
        """Test handling of invalid parameters"""
        response = client.get("/analytics/performance?days=0")
        assert response.status_code == 422  # Validation error
        
        response = client.get("/analytics/performance?days=100")  
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__])
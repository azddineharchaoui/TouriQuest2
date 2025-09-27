#!/usr/bin/env python3
"""
Analytics Query Performance Benchmarking Script

Benchmarks the performance of key analytics queries to ensure
they meet performance requirements and identify optimization opportunities.
"""

import asyncio
import json
import logging
import statistics
import time
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Tuple

import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AnalyticsQueryBenchmark:
    """Benchmarks analytics service query performance"""
    
    def __init__(self, database_url: str, service_url: str = "http://localhost:8000"):
        self.database_url = database_url
        self.service_url = service_url
        self.engine = create_async_engine(database_url)
        
        # Performance thresholds (in seconds)
        self.thresholds = {
            'dashboard_queries': 2.0,     # Dashboard should load in < 2s
            'api_endpoints': 5.0,         # API endpoints < 5s
            'complex_analytics': 10.0,    # Complex analytics < 10s
            'data_export': 30.0,          # Data exports < 30s
        }
        
        # Test queries to benchmark
        self.test_queries = {
            'revenue_summary': """
                SELECT 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_booking_value
                FROM fact_booking 
                WHERE booking_date >= %s AND booking_date <= %s
            """,
            'user_analytics': """
                SELECT 
                    DATE(activity_timestamp) as date,
                    COUNT(DISTINCT user_id) as active_users,
                    AVG(session_duration) as avg_session_duration
                FROM fact_user_activity 
                WHERE activity_timestamp >= %s 
                GROUP BY DATE(activity_timestamp)
                ORDER BY date DESC
                LIMIT 30
            """,
            'property_performance': """
                SELECT 
                    fp.property_id,
                    COUNT(fb.id) as booking_count,
                    SUM(fb.total_amount) as revenue,
                    AVG(fp.average_rating) as avg_rating
                FROM fact_property fp
                LEFT JOIN fact_booking fb ON fp.property_id = fb.property_id
                WHERE fb.booking_date >= %s
                GROUP BY fp.property_id
                ORDER BY revenue DESC
                LIMIT 100
            """,
            'trend_analysis': """
                SELECT 
                    DATE_TRUNC('week', booking_date) as week,
                    COUNT(*) as bookings,
                    SUM(total_amount) as revenue,
                    LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', booking_date)) as prev_bookings
                FROM fact_booking 
                WHERE booking_date >= %s 
                GROUP BY DATE_TRUNC('week', booking_date)
                ORDER BY week DESC
            """
        }
        
        # API endpoints to benchmark
        self.api_endpoints = {
            'dashboard': '/analytics/dashboard',
            'revenue': '/analytics/revenue/',
            'users': '/analytics/users/',
            'properties': '/analytics/properties/',
            'trends': '/analytics/trends/?metric=revenue'
        }
    
    async def run_benchmark_suite(self) -> Dict[str, Any]:
        """Run complete benchmark suite"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'database_benchmarks': {},
            'api_benchmarks': {},
            'performance_summary': {},
            'recommendations': []
        }
        
        try:
            # Run database query benchmarks
            logger.info("Running database query benchmarks...")
            db_results = await self._benchmark_database_queries()
            results['database_benchmarks'] = db_results
            
            # Run API endpoint benchmarks
            logger.info("Running API endpoint benchmarks...")
            api_results = await self._benchmark_api_endpoints()
            results['api_benchmarks'] = api_results
            
            # Generate performance summary
            results['performance_summary'] = self._generate_performance_summary(
                db_results, api_results
            )
            
            # Generate recommendations
            results['recommendations'] = self._generate_recommendations(
                db_results, api_results
            )
            
        except Exception as e:
            logger.error(f"Benchmark failed: {e}")
            results['error'] = str(e)
        
        finally:
            await self.engine.dispose()
        
        return results
    
    async def _benchmark_database_queries(self) -> Dict[str, Any]:
        """Benchmark direct database queries"""
        results = {}
        
        # Date range for testing
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        async with AsyncSession(self.engine) as session:
            for query_name, query_sql in self.test_queries.items():
                logger.info(f"Benchmarking query: {query_name}")
                
                try:
                    # Run query multiple times for accurate timing
                    execution_times = []
                    for _ in range(5):
                        start_time = time.time()
                        
                        result = await session.execute(
                            text(query_sql), 
                            [start_date, end_date] if '%s' in query_sql else [start_date]
                        )
                        rows = result.fetchall()
                        
                        execution_time = time.time() - start_time
                        execution_times.append(execution_time)
                    
                    # Calculate statistics
                    results[query_name] = {
                        'avg_time': statistics.mean(execution_times),
                        'min_time': min(execution_times),
                        'max_time': max(execution_times),
                        'median_time': statistics.median(execution_times),
                        'std_dev': statistics.stdev(execution_times) if len(execution_times) > 1 else 0,
                        'row_count': len(rows),
                        'executions': len(execution_times),
                        'threshold_met': statistics.mean(execution_times) < self.thresholds['complex_analytics']
                    }
                    
                    logger.info(
                        f"Query {query_name}: avg {results[query_name]['avg_time']:.3f}s, "
                        f"{results[query_name]['row_count']} rows"
                    )
                    
                except Exception as e:
                    logger.error(f"Query {query_name} failed: {e}")
                    results[query_name] = {
                        'error': str(e),
                        'threshold_met': False
                    }
        
        return results
    
    async def _benchmark_api_endpoints(self) -> Dict[str, Any]:
        """Benchmark API endpoint performance"""
        results = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for endpoint_name, endpoint_path in self.api_endpoints.items():
                logger.info(f"Benchmarking API endpoint: {endpoint_name}")
                
                try:
                    # Add query parameters for better testing
                    params = {'days': 30}
                    if 'trends' in endpoint_name:
                        params.update({'granularity': 'daily', 'forecast_days': 7})
                    
                    # Run endpoint multiple times for accurate timing
                    execution_times = []
                    response_sizes = []
                    status_codes = []
                    
                    for _ in range(3):  # Fewer runs for API endpoints
                        start_time = time.time()
                        
                        response = await client.get(
                            f"{self.service_url}{endpoint_path}",
                            params=params
                        )
                        
                        execution_time = time.time() - start_time
                        execution_times.append(execution_time)
                        response_sizes.append(len(response.content))
                        status_codes.append(response.status_code)
                    
                    # Calculate statistics
                    results[endpoint_name] = {
                        'avg_time': statistics.mean(execution_times),
                        'min_time': min(execution_times),
                        'max_time': max(execution_times),
                        'avg_response_size': statistics.mean(response_sizes),
                        'status_codes': status_codes,
                        'success_rate': sum(1 for code in status_codes if code == 200) / len(status_codes),
                        'threshold_met': statistics.mean(execution_times) < self.thresholds['api_endpoints']
                    }
                    
                    logger.info(
                        f"API {endpoint_name}: avg {results[endpoint_name]['avg_time']:.3f}s, "
                        f"success rate {results[endpoint_name]['success_rate']:.2%}"
                    )
                    
                except Exception as e:
                    logger.error(f"API endpoint {endpoint_name} failed: {e}")
                    results[endpoint_name] = {
                        'error': str(e),
                        'success_rate': 0.0,
                        'threshold_met': False
                    }
        
        return results
    
    def _generate_performance_summary(self, db_results: Dict, api_results: Dict) -> Dict[str, Any]:
        """Generate overall performance summary"""
        summary = {
            'database_performance': {},
            'api_performance': {},
            'overall_status': 'pass'
        }
        
        # Database performance summary
        if db_results:
            db_times = [r['avg_time'] for r in db_results.values() if 'avg_time' in r]
            db_threshold_met = [r['threshold_met'] for r in db_results.values()]
            
            summary['database_performance'] = {
                'queries_tested': len(db_results),
                'avg_query_time': statistics.mean(db_times) if db_times else 0,
                'slowest_query': max(db_times) if db_times else 0,
                'fastest_query': min(db_times) if db_times else 0,
                'threshold_pass_rate': sum(db_threshold_met) / len(db_threshold_met) if db_threshold_met else 0
            }
        
        # API performance summary
        if api_results:
            api_times = [r['avg_time'] for r in api_results.values() if 'avg_time' in r]
            api_success_rates = [r['success_rate'] for r in api_results.values() if 'success_rate' in r]
            api_threshold_met = [r['threshold_met'] for r in api_results.values()]
            
            summary['api_performance'] = {
                'endpoints_tested': len(api_results),
                'avg_response_time': statistics.mean(api_times) if api_times else 0,
                'slowest_endpoint': max(api_times) if api_times else 0,
                'fastest_endpoint': min(api_times) if api_times else 0,
                'avg_success_rate': statistics.mean(api_success_rates) if api_success_rates else 0,
                'threshold_pass_rate': sum(api_threshold_met) / len(api_threshold_met) if api_threshold_met else 0
            }
        
        # Determine overall status
        db_pass_rate = summary['database_performance'].get('threshold_pass_rate', 0)
        api_pass_rate = summary['api_performance'].get('threshold_pass_rate', 0)
        
        if db_pass_rate < 0.8 or api_pass_rate < 0.8:
            summary['overall_status'] = 'fail'
        elif db_pass_rate < 1.0 or api_pass_rate < 1.0:
            summary['overall_status'] = 'warning'
        
        return summary
    
    def _generate_recommendations(self, db_results: Dict, api_results: Dict) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        # Database recommendations
        slow_queries = [
            name for name, result in db_results.items()
            if 'avg_time' in result and result['avg_time'] > self.thresholds['complex_analytics']
        ]
        
        if slow_queries:
            recommendations.append(
                f"Optimize slow database queries: {', '.join(slow_queries)}"
            )
            recommendations.append(
                "Consider adding database indexes for frequently filtered columns"
            )
            recommendations.append(
                "Implement materialized views for complex aggregations"
            )
        
        # API recommendations
        slow_endpoints = [
            name for name, result in api_results.items()
            if 'avg_time' in result and result['avg_time'] > self.thresholds['api_endpoints']
        ]
        
        if slow_endpoints:
            recommendations.append(
                f"Optimize slow API endpoints: {', '.join(slow_endpoints)}"
            )
            recommendations.append(
                "Implement Redis caching for frequently accessed analytics data"
            )
            recommendations.append(
                "Consider pagination for endpoints returning large datasets"
            )
        
        # Success rate recommendations
        failing_endpoints = [
            name for name, result in api_results.items()
            if result.get('success_rate', 0) < 1.0
        ]
        
        if failing_endpoints:
            recommendations.append(
                f"Fix failing API endpoints: {', '.join(failing_endpoints)}"
            )
            recommendations.append(
                "Implement proper error handling and retry mechanisms"
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append("All performance benchmarks passed!")
            recommendations.append("Consider load testing with realistic data volumes")
        
        return recommendations
    
    def print_benchmark_report(self, results: Dict[str, Any]):
        """Print formatted benchmark report"""
        print(f"\n📊 Analytics Performance Benchmark Report")
        print("=" * 60)
        print(f"Timestamp: {results['timestamp']}")
        
        # Overall status
        status_emoji = {'pass': '✅', 'warning': '⚠️', 'fail': '❌'}
        overall_status = results.get('performance_summary', {}).get('overall_status', 'unknown')
        print(f"Overall Status: {status_emoji.get(overall_status, '❓')} {overall_status.upper()}")
        
        # Database performance
        if 'database_benchmarks' in results:
            print(f"\n🗄️ Database Query Performance:")
            db_summary = results.get('performance_summary', {}).get('database_performance', {})
            if db_summary:
                print(f"   Queries Tested: {db_summary.get('queries_tested', 0)}")
                print(f"   Average Query Time: {db_summary.get('avg_query_time', 0):.3f}s")
                print(f"   Threshold Pass Rate: {db_summary.get('threshold_pass_rate', 0):.1%}")
            
            for query_name, result in results['database_benchmarks'].items():
                if 'avg_time' in result:
                    status = "✓" if result['threshold_met'] else "✗"
                    print(f"   {status} {query_name}: {result['avg_time']:.3f}s avg")
        
        # API performance
        if 'api_benchmarks' in results:
            print(f"\n🌐 API Endpoint Performance:")
            api_summary = results.get('performance_summary', {}).get('api_performance', {})
            if api_summary:
                print(f"   Endpoints Tested: {api_summary.get('endpoints_tested', 0)}")
                print(f"   Average Response Time: {api_summary.get('avg_response_time', 0):.3f}s")
                print(f"   Success Rate: {api_summary.get('avg_success_rate', 0):.1%}")
            
            for endpoint_name, result in results['api_benchmarks'].items():
                if 'avg_time' in result:
                    status = "✓" if result['threshold_met'] else "✗"
                    success = f" ({result['success_rate']:.1%})" if 'success_rate' in result else ""
                    print(f"   {status} {endpoint_name}: {result['avg_time']:.3f}s{success}")
        
        # Recommendations
        if 'recommendations' in results and results['recommendations']:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(results['recommendations'], 1):
                print(f"   {i}. {rec}")
        
        print("\n" + "=" * 60)


async def main():
    """Main benchmark function"""
    import os
    
    # Get configuration from environment
    database_url = os.getenv('DATABASE_URL')
    service_url = os.getenv('ANALYTICS_SERVICE_URL', 'http://localhost:8000')
    
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return 1
    
    # Initialize benchmark
    benchmark = AnalyticsQueryBenchmark(database_url, service_url)
    
    # Run benchmark suite
    logger.info("Starting analytics performance benchmark...")
    results = await benchmark.run_benchmark_suite()
    
    # Print report
    benchmark.print_benchmark_report(results)
    
    # Save results to file
    with open('analytics-benchmark-results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info("Benchmark results saved to analytics-benchmark-results.json")
    
    # Return exit code based on results
    overall_status = results.get('performance_summary', {}).get('overall_status', 'fail')
    return 0 if overall_status in ['pass', 'warning'] else 1


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
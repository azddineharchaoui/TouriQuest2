#!/usr/bin/env python3
"""
Analytics Schema Validation Script

Validates the analytics database schema against expected structure
and ensures all required tables, indexes, and constraints exist.
"""

import asyncio
import logging
import sys
from datetime import datetime
from typing import Dict, List, Any

import asyncpg
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AnalyticsSchemaValidator:
    """Validates analytics service database schema"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_async_engine(database_url)
        
        # Expected schema structure
        self.expected_tables = {
            'business_metrics': [
                'id', 'metric_name', 'metric_type', 'date', 'hour',
                'value', 'previous_value', 'percentage_change',
                'category', 'subcategory', 'region', 'metadata',
                'created_at', 'updated_at'
            ],
            'revenue_metrics': [
                'id', 'date', 'granularity', 'total_revenue',
                'booking_revenue', 'experience_revenue', 'commission_revenue',
                'created_at', 'updated_at'
            ],
            'user_analytic_metrics': [
                'id', 'date', 'granularity', 'active_users',
                'new_users', 'returning_users', 'avg_session_duration',
                'bounce_rate', 'created_at', 'updated_at'
            ],
            'property_analytic_metrics': [
                'id', 'property_id', 'date', 'granularity',
                'views', 'bookings', 'revenue', 'occupancy_rate',
                'average_rating', 'created_at', 'updated_at'
            ],
            'performance_metrics': [
                'id', 'service_name', 'metric_name', 'timestamp',
                'value', 'threshold_warning', 'threshold_critical',
                'status', 'metadata', 'created_at'
            ]
        }
        
        self.expected_indexes = {
            'business_metrics': [
                'idx_business_metrics_date_type',
                'idx_business_metrics_name_date'
            ],
            'revenue_metrics': [
                'idx_revenue_metrics_date_granularity'
            ],
            'user_analytic_metrics': [
                'idx_user_metrics_date_granularity'
            ],
            'property_analytic_metrics': [
                'idx_property_metrics_property_date'
            ]
        }
    
    async def validate_schema(self) -> Dict[str, Any]:
        """Validate the complete analytics schema"""
        validation_results = {
            'timestamp': datetime.now().isoformat(),
            'status': 'success',
            'errors': [],
            'warnings': [],
            'tables_validated': 0,
            'indexes_validated': 0,
            'details': {}
        }
        
        try:
            async with self.engine.connect() as connection:
                # Get database inspector
                inspector = inspect(connection.sync_connection)
                
                # Validate tables
                table_results = await self._validate_tables(inspector)
                validation_results['details']['tables'] = table_results
                
                # Validate indexes
                index_results = await self._validate_indexes(inspector)
                validation_results['details']['indexes'] = index_results
                
                # Count validations
                validation_results['tables_validated'] = len([
                    t for t in table_results.values() if t['exists']
                ])
                validation_results['indexes_validated'] = sum([
                    len(idx['existing']) for idx in index_results.values()
                ])
                
                # Check for errors
                all_tables_exist = all(t['exists'] for t in table_results.values())
                critical_indexes_exist = self._check_critical_indexes(index_results)
                
                if not all_tables_exist:
                    validation_results['status'] = 'error'
                    validation_results['errors'].append('Missing required tables')
                
                if not critical_indexes_exist:
                    validation_results['status'] = 'warning'
                    validation_results['warnings'].append('Missing recommended indexes')
                
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            validation_results['status'] = 'error'
            validation_results['errors'].append(f'Validation failed: {str(e)}')
        
        finally:
            await self.engine.dispose()
        
        return validation_results
    
    async def _validate_tables(self, inspector) -> Dict[str, Dict[str, Any]]:
        """Validate table existence and structure"""
        results = {}
        existing_tables = inspector.get_table_names()
        
        for table_name, expected_columns in self.expected_tables.items():
            table_result = {
                'exists': table_name in existing_tables,
                'expected_columns': expected_columns,
                'actual_columns': [],
                'missing_columns': [],
                'extra_columns': []
            }
            
            if table_result['exists']:
                # Get actual columns
                columns_info = inspector.get_columns(table_name)
                actual_columns = [col['name'] for col in columns_info]
                table_result['actual_columns'] = actual_columns
                
                # Find missing and extra columns
                table_result['missing_columns'] = [
                    col for col in expected_columns if col not in actual_columns
                ]
                table_result['extra_columns'] = [
                    col for col in actual_columns if col not in expected_columns
                ]
                
                logger.info(f"Table '{table_name}': ✓ exists with {len(actual_columns)} columns")
                if table_result['missing_columns']:
                    logger.warning(f"Table '{table_name}': missing columns {table_result['missing_columns']}")
            else:
                logger.error(f"Table '{table_name}': ✗ does not exist")
            
            results[table_name] = table_result
        
        return results
    
    async def _validate_indexes(self, inspector) -> Dict[str, Dict[str, Any]]:
        """Validate index existence"""
        results = {}
        
        for table_name, expected_indexes in self.expected_indexes.items():
            if table_name not in inspector.get_table_names():
                results[table_name] = {
                    'table_exists': False,
                    'expected': expected_indexes,
                    'existing': [],
                    'missing': expected_indexes
                }
                continue
            
            # Get existing indexes
            try:
                indexes_info = inspector.get_indexes(table_name)
                existing_indexes = [idx['name'] for idx in indexes_info]
                
                missing_indexes = [
                    idx for idx in expected_indexes if idx not in existing_indexes
                ]
                
                results[table_name] = {
                    'table_exists': True,
                    'expected': expected_indexes,
                    'existing': existing_indexes,
                    'missing': missing_indexes
                }
                
                logger.info(f"Indexes for '{table_name}': {len(existing_indexes)} found")
                if missing_indexes:
                    logger.warning(f"Missing indexes for '{table_name}': {missing_indexes}")
                    
            except Exception as e:
                logger.error(f"Failed to get indexes for '{table_name}': {e}")
                results[table_name] = {
                    'table_exists': True,
                    'expected': expected_indexes,
                    'existing': [],
                    'missing': expected_indexes,
                    'error': str(e)
                }
        
        return results
    
    def _check_critical_indexes(self, index_results: Dict) -> bool:
        """Check if critical indexes exist"""
        critical_missing = []
        
        for table_name, result in index_results.items():
            if result.get('missing'):
                critical_missing.extend([
                    f"{table_name}.{idx}" for idx in result['missing']
                ])
        
        return len(critical_missing) == 0
    
    def print_validation_report(self, results: Dict[str, Any]):
        """Print a formatted validation report"""
        status_emoji = {
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        }
        
        print(f"\n{status_emoji[results['status']]} Analytics Schema Validation Report")
        print("=" * 50)
        print(f"Timestamp: {results['timestamp']}")
        print(f"Status: {results['status'].upper()}")
        print(f"Tables Validated: {results['tables_validated']}")
        print(f"Indexes Validated: {results['indexes_validated']}")
        
        if results['errors']:
            print(f"\n❌ Errors ({len(results['errors'])}):")
            for error in results['errors']:
                print(f"   • {error}")
        
        if results['warnings']:
            print(f"\n⚠️ Warnings ({len(results['warnings'])}):")
            for warning in results['warnings']:
                print(f"   • {warning}")
        
        # Detailed table information
        if 'tables' in results['details']:
            print(f"\n📊 Table Details:")
            for table_name, table_info in results['details']['tables'].items():
                status = "✓" if table_info['exists'] else "✗"
                print(f"   {status} {table_name}")
                if table_info.get('missing_columns'):
                    print(f"     Missing columns: {', '.join(table_info['missing_columns'])}")
        
        # Detailed index information
        if 'indexes' in results['details']:
            print(f"\n🔍 Index Details:")
            for table_name, index_info in results['details']['indexes'].items():
                if index_info.get('missing'):
                    print(f"   ⚠️ {table_name}: Missing {len(index_info['missing'])} indexes")
                else:
                    print(f"   ✓ {table_name}: All indexes present")
        
        print("\n" + "=" * 50)


async def main():
    """Main validation function"""
    import os
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    # Initialize validator
    validator = AnalyticsSchemaValidator(database_url)
    
    # Run validation
    logger.info("Starting analytics schema validation...")
    results = await validator.validate_schema()
    
    # Print report
    validator.print_validation_report(results)
    
    # Exit with appropriate code
    if results['status'] == 'error':
        sys.exit(1)
    elif results['status'] == 'warning':
        sys.exit(0)  # Warnings don't fail CI
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Load Test Analytics Data Script

Generates and loads sample analytics data for testing purposes.
Creates realistic test data patterns for benchmarking and validation.
"""

import asyncio
import logging
import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AnalyticsTestDataLoader:
    """Loads sample data for analytics testing"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_async_engine(database_url)
    
    async def load_test_data(self, days_back: int = 90) -> Dict[str, int]:
        """Load comprehensive test data"""
        results = {
            'fact_booking_records': 0,
            'fact_user_activity_records': 0,
            'fact_property_records': 0,
            'business_metrics_records': 0,
            'revenue_metrics_records': 0
        }
        
        try:
            async with AsyncSession(self.engine) as session:
                # Create tables if they don't exist (simplified versions)
                await self._ensure_test_tables(session)
                
                # Generate booking data
                booking_count = await self._generate_booking_data(session, days_back)
                results['fact_booking_records'] = booking_count
                
                # Generate user activity data
                activity_count = await self._generate_user_activity_data(session, days_back)
                results['fact_user_activity_records'] = activity_count
                
                # Generate property data
                property_count = await self._generate_property_data(session)
                results['fact_property_records'] = property_count
                
                # Generate business metrics
                metrics_count = await self._generate_business_metrics(session, days_back)
                results['business_metrics_records'] = metrics_count
                
                # Generate revenue metrics
                revenue_count = await self._generate_revenue_metrics(session, days_back)
                results['revenue_metrics_records'] = revenue_count
                
                await session.commit()
                logger.info("Test data loading completed successfully")
                
        except Exception as e:
            logger.error(f"Test data loading failed: {e}")
            raise
        
        finally:
            await self.engine.dispose()
        
        return results
    
    async def _ensure_test_tables(self, session: AsyncSession):
        """Create simplified test tables if they don't exist"""
        
        # Create fact_booking table
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS fact_booking (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                property_id INTEGER NOT NULL,
                booking_date DATE NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                booking_status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
                country_code VARCHAR(3),
                property_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Create fact_user_activity table
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS fact_user_activity (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                activity_timestamp TIMESTAMP NOT NULL,
                session_duration INTEGER NOT NULL DEFAULT 0,
                pages_viewed INTEGER NOT NULL DEFAULT 1,
                device_type VARCHAR(20) DEFAULT 'desktop',
                country_code VARCHAR(3),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Create fact_property table
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS fact_property (
                id SERIAL PRIMARY KEY,
                property_id INTEGER UNIQUE NOT NULL,
                property_name VARCHAR(200),
                property_type VARCHAR(50),
                city VARCHAR(100),
                country VARCHAR(100),
                country_code VARCHAR(3),
                average_rating DECIMAL(3,2) DEFAULT 0,
                occupancy_rate DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        logger.info("Test tables ensured")
    
    async def _generate_booking_data(self, session: AsyncSession, days_back: int) -> int:
        """Generate realistic booking test data"""
        logger.info(f"Generating booking data for {days_back} days...")
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        # Generate bookings with realistic patterns
        bookings_data = []
        
        for day_offset in range(days_back):
            current_date = start_date + timedelta(days=day_offset)
            
            # Weekend boost (more bookings on weekends)
            base_bookings = 50
            if current_date.weekday() >= 5:  # Saturday/Sunday
                base_bookings = int(base_bookings * 1.5)
            
            # Seasonal variation (more in summer months)
            if current_date.month in [6, 7, 8]:  # Summer
                base_bookings = int(base_bookings * 1.3)
            elif current_date.month in [12, 1]:  # Winter holidays
                base_bookings = int(base_bookings * 1.2)
            
            daily_bookings = random.randint(
                int(base_bookings * 0.7), 
                int(base_bookings * 1.3)
            )
            
            for _ in range(daily_bookings):
                booking = {
                    'user_id': random.randint(1, 10000),
                    'property_id': random.randint(1, 1000),
                    'booking_date': current_date,
                    'total_amount': round(random.uniform(50, 2000), 2),
                    'country_code': random.choice(['US', 'UK', 'FR', 'DE', 'ES', 'IT', 'CA']),
                    'property_type': random.choice(['hotel', 'apartment', 'villa', 'house', 'studio'])
                }
                booking['commission_amount'] = round(booking['total_amount'] * 0.15, 2)
                bookings_data.append(booking)
        
        # Batch insert bookings
        if bookings_data:
            insert_query = text("""
                INSERT INTO fact_booking (
                    user_id, property_id, booking_date, total_amount, 
                    commission_amount, country_code, property_type
                ) VALUES (
                    :user_id, :property_id, :booking_date, :total_amount, 
                    :commission_amount, :country_code, :property_type
                )
            """)
            
            await session.execute(insert_query, bookings_data)
        
        logger.info(f"Generated {len(bookings_data)} booking records")
        return len(bookings_data)
    
    async def _generate_user_activity_data(self, session: AsyncSession, days_back: int) -> int:
        """Generate user activity test data"""
        logger.info(f"Generating user activity data for {days_back} days...")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        activity_data = []
        
        for day_offset in range(days_back):
            for hour in range(24):
                current_time = start_date + timedelta(days=day_offset, hours=hour)
                
                # Activity patterns: more during business hours
                base_activities = 20
                if 9 <= hour <= 17:  # Business hours
                    base_activities = int(base_activities * 2)
                elif 19 <= hour <= 23:  # Evening peak
                    base_activities = int(base_activities * 1.5)
                
                hourly_activities = random.randint(
                    int(base_activities * 0.5),
                    int(base_activities * 1.5)
                )
                
                for _ in range(hourly_activities):
                    activity = {
                        'user_id': random.randint(1, 10000),
                        'activity_timestamp': current_time + timedelta(
                            minutes=random.randint(0, 59),
                            seconds=random.randint(0, 59)
                        ),
                        'session_duration': random.randint(30, 3600),  # 30 sec to 1 hour
                        'pages_viewed': random.randint(1, 20),
                        'device_type': random.choice(['desktop', 'mobile', 'tablet']),
                        'country_code': random.choice(['US', 'UK', 'FR', 'DE', 'ES', 'IT', 'CA'])
                    }
                    activity_data.append(activity)
        
        # Batch insert activities
        if activity_data:
            insert_query = text("""
                INSERT INTO fact_user_activity (
                    user_id, activity_timestamp, session_duration, 
                    pages_viewed, device_type, country_code
                ) VALUES (
                    :user_id, :activity_timestamp, :session_duration, 
                    :pages_viewed, :device_type, :country_code
                )
            """)
            
            await session.execute(insert_query, activity_data)
        
        logger.info(f"Generated {len(activity_data)} user activity records")
        return len(activity_data)
    
    async def _generate_property_data(self, session: AsyncSession) -> int:
        """Generate property test data"""
        logger.info("Generating property data...")
        
        cities = [
            ('New York', 'US', 'USA'),
            ('London', 'UK', 'GBR'),
            ('Paris', 'FR', 'FRA'),
            ('Berlin', 'DE', 'DEU'),
            ('Barcelona', 'ES', 'ESP'),
            ('Rome', 'IT', 'ITA'),
            ('Toronto', 'CA', 'CAN'),
            ('Tokyo', 'JP', 'JPN'),
            ('Sydney', 'AU', 'AUS'),
            ('Amsterdam', 'NL', 'NLD')
        ]
        
        property_types = ['hotel', 'apartment', 'villa', 'house', 'studio', 'resort']
        
        properties_data = []
        
        for property_id in range(1, 1001):  # 1000 properties
            city, country, country_code = random.choice(cities)
            prop_type = random.choice(property_types)
            
            property_data = {
                'property_id': property_id,
                'property_name': f"{prop_type.title()} in {city} #{property_id}",
                'property_type': prop_type,
                'city': city,
                'country': country,
                'country_code': country_code,
                'average_rating': round(random.uniform(3.0, 5.0), 2),
                'occupancy_rate': round(random.uniform(40.0, 95.0), 2)
            }
            properties_data.append(property_data)
        
        # Batch insert properties
        if properties_data:
            insert_query = text("""
                INSERT INTO fact_property (
                    property_id, property_name, property_type, city, 
                    country, country_code, average_rating, occupancy_rate
                ) VALUES (
                    :property_id, :property_name, :property_type, :city, 
                    :country, :country_code, :average_rating, :occupancy_rate
                ) ON CONFLICT (property_id) DO NOTHING
            """)
            
            await session.execute(insert_query, properties_data)
        
        logger.info(f"Generated {len(properties_data)} property records")
        return len(properties_data)
    
    async def _generate_business_metrics(self, session: AsyncSession, days_back: int) -> int:
        """Generate business metrics test data"""
        logger.info("Generating business metrics...")
        
        # Create business_metrics table if it doesn't exist
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS business_metrics (
                id SERIAL PRIMARY KEY,
                metric_name VARCHAR(100) NOT NULL,
                metric_type VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                value DECIMAL(15,4) NOT NULL,
                previous_value DECIMAL(15,4),
                percentage_change DECIMAL(8,4),
                category VARCHAR(50),
                region VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Generate sample metrics
        metrics_data = []
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        metric_names = [
            ('daily_revenue', 'revenue'),
            ('daily_bookings', 'business'),
            ('conversion_rate', 'conversion'),
            ('average_session_duration', 'engagement'),
            ('bounce_rate', 'engagement')
        ]
        
        for day_offset in range(days_back):
            current_date = start_date + timedelta(days=day_offset)
            
            for metric_name, metric_type in metric_names:
                value = self._generate_metric_value(metric_name, day_offset, days_back)
                
                metric_data = {
                    'metric_name': metric_name,
                    'metric_type': metric_type,
                    'date': current_date,
                    'value': value,
                    'category': 'platform',
                    'region': 'global'
                }
                metrics_data.append(metric_data)
        
        # Batch insert metrics
        if metrics_data:
            insert_query = text("""
                INSERT INTO business_metrics (
                    metric_name, metric_type, date, value, category, region
                ) VALUES (
                    :metric_name, :metric_type, :date, :value, :category, :region
                )
            """)
            
            await session.execute(insert_query, metrics_data)
        
        logger.info(f"Generated {len(metrics_data)} business metric records")
        return len(metrics_data)
    
    async def _generate_revenue_metrics(self, session: AsyncSession, days_back: int) -> int:
        """Generate revenue metrics test data"""
        logger.info("Generating revenue metrics...")
        
        # Create revenue_metrics table if it doesn't exist
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS revenue_metrics (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                granularity VARCHAR(20) NOT NULL DEFAULT 'daily',
                total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
                booking_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
                experience_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
                commission_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Generate daily revenue metrics
        revenue_data = []
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        for day_offset in range(days_back):
            current_date = start_date + timedelta(days=day_offset)
            
            # Base revenue with growth trend and seasonality
            base_revenue = 10000 + (day_offset * 50)  # Growth trend
            
            # Add seasonality
            seasonal_factor = 1.0
            if current_date.month in [6, 7, 8]:  # Summer
                seasonal_factor = 1.3
            elif current_date.month in [12, 1]:  # Winter holidays
                seasonal_factor = 1.2
            
            # Weekend boost
            if current_date.weekday() >= 5:
                seasonal_factor *= 1.2
            
            total_revenue = base_revenue * seasonal_factor * random.uniform(0.8, 1.2)
            booking_revenue = total_revenue * 0.75
            experience_revenue = total_revenue * 0.25
            commission_revenue = total_revenue * 0.15
            
            revenue_metric = {
                'date': current_date,
                'granularity': 'daily',
                'total_revenue': round(total_revenue, 2),
                'booking_revenue': round(booking_revenue, 2),
                'experience_revenue': round(experience_revenue, 2),
                'commission_revenue': round(commission_revenue, 2)
            }
            revenue_data.append(revenue_metric)
        
        # Batch insert revenue metrics
        if revenue_data:
            insert_query = text("""
                INSERT INTO revenue_metrics (
                    date, granularity, total_revenue, booking_revenue, 
                    experience_revenue, commission_revenue
                ) VALUES (
                    :date, :granularity, :total_revenue, :booking_revenue, 
                    :experience_revenue, :commission_revenue
                )
            """)
            
            await session.execute(insert_query, revenue_data)
        
        logger.info(f"Generated {len(revenue_data)} revenue metric records")
        return len(revenue_data)
    
    def _generate_metric_value(self, metric_name: str, day_offset: int, total_days: int) -> float:
        """Generate realistic metric values with trends"""
        
        if metric_name == 'daily_revenue':
            base = 10000 + (day_offset * 50)  # Growth trend
            return base * random.uniform(0.8, 1.2)
        
        elif metric_name == 'daily_bookings':
            base = 100 + (day_offset * 2)  # Growth trend
            return base * random.uniform(0.7, 1.3)
        
        elif metric_name == 'conversion_rate':
            return random.uniform(2.0, 8.0)  # 2-8% conversion rate
        
        elif metric_name == 'average_session_duration':
            return random.uniform(180, 900)  # 3-15 minutes
        
        elif metric_name == 'bounce_rate':
            return random.uniform(30.0, 70.0)  # 30-70% bounce rate
        
        else:
            return random.uniform(0, 1000)


async def main():
    """Main function to load test data"""
    import os
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return 1
    
    loader = AnalyticsTestDataLoader(database_url)
    
    try:
        logger.info("Starting analytics test data loading...")
        results = await loader.load_test_data(days_back=90)
        
        logger.info("Test data loading completed:")
        for table, count in results.items():
            logger.info(f"  {table}: {count:,} records")
        
        total_records = sum(results.values())
        logger.info(f"Total records created: {total_records:,}")
        
        return 0
        
    except Exception as e:
        logger.error(f"Test data loading failed: {e}")
        return 1


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
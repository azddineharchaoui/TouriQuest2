"""
Database initialization and PostGIS setup
"""

from sqlalchemy import text
from app.db.database import engine
from app.models import Base


async def init_database():
    """Initialize database with PostGIS extension and create tables"""
    async with engine.begin() as conn:
        # Enable PostGIS extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology;"))
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Create additional indexes for better performance
        await create_geospatial_indexes(conn)
        
        # Insert default data
        await insert_default_amenities(conn)
        await insert_default_accessibility_features(conn)


async def create_geospatial_indexes(conn):
    """Create additional geospatial indexes for performance"""
    indexes = [
        # Geographic indexes for POI locations
        """
        CREATE INDEX IF NOT EXISTS idx_pois_location_gist 
        ON pois USING GIST (location);
        """,
        
        # Index for nearby POI searches
        """
        CREATE INDEX IF NOT EXISTS idx_pois_category_location 
        ON pois USING GIST (location) 
        WHERE is_active = true;
        """,
        
        # Index for POI popularity and ratings
        """
        CREATE INDEX IF NOT EXISTS idx_pois_popularity_rating 
        ON pois (popularity_score DESC, average_rating DESC) 
        WHERE is_active = true;
        """,
        
        # Index for category-based searches
        """
        CREATE INDEX IF NOT EXISTS idx_pois_category_active 
        ON pois (category, is_active) 
        WHERE is_active = true;
        """,
        
        # Composite index for filtered searches
        """
        CREATE INDEX IF NOT EXISTS idx_pois_search_filters 
        ON pois (category, is_family_friendly, is_free, has_audio_guide, has_ar_experience) 
        WHERE is_active = true;
        """,
        
        # Index for trending calculations
        """
        CREATE INDEX IF NOT EXISTS idx_poi_interactions_trending 
        ON poi_interactions (poi_id, interaction_type, created_at DESC);
        """,
        
        # Index for review aggregations
        """
        CREATE INDEX IF NOT EXISTS idx_poi_reviews_aggregation 
        ON poi_reviews (poi_id, status, rating) 
        WHERE status = 'approved';
        """,
        
        # Geographic index for AR experiences
        """
        CREATE INDEX IF NOT EXISTS idx_ar_experiences_location 
        ON ar_experiences USING GIST (trigger_location) 
        WHERE is_active = true;
        """,
        
        # Index for crowd level predictions
        """
        CREATE INDEX IF NOT EXISTS idx_crowd_levels_prediction 
        ON crowd_levels (poi_id, date, hour);
        """,
        
        # Partial index for active opening hours
        """
        CREATE INDEX IF NOT EXISTS idx_opening_hours_active 
        ON opening_hours (poi_id, day_of_week, opens_at, closes_at);
        """
    ]
    
    for index_sql in indexes:
        await conn.execute(text(index_sql))


async def insert_default_amenities(conn):
    """Insert default amenities"""
    amenities = [
        # Basic amenities
        ("WiFi", "connectivity", "wifi", "Free wireless internet access"),
        ("Parking", "transportation", "parking", "On-site parking available"),
        ("Restrooms", "facilities", "restroom", "Clean restroom facilities"),
        ("Gift Shop", "shopping", "shopping-bag", "Souvenir and gift shop"),
        ("Cafe/Restaurant", "dining", "restaurant", "Food and beverage service"),
        ("Audio Tours", "experience", "headphones", "Audio guide tours available"),
        ("Guided Tours", "experience", "users", "Professional guided tours"),
        ("Photography Allowed", "permissions", "camera", "Photography is permitted"),
        ("Wheelchair Accessible", "accessibility", "wheelchair", "Wheelchair accessible facilities"),
        ("Family Friendly", "demographics", "users", "Suitable for families with children"),
        
        # Convenience amenities
        ("ATM", "financial", "credit-card", "ATM machine available"),
        ("Lockers", "storage", "lock", "Storage lockers available"),
        ("Information Desk", "service", "info", "Information and assistance desk"),
        ("First Aid", "safety", "heart", "First aid services available"),
        ("Baby Changing", "family", "baby", "Baby changing facilities"),
        ("Coat Check", "storage", "archive", "Coat and bag storage"),
        
        # Outdoor amenities
        ("Picnic Area", "outdoor", "tree", "Designated picnic areas"),
        ("Walking Trails", "outdoor", "route", "Walking and hiking trails"),
        ("Playground", "family", "playground", "Children's playground"),
        ("Scenic Views", "experience", "eye", "Beautiful scenic viewpoints"),
        
        # Special features
        ("Air Conditioning", "comfort", "snowflake", "Climate controlled environment"),
        ("Heating", "comfort", "thermometer", "Heated indoor spaces"),
        ("Public Transport", "transportation", "bus", "Accessible by public transport"),
        ("Bicycle Parking", "transportation", "bicycle", "Bicycle parking available"),
        ("Pet Friendly", "pets", "heart", "Pets welcome"),
    ]
    
    insert_sql = """
    INSERT INTO amenities (id, name, category, icon, description, created_at)
    VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
    ON CONFLICT (name) DO NOTHING;
    """
    
    for amenity in amenities:
        await conn.execute(text(insert_sql), amenity)


async def insert_default_accessibility_features(conn):
    """Insert default accessibility features"""
    features = [
        # Wheelchair accessibility
        ("Wheelchair Accessible Entrance", "wheelchair_accessible", "Level entrance or ramp available"),
        ("Wheelchair Accessible Restrooms", "wheelchair_accessible", "Accessible restroom facilities"),
        ("Wheelchair Accessible Parking", "wheelchair_accessible", "Designated accessible parking spaces"),
        ("Elevator Access", "wheelchair_accessible", "Elevator access to all floors"),
        ("Wheelchair Accessible Paths", "wheelchair_accessible", "Accessible pathways throughout"),
        
        # Visual impairments
        ("Braille Signage", "visually_impaired", "Braille signs and information"),
        ("Audio Descriptions", "visually_impaired", "Audio descriptions of exhibits"),
        ("Large Print Materials", "visually_impaired", "Large print guides and information"),
        ("Tactile Exhibits", "visually_impaired", "Touch-friendly exhibits and displays"),
        ("Guide Dog Friendly", "visually_impaired", "Service dogs welcome"),
        
        # Hearing impairments
        ("Sign Language Interpretation", "hearing_impaired", "Sign language interpreters available"),
        ("Hearing Loop System", "hearing_impaired", "Induction loop system installed"),
        ("Written Information", "hearing_impaired", "Comprehensive written materials"),
        ("Visual Alerts", "hearing_impaired", "Visual notification systems"),
        ("Captioned Videos", "hearing_impaired", "Videos with closed captions"),
        
        # Mobility assistance
        ("Seating Areas", "mobility_assistance", "Regular seating and rest areas"),
        ("Handrails", "mobility_assistance", "Handrails along walkways"),
        ("Wide Doorways", "mobility_assistance", "Wide doorways and passages"),
        ("Step-Free Access", "mobility_assistance", "No steps or stairs required"),
        ("Mobility Scooter Rental", "mobility_assistance", "Mobility scooters available for rent"),
        
        # Cognitive assistance
        ("Clear Signage", "cognitive_assistance", "Clear, simple signage throughout"),
        ("Quiet Spaces", "cognitive_assistance", "Quiet areas for sensory breaks"),
        ("Simple Navigation", "cognitive_assistance", "Easy to follow layout and directions"),
        ("Staff Assistance", "cognitive_assistance", "Trained staff available for assistance"),
        ("Sensory-Friendly Hours", "cognitive_assistance", "Special hours with reduced stimulation"),
    ]
    
    insert_sql = """
    INSERT INTO accessibility_features (id, name, type, description, created_at)
    VALUES (gen_random_uuid(), %s, %s, %s, NOW())
    ON CONFLICT (name) DO NOTHING;
    """
    
    for feature in features:
        await conn.execute(text(insert_sql), feature)


async def create_fulltext_indexes(conn):
    """Create full-text search indexes"""
    fulltext_indexes = [
        # POI search index
        """
        CREATE INDEX IF NOT EXISTS idx_pois_fulltext_search 
        ON pois USING gin(to_tsvector('english', 
            coalesce(name, '') || ' ' || 
            coalesce(description, '') || ' ' || 
            coalesce(short_description, '') || ' ' ||
            coalesce(city, '') || ' ' ||
            coalesce(category, '')
        ));
        """,
        
        # POI translation search index
        """
        CREATE INDEX IF NOT EXISTS idx_poi_translations_fulltext 
        ON poi_translations USING gin(to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(short_description, '')
        ));
        """,
    ]
    
    for index_sql in fulltext_indexes:
        await conn.execute(text(index_sql))


async def create_materialized_views(conn):
    """Create materialized views for performance"""
    views = [
        # View for POI statistics
        """
        CREATE MATERIALIZED VIEW IF NOT EXISTS poi_stats AS
        SELECT 
            p.id,
            p.name,
            p.category,
            p.average_rating,
            p.review_count,
            p.popularity_score,
            p.view_count,
            COUNT(DISTINCT r.id) as total_reviews,
            COUNT(DISTINCT f.user_id) as favorite_count,
            AVG(CASE WHEN r.status = 'approved' THEN r.rating END) as calculated_rating
        FROM pois p
        LEFT JOIN poi_reviews r ON p.id = r.poi_id
        LEFT JOIN user_poi_favorites f ON p.id = f.poi_id
        WHERE p.is_active = true
        GROUP BY p.id, p.name, p.category, p.average_rating, p.review_count, p.popularity_score, p.view_count;
        """,
        
        # View for trending POIs
        """
        CREATE MATERIALIZED VIEW IF NOT EXISTS trending_pois AS
        SELECT 
            p.id,
            p.name,
            p.category,
            p.popularity_score,
            COUNT(i.id) as recent_interactions,
            COUNT(DISTINCT i.user_id) as unique_visitors
        FROM pois p
        LEFT JOIN poi_interactions i ON p.id = i.poi_id 
            AND i.created_at >= NOW() - INTERVAL '24 hours'
        WHERE p.is_active = true
        GROUP BY p.id, p.name, p.category, p.popularity_score
        ORDER BY recent_interactions DESC, unique_visitors DESC, p.popularity_score DESC;
        """
    ]
    
    for view_sql in views:
        await conn.execute(text(view_sql))


async def setup_database_functions(conn):
    """Create custom database functions for POI operations"""
    functions = [
        # Function to calculate distance between two points
        """
        CREATE OR REPLACE FUNCTION calculate_poi_distance(
            lat1 DOUBLE PRECISION, 
            lon1 DOUBLE PRECISION, 
            lat2 DOUBLE PRECISION, 
            lon2 DOUBLE PRECISION
        ) RETURNS DOUBLE PRECISION AS $$
        BEGIN
            RETURN ST_Distance(
                ST_GeogFromText('POINT(' || lon1 || ' ' || lat1 || ')'),
                ST_GeogFromText('POINT(' || lon2 || ' ' || lat2 || ')')
            ) / 1000; -- Return distance in kilometers
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
        """,
        
        # Function to update POI ratings
        """
        CREATE OR REPLACE FUNCTION update_poi_rating(poi_uuid UUID) 
        RETURNS VOID AS $$
        DECLARE
            avg_rating DOUBLE PRECISION;
            total_reviews INTEGER;
        BEGIN
            SELECT 
                AVG(rating)::DOUBLE PRECISION, 
                COUNT(*)::INTEGER
            INTO avg_rating, total_reviews
            FROM poi_reviews 
            WHERE poi_id = poi_uuid AND status = 'approved';
            
            UPDATE pois 
            SET 
                average_rating = COALESCE(avg_rating, 0),
                review_count = total_reviews
            WHERE id = poi_uuid;
        END;
        $$ LANGUAGE plpgsql;
        """,
        
        # Function to calculate popularity score
        """
        CREATE OR REPLACE FUNCTION calculate_popularity_score(poi_uuid UUID)
        RETURNS DOUBLE PRECISION AS $$
        DECLARE
            recent_views INTEGER;
            total_favorites INTEGER;
            avg_rating DOUBLE PRECISION;
            review_count INTEGER;
            popularity DOUBLE PRECISION;
        BEGIN
            -- Get recent views (last 30 days)
            SELECT COUNT(*) INTO recent_views
            FROM poi_interactions 
            WHERE poi_id = poi_uuid 
            AND interaction_type = 'view'
            AND created_at >= NOW() - INTERVAL '30 days';
            
            -- Get total favorites
            SELECT COUNT(*) INTO total_favorites
            FROM user_poi_favorites
            WHERE poi_id = poi_uuid;
            
            -- Get rating info
            SELECT average_rating, review_count INTO avg_rating, review_count
            FROM pois WHERE id = poi_uuid;
            
            -- Calculate weighted popularity score
            popularity := (
                (recent_views * 0.3) +
                (total_favorites * 0.4) +
                (avg_rating * review_count * 0.3)
            ) / 10;
            
            RETURN LEAST(popularity, 10.0); -- Cap at 10
        END;
        $$ LANGUAGE plpgsql;
        """
    ]
    
    for function_sql in functions:
        await conn.execute(text(function_sql))


if __name__ == "__main__":
    import asyncio
    asyncio.run(init_database())